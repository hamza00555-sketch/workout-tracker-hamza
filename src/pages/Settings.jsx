import { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext.jsx';
import { useRushdSync } from '../context/RushdSyncContext.jsx';
import * as db from '../db/index.js';
import {
  getPermissionStatus, requestPermission, registerPeriodicSync,
  hashPin, isBiometricAvailable, registerBiometric, removeBiometric,
} from '../utils/notifications.js';


// Injected by vite.config.js at build time — see `define`.
const BUILD_BRANCH = typeof __BUILD_BRANCH__ !== 'undefined' ? __BUILD_BRANCH__ : 'local';
const BUILD_COMMIT = typeof __BUILD_COMMIT__ !== 'undefined' ? __BUILD_COMMIT__ : 'dev';
const BUILD_TIME = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : new Date().toISOString();

function maskEmail(email) {
  if (!email) return '';
  const [user, domain] = email.split('@');
  return `${user.slice(0, 2)}***@${domain}`;
}

export default function Settings() {
  const { settings, updateSettings, setPage, syncStatus, lastSynced, scheduleSync, pullFromCloud } = useApp();
  const {
    status: rushdStatus, rushdUser, lastSyncedAt, error: rushdError,
    login: rushdLogin, logout: rushdLogout, syncNow: rushdSyncNow, isConfigured: rushdConfigured,
  } = useRushdSync();
  const [salary, setSalary] = useState(String(settings.salary));
  const [salaryDay, setSalaryDay] = useState(settings.salaryDay);
  const [saved, setSaved] = useState(false);
  const [backupError, setBackupError] = useState('');

  // Notifications state
  const [notifStatus, setNotifStatus] = useState(getPermissionStatus());

  // Security / lock state
  const [lockEnabled, setLockEnabledState] = useState(!!settings.lockEnabled);
  const [pinSetup, setPinSetup] = useState(null); // null | 'enter' | 'confirm' | 'disable'
  const [pinInput, setPinInput] = useState('');
  const [pinFirst, setPinFirst] = useState('');
  const [pinError, setPinError] = useState('');
  const [biometricAvail, setBiometricAvail] = useState(false);
  const [biometricEnabled, setBiometricEnabledState] = useState(!!settings.biometricEnabled);
  const [biometricLoading, setBiometricLoading] = useState(false);

  useEffect(() => {
    isBiometricAvailable().then(ok => setBiometricAvail(ok && !!settings.lockEnabled && !!settings.pinHash));
  }, [settings.lockEnabled, settings.pinHash]);

  async function handleNotifToggle() {
    if (notifStatus === 'granted') return;
    const ok = await requestPermission();
    const status = ok ? 'granted' : 'denied';
    setNotifStatus(status);
    if (ok) registerPeriodicSync();
  }

  async function startLockSetup() {
    setPinInput(''); setPinFirst(''); setPinError('');
    if (lockEnabled) {
      // Disabling: confirm current PIN first
      setPinSetup('disable');
    } else {
      // Enabling: set new PIN
      setPinSetup('enter');
    }
  }

  async function handlePinDigit(d) {
    if (pinInput.length >= 4) return;
    const next = pinInput + d;
    setPinInput(next);
    setPinError('');

    if (next.length < 4) return;

    if (pinSetup === 'enter') {
      setPinFirst(next);
      setPinInput('');
      setPinSetup('confirm');
    } else if (pinSetup === 'confirm') {
      if (next !== pinFirst) {
        setPinError('الرمزان غير متطابقين، حاول مجدداً');
        setPinInput('');
        setPinSetup('enter');
        setPinFirst('');
      } else {
        const hash = await hashPin(next);
        await updateSettings({ lockEnabled: true, pinHash: hash });
        setLockEnabledState(true);
        setPinSetup(null);
        setBiometricAvail(await isBiometricAvailable());
      }
    } else if (pinSetup === 'disable') {
      const hash = await hashPin(next);
      if (hash !== settings.pinHash) {
        setPinError('رمز الدخول غير صحيح');
        setPinInput('');
      } else {
        await updateSettings({ lockEnabled: false, pinHash: null, biometricEnabled: false });
        setLockEnabledState(false);
        setBiometricEnabledState(false);
        removeBiometric();
        setPinSetup(null);
      }
    }
  }

  async function handleBiometricToggle() {
    if (biometricEnabled) {
      await updateSettings({ biometricEnabled: false });
      setBiometricEnabledState(false);
      removeBiometric();
      return;
    }
    setBiometricLoading(true);
    const ok = await registerBiometric();
    if (ok) {
      await updateSettings({ biometricEnabled: true });
      setBiometricEnabledState(true);
    } else {
      setPinError('فشل تسجيل البصمة — تأكد من دعم الجهاز');
    }
    setBiometricLoading(false);
  }

  const [webhookUrl, setWebhookUrl] = useState(settings.webhookUrl || '');
  const [webhookStatus, setWebhookStatus] = useState('idle'); // 'idle' | 'sending' | 'ok' | 'error'
  const [webhookError, setWebhookError] = useState('');

  async function handleSaveWebhookUrl() {
    await updateSettings({ webhookUrl: webhookUrl.trim() });
  }

  async function handleSendWebhook() {
    const url = webhookUrl.trim() || settings.webhookUrl;
    if (!url) { setWebhookError('أدخل رابط الـ Webhook أولاً'); return; }
    setWebhookStatus('sending');
    setWebhookError('');
    try {
      const snapshot = await db.exportAll();
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'ratebi', ...snapshot }),
      });
      if (res.ok) {
        setWebhookStatus('ok');
        setTimeout(() => setWebhookStatus('idle'), 3000);
      } else {
        setWebhookStatus('error');
        setWebhookError(`الخادم رفض الطلب (${res.status})`);
      }
    } catch (err) {
      setWebhookStatus('error');
      setWebhookError('تعذّر الاتصال — تحقق من الرابط');
    }
  }

  const [cloudApiKey, setCloudApiKeyLocal] = useState(settings.cloudApiKey || '');
  const [apiKeySaved, setApiKeySaved] = useState(false);
  const [pullStatus, setPullStatus] = useState('idle'); // 'idle' | 'loading' | 'ok' | 'error'
  const [pullError, setPullError] = useState('');

  async function handleSaveApiKey() {
    await updateSettings({ cloudApiKey: cloudApiKey.trim() });
    setApiKeySaved(true);
    setTimeout(() => setApiKeySaved(false), 2000);
  }

  async function handlePull() {
    setPullStatus('loading');
    setPullError('');
    const result = await pullFromCloud();
    if (result.ok) {
      setPullStatus('ok');
    } else {
      setPullStatus('idle');
      setPullError(
        result.error === 'no-data' ? 'لا توجد بيانات محفوظة في السحابة بعد'
        : result.error === 'no-key' ? 'أدخل مفتاح API أولاً'
        : 'حدث خطأ في الاتصال'
      );
    }
  }

  // ── ربط رُشد state ──────────────────────────────────────────────────────
  const [rushdEmail, setRushdEmail] = useState('');
  const [rushdPass, setRushdPass] = useState('');
  const [rushdLoginLoading, setRushdLoginLoading] = useState(false);
  const [rushdLoginError, setRushdLoginError] = useState('');
  const [wishesBudget, setWishesBudget] = useState(String(settings.rushdWishesBudget || ''));
  const [wishesSpent, setWishesSpent] = useState(String(settings.rushdWishesSpent || ''));
  const rushdRef = useRef(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('connect') === 'rushd' && rushdRef.current) {
      setTimeout(() => rushdRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 400);
    }
  }, []);

  async function handleRushdLogin(e) {
    e?.preventDefault();
    if (!rushdEmail.trim() || !rushdPass) return;
    setRushdLoginLoading(true);
    setRushdLoginError('');
    const result = await rushdLogin(rushdEmail, rushdPass);
    setRushdPass('');
    setRushdLoginLoading(false);
    if (!result.ok) setRushdLoginError(result.error);
    if (result.ok) setRushdEmail('');
  }

  const [updateStatus, setUpdateStatus] = useState('idle'); // idle | checking | updating | current | error

  const updateTimer = useRef(null);
  useEffect(() => () => clearTimeout(updateTimer.current), []);

  // Last resort: drop every cached asset and the SW itself, then reload from
  // the network. IndexedDB is untouched — only app code lives in these caches.
  async function forceRefresh() {
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.unregister()));
      }
    } catch { /* clearing is best-effort — reload regardless */ }
    window.location.replace(`${window.location.pathname}?v=${Date.now()}`);
  }

  // The SW calls skipWaiting + clients.claim, so activating a new worker fires
  // controllerchange and App.jsx reloads. If that chain stalls, force it.
  function armFallback() {
    clearTimeout(updateTimer.current);
    updateTimer.current = setTimeout(forceRefresh, 6000);
  }

  function activate(sw) {
    if (!sw) return;
    sw.postMessage({ type: 'SKIP_WAITING' });
    sw.addEventListener('statechange', () => {
      if (sw.state === 'installed' || sw.state === 'activated') {
        sw.postMessage({ type: 'SKIP_WAITING' });
      }
    });
  }

  async function handleAppUpdate() {
    setUpdateStatus('checking');
    try {
      if (!('serviceWorker' in navigator)) { forceRefresh(); return; }
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) { forceRefresh(); return; }

      // A new version may already be downloaded and parked in `waiting` —
      // the common "stuck on the old build" case. Activate it immediately.
      if (reg.waiting) {
        setUpdateStatus('updating');
        activate(reg.waiting);
        armFallback();
        return;
      }

      // A worker can appear at any point during the check, so watch for it
      // instead of sampling reg.installing once after update() resolves.
      let found = false;
      const onUpdateFound = () => {
        const sw = reg.installing || reg.waiting;
        if (!sw) return;
        found = true;
        setUpdateStatus('updating');
        activate(sw);
        armFallback();
      };
      reg.addEventListener('updatefound', onUpdateFound);

      // update() rejects on flaky networks and under browser throttling —
      // that is not a failure of the whole flow, so keep going either way.
      try { await reg.update(); } catch { /* fall through to the state check */ }

      await new Promise(r => setTimeout(r, 1500));
      reg.removeEventListener('updatefound', onUpdateFound);

      if (found || reg.installing || reg.waiting) {
        setUpdateStatus('updating');
        activate(reg.waiting || reg.installing);
        armFallback();
        return;
      }

      setUpdateStatus('current');
      setTimeout(() => setUpdateStatus('idle'), 3000);
    } catch {
      setUpdateStatus('error');
      setTimeout(() => setUpdateStatus('idle'), 3000);
    }
  }

  async function handleSave() {
    await updateSettings({ salary: Number(salary), salaryDay });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleExport() {
    const data = await db.exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ratebi-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleBackupImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    setBackupError('');
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await db.importAll(data);
      // A plain reload() is a navigation the service worker answers from cache,
      // which drops the user back onto whatever build was precached. Bust it so
      // the restored data lands on the current version.
      window.location.replace(`${window.location.pathname}?restored=${Date.now()}`);
    } catch {
      setBackupError('الملف غير صالح أو تالف');
    }
    e.target.value = '';
  }

  async function copyText(text, setter) {
    try { await navigator.clipboard.writeText(text); setter(true); setTimeout(() => setter(false), 2500); } catch {}
  }

  const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

  return (
    <div className="page">
      <div style={{ padding: '52px 16px 16px', background: 'var(--bg2)', borderBottom: '1px solid var(--border)' }}>
        <h1 style={{ fontSize: 22, fontWeight: 900 }}>الإعدادات</h1>
      </div>

      <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* Salary Settings */}
        <section>
          <div style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 700, marginBottom: 12 }}>💰 إعدادات الراتب</div>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div className="input-group">
              <label className="input-label">الراتب الشهري (ريال)</label>
              <input className="input" type="text" inputMode="decimal"
                value={salary} onChange={e => setSalary(e.target.value)} />
            </div>
            <div className="input-group">
              <label className="input-label">يوم نزول الراتب</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {DAYS.map(d => (
                  <button key={d} onClick={() => setSalaryDay(d)} style={{
                    width: 36, height: 36, borderRadius: 8, border: 'none', cursor: 'pointer',
                    fontFamily: 'Cairo, sans-serif', fontWeight: 700, fontSize: 13,
                    background: salaryDay === d ? 'var(--primary)' : 'var(--card2)',
                    color: salaryDay === d ? '#fff' : 'var(--text2)',
                  }}>{d}</button>
                ))}
              </div>
            </div>
            <button className="btn btn-primary" onClick={handleSave}>
              {saved ? '✓ تم الحفظ' : 'حفظ الإعدادات'}
            </button>
          </div>
        </section>

        {/* Salary Day */}
        <section>
          <div style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 700, marginBottom: 12 }}>📅 يوم الراتب</div>
          <div className="card">
            <p style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 14 }}>
              فتح شاشة توزيع الراتب مجدداً لهذا الشهر
            </p>
            <button className="btn btn-outline" onClick={() => setPage('salaryDay')}>
              فتح شاشة يوم الراتب
            </button>
          </div>
        </section>

        {/* Security */}
        <section>
          <div style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 700, marginBottom: 12 }}>🔒 أمان التطبيق</div>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Lock toggle */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>قفل التطبيق برمز سري</div>
                <div style={{ color: 'var(--text2)', fontSize: 12, marginTop: 2 }}>
                  {lockEnabled ? 'مفعّل — التطبيق محمي برمز دخول' : 'غير مفعّل'}
                </div>
              </div>
              <button onClick={startLockSetup} style={{
                background: lockEnabled ? 'var(--accent)' : 'var(--border)',
                border: 'none', borderRadius: 20, width: 52, height: 28, cursor: 'pointer',
                position: 'relative', transition: 'background .25s',
              }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%', background: '#fff',
                  position: 'absolute', top: 3,
                  right: lockEnabled ? 4 : 'auto',
                  left: lockEnabled ? 'auto' : 4,
                  transition: 'all .25s',
                  boxShadow: '0 1px 4px rgba(0,0,0,.3)',
                }} />
              </button>
            </div>

            {/* PIN setup inline numpad */}
            {pinSetup && (
              <div style={{ background: 'var(--bg2)', borderRadius: 12, padding: '16px', textAlign: 'center' }}>
                <div style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 12 }}>
                  {pinSetup === 'enter' && 'أدخل رمز الدخول الجديد (4 أرقام)'}
                  {pinSetup === 'confirm' && 'أكد رمز الدخول'}
                  {pinSetup === 'disable' && 'أدخل رمزك الحالي لإيقاف القفل'}
                </div>
                <div style={{ display: 'flex', gap: 14, justifyContent: 'center', marginBottom: 16 }}>
                  {[0, 1, 2, 3].map(i => (
                    <div key={i} style={{
                      width: 14, height: 14, borderRadius: '50%',
                      background: pinInput.length > i ? 'var(--primary)' : 'var(--border)',
                      transition: 'background .15s',
                    }} />
                  ))}
                </div>
                {pinError && <div style={{ color: 'var(--danger)', fontSize: 12, marginBottom: 10 }}>{pinError}</div>}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, maxWidth: 220, margin: '0 auto', direction: 'ltr' }}>
                  {[1,2,3,4,5,6,7,8,9].map(d => (
                    <button key={d} onClick={() => handlePinDigit(String(d))} style={{
                      height: 52, borderRadius: 10, border: 'none', cursor: 'pointer',
                      background: 'var(--card)', color: 'var(--text)',
                      fontSize: 20, fontWeight: 700, fontFamily: 'Cairo, sans-serif',
                    }}>{d}</button>
                  ))}
                  <div />
                  <button onClick={() => handlePinDigit('0')} style={{
                    height: 52, borderRadius: 10, border: 'none', cursor: 'pointer',
                    background: 'var(--card)', color: 'var(--text)',
                    fontSize: 20, fontWeight: 700, fontFamily: 'Cairo, sans-serif',
                  }}>0</button>
                  <button onClick={() => { setPinInput(p => p.slice(0, -1)); setPinError(''); }} style={{
                    height: 52, borderRadius: 10, border: 'none', cursor: 'pointer',
                    background: 'var(--card)', color: 'var(--text2)', fontSize: 18,
                  }}>⌫</button>
                </div>
                <button onClick={() => { setPinSetup(null); setPinInput(''); setPinError(''); }}
                  style={{ marginTop: 12, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text3)', fontSize: 13 }}>
                  إلغاء
                </button>
              </div>
            )}

            {/* Biometric toggle — only when lock is enabled */}
            {lockEnabled && biometricAvail && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>البصمة / التعرف على الوجه</div>
                  <div style={{ color: 'var(--text2)', fontSize: 12, marginTop: 2 }}>
                    {biometricEnabled ? 'مفعّل — يمكنك الدخول ببصمتك' : 'غير مفعّل'}
                  </div>
                </div>
                <button onClick={handleBiometricToggle} disabled={biometricLoading} style={{
                  background: biometricEnabled ? 'var(--accent)' : 'var(--border)',
                  border: 'none', borderRadius: 20, width: 52, height: 28, cursor: 'pointer',
                  position: 'relative', transition: 'background .25s', opacity: biometricLoading ? .6 : 1,
                }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%', background: '#fff',
                    position: 'absolute', top: 3,
                    right: biometricEnabled ? 4 : 'auto',
                    left: biometricEnabled ? 'auto' : 4,
                    transition: 'all .25s',
                    boxShadow: '0 1px 4px rgba(0,0,0,.3)',
                  }} />
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Notifications */}
        <section>
          <div style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 700, marginBottom: 12 }}>🔔 الإشعارات</div>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>إشعارات التطبيق</div>
                <div style={{ color: 'var(--text2)', fontSize: 12, marginTop: 2 }}>
                  {notifStatus === 'granted' && 'مفعّلة ✓'}
                  {notifStatus === 'denied' && 'محظورة — فعّلها من إعدادات الجهاز'}
                  {notifStatus === 'default' && 'اضغط للسماح بالإشعارات'}
                  {notifStatus === 'unsupported' && 'غير مدعومة على هذا المتصفح'}
                </div>
              </div>
              {notifStatus !== 'granted' && notifStatus !== 'unsupported' && notifStatus !== 'denied' && (
                <button onClick={handleNotifToggle} className="btn btn-primary" style={{ width: 'auto', padding: '8px 16px', fontSize: 13 }}>
                  تفعيل
                </button>
              )}
              {notifStatus === 'granted' && (
                <div style={{ color: 'var(--accent)', fontSize: 18 }}>✓</div>
              )}
            </div>

            <div style={{ background: 'var(--bg2)', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ color: 'var(--text2)', fontSize: 12, lineHeight: 1.8 }}>
                ستتلقى إشعارات عند:
                <br />• استحقاق أي التزام مالي اليوم أو غداً
                <br />• نصائح مالية مفيدة بين الحين والآخر
              </div>
            </div>
          </div>
        </section>

        {/* Backup */}
        <section>
          <div style={{ fontSize: 13, color: 'var(--gold)', fontWeight: 700, marginBottom: 12 }}>💾 البيانات والنسخ الاحتياطي</div>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn" style={{
                flex: 1, background: 'var(--accent-dim)', color: 'var(--accent)',
                borderRadius: 10, padding: '12px',
              }} onClick={handleExport}>
                ⬆️ تصدير نسخة
              </button>
              <label style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                background: 'var(--primary-dim)', color: 'var(--primary)', borderRadius: 10,
                padding: '12px', cursor: 'pointer', fontWeight: 700, fontSize: 15,
              }}>
                ⬇️ استيراد نسخة
                <input type="file" accept=".json" onChange={handleBackupImport} style={{ display: 'none' }} />
              </label>
            </div>
            {backupError && (
              <div style={{ color: 'var(--danger)', fontSize: 13, textAlign: 'center' }}>{backupError}</div>
            )}
            <p style={{ color: 'var(--text3)', fontSize: 12 }}>
              جميع البيانات محفوظة محلياً على جهازك فقط
            </p>
          </div>
        </section>

        {/* Send to App (Webhook) */}
        <section>
          <div style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 700, marginBottom: 12 }}>📤 إرسال البيانات لتطبيق آخر</div>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            <p style={{ color: 'var(--text2)', fontSize: 13, lineHeight: 1.7 }}>
              اضغط الزر لإرسال بياناتك لأي تطبيق أو خدمة — فقط أدخل رابط الاستقبال (Webhook URL).
            </p>

            {/* URL input */}
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="url"
                className="input"
                style={{ flex: 1, fontFamily: 'Cairo, monospace', fontSize: 12, direction: 'ltr' }}
                placeholder="https://your-app.com/webhook"
                value={webhookUrl}
                onChange={e => { setWebhookUrl(e.target.value); setWebhookError(''); }}
                onBlur={handleSaveWebhookUrl}
              />
            </div>

            {webhookError && (
              <div style={{ background: 'var(--danger-dim)', borderRadius: 10, padding: '10px 14px', color: 'var(--danger)', fontSize: 13 }}>
                ⚠️ {webhookError}
              </div>
            )}

            {/* Send button */}
            <button
              onClick={handleSendWebhook}
              disabled={webhookStatus === 'sending'}
              style={{
                padding: '14px', borderRadius: 12, border: 'none', cursor: 'pointer',
                fontFamily: 'Mestika, Cairo, sans-serif', fontWeight: 700, fontSize: 15,
                transition: 'all .2s',
                background: webhookStatus === 'ok' ? 'var(--accent)'
                  : webhookStatus === 'error' ? 'var(--danger)'
                  : 'var(--primary)',
                color: '#fff',
                opacity: webhookStatus === 'sending' ? 0.7 : 1,
              }}>
              {webhookStatus === 'sending' ? 'جاري الإرسال...'
                : webhookStatus === 'ok' ? '✓ تم الإرسال بنجاح!'
                : webhookStatus === 'error' ? '✕ فشل الإرسال — اضغط للمحاولة'
                : '📤 إرسال البيانات الآن'}
            </button>

            <div style={{ background: 'var(--bg2)', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ color: 'var(--text2)', fontSize: 12, lineHeight: 1.8 }}>
                البيانات المُرسلة تشمل:
                <br />• الالتزامات والأهداف والبنوك
                <br />• الديون والدخل الإضافي
                <br />• السجلات الشهرية وإعدادات الراتب
              </div>
            </div>
          </div>
        </section>

        {/* Cloud Sync */}
        <section>
          <div style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 700, marginBottom: 12 }}>☁️ المزامنة السحابية</div>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Sync status row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                  background: syncStatus === 'ok' ? 'var(--accent)' : syncStatus === 'error' ? 'var(--danger)' : syncStatus === 'syncing' ? 'var(--primary)' : 'var(--border)',
                  boxShadow: syncStatus === 'syncing' ? '0 0 0 4px var(--primary-dim)' : 'none',
                  transition: 'all .3s',
                }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>
                    {syncStatus === 'ok' ? 'تمت المزامنة' : syncStatus === 'error' ? 'فشلت المزامنة' : syncStatus === 'syncing' ? 'جاري المزامنة...' : 'غير مكوّنة'}
                  </div>
                  {lastSynced && (
                    <div style={{ color: 'var(--text3)', fontSize: 11, fontFamily: 'Cairo, sans-serif' }}>
                      {new Date(lastSynced).toLocaleString('ar-SA')}
                    </div>
                  )}
                </div>
              </div>
              <button onClick={scheduleSync} style={{
                background: 'var(--card2)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '6px 14px', cursor: 'pointer',
                fontFamily: 'Mestika, Cairo, sans-serif', fontWeight: 700, fontSize: 12,
                color: 'var(--text2)',
              }}>
                زامن الآن
              </button>
            </div>

            {/* API key input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 700 }}>مفتاح API</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="password"
                  className="input"
                  style={{ flex: 1, fontFamily: 'Cairo, monospace', fontSize: 12 }}
                  placeholder="أدخل مفتاح API هنا..."
                  value={cloudApiKey}
                  onChange={e => setCloudApiKeyLocal(e.target.value)}
                />
                <button onClick={handleSaveApiKey} style={{
                  background: apiKeySaved ? 'var(--accent)' : 'var(--primary)',
                  border: 'none', borderRadius: 10, padding: '0 16px', cursor: 'pointer',
                  fontFamily: 'Mestika, Cairo, sans-serif', fontWeight: 700, fontSize: 13, color: '#fff',
                  transition: 'background .2s', whiteSpace: 'nowrap',
                }}>
                  {apiKeySaved ? '✓' : 'حفظ'}
                </button>
              </div>
            </div>

            {/* Pull from cloud */}
            <button onClick={handlePull} disabled={pullStatus === 'loading' || pullStatus === 'ok'}
              style={{
                padding: '12px', borderRadius: 10, border: '1.5px solid var(--danger)',
                background: pullStatus === 'ok' ? 'var(--accent-dim)' : 'transparent',
                color: pullStatus === 'ok' ? 'var(--accent)' : 'var(--danger)',
                cursor: 'pointer', fontFamily: 'Mestika, Cairo, sans-serif',
                fontWeight: 700, fontSize: 14, transition: 'all .2s',
              }}>
              {pullStatus === 'loading' ? 'جاري الاسترجاع...' : pullStatus === 'ok' ? '✓ تم الاسترجاع!' : '⬇️ استرجاع من السحابة'}
            </button>
            {pullError && (
              <div style={{ color: 'var(--danger)', fontSize: 12, textAlign: 'center' }}>{pullError}</div>
            )}

            <p style={{ color: 'var(--text3)', fontSize: 12 }}>
              البيانات تُزامن تلقائياً عند أي تعديل
            </p>
          </div>
        </section>

        {/* ربط رُشد */}
        <section ref={rushdRef}>
          <div style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 700, marginBottom: 12 }}>🔗 ربط رُشد</div>

          {!rushdConfigured ? (
            <div className="card">
              <p style={{ color: 'var(--text2)', fontSize: 13, textAlign: 'center' }}>
                ربط رُشد غير مهيأ في هذه النسخة.
              </p>
            </div>
          ) : rushdUser ? (
            // ── Connected state ────────────────────────────────────────────
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Status row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 11, height: 11, borderRadius: '50%', flexShrink: 0,
                  background:
                    rushdStatus === 'connected' ? 'var(--accent)'
                    : rushdStatus === 'syncing'   ? 'var(--primary)'
                    : rushdStatus === 'offline'   ? 'var(--gold)'
                    : rushdStatus === 'error'     ? 'var(--danger)'
                    : 'var(--border)',
                  boxShadow: rushdStatus === 'syncing' ? '0 0 0 4px var(--primary-dim)' : 'none',
                  transition: 'all .3s',
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>
                    {rushdStatus === 'connected' && 'متصل برُشد ✓'}
                    {rushdStatus === 'syncing'   && 'جاري المزامنة...'}
                    {rushdStatus === 'offline'   && 'دون اتصال — سنزامن عند عودة الإنترنت'}
                    {rushdStatus === 'error'     && 'تعذّر التحديث'}
                  </div>
                  <div style={{ color: 'var(--text3)', fontSize: 11, fontFamily: 'Cairo, sans-serif', marginTop: 2 }}>
                    {maskEmail(rushdUser.email)}
                  </div>
                  {lastSyncedAt && (
                    <div style={{ color: 'var(--text3)', fontSize: 11, fontFamily: 'Cairo, sans-serif' }}>
                      آخر مزامنة: {new Date(lastSyncedAt).toLocaleString('ar-SA')}
                    </div>
                  )}
                </div>
              </div>

              {rushdError && (
                <div style={{ background: 'var(--danger-dim)', borderRadius: 10, padding: '10px 14px', color: 'var(--danger)', fontSize: 13 }}>
                  {rushdError}
                </div>
              )}

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={rushdSyncNow} disabled={rushdStatus === 'syncing'} style={{
                  flex: 1, padding: '11px', borderRadius: 10, border: 'none', cursor: 'pointer',
                  fontFamily: 'Mestika, Cairo, sans-serif', fontWeight: 700, fontSize: 14,
                  background: 'var(--primary)', color: '#fff',
                  opacity: rushdStatus === 'syncing' ? 0.65 : 1, transition: 'opacity .2s',
                }}>
                  زامن الآن
                </button>
                <button onClick={rushdLogout} style={{
                  padding: '11px 16px', borderRadius: 10,
                  border: '1.5px solid var(--border)', background: 'transparent',
                  cursor: 'pointer', fontFamily: 'Mestika, Cairo, sans-serif', fontWeight: 700,
                  fontSize: 14, color: 'var(--text2)',
                }}>
                  فصل رُشد
                </button>
              </div>

              {/* Wishes budget */}
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                <div style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 700, marginBottom: 10 }}>
                  ميزانية الأماني (اختياري)
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div className="input-group">
                    <label className="input-label">الميزانية الشهرية</label>
                    <input
                      className="input" type="number" inputMode="decimal"
                      placeholder="0" value={wishesBudget}
                      onChange={e => setWishesBudget(e.target.value)}
                      onBlur={() => updateSettings({ rushdWishesBudget: Number(wishesBudget) || 0 })}
                    />
                  </div>
                  <div className="input-group">
                    <label className="input-label">المُصرف منها هذا الشهر</label>
                    <input
                      className="input" type="number" inputMode="decimal"
                      placeholder="0" value={wishesSpent}
                      onChange={e => setWishesSpent(e.target.value)}
                      onBlur={() => updateSettings({ rushdWishesSpent: Number(wishesSpent) || 0 })}
                    />
                  </div>
                </div>
              </div>
            </div>

          ) : (
            // ── Login form ────────────────────────────────────────────────
            <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <p style={{ color: 'var(--text2)', fontSize: 13, lineHeight: 1.7 }}>
                ادخل بنفس البريد وكلمة المرور المستخدمة في تطبيق رُشد، وستُزامَن بياناتك المالية تلقائياً.
              </p>

              {rushdLoginError && (
                <div style={{ background: 'var(--danger-dim)', borderRadius: 10, padding: '10px 14px', color: 'var(--danger)', fontSize: 13 }}>
                  {rushdLoginError}
                </div>
              )}

              <form onSubmit={handleRushdLogin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="input-group">
                  <label className="input-label">البريد الإلكتروني</label>
                  <input
                    className="input" type="email" inputMode="email"
                    placeholder="example@email.com" autoComplete="email"
                    value={rushdEmail}
                    onChange={e => { setRushdEmail(e.target.value); setRushdLoginError(''); }}
                    style={{ direction: 'ltr', textAlign: 'left' }}
                  />
                </div>
                <div className="input-group">
                  <label className="input-label">كلمة المرور</label>
                  <input
                    className="input" type="password" autoComplete="current-password"
                    placeholder="••••••••"
                    value={rushdPass}
                    onChange={e => { setRushdPass(e.target.value); setRushdLoginError(''); }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={rushdLoginLoading || rushdStatus === 'connecting'}
                  className="btn btn-primary"
                  style={{ marginTop: 4, opacity: rushdLoginLoading ? 0.7 : 1 }}
                >
                  {rushdLoginLoading ? 'جاري الربط...' : 'ربط رُشد'}
                </button>
              </form>

              <a
                href="https://rushd-app-nine.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  textAlign: 'center', fontSize: 13, color: 'var(--primary)',
                  textDecoration: 'underline', display: 'block',
                }}
              >
                ليس لديك حساب؟ أنشئه في رُشد
              </a>
            </div>
          )}
        </section>

        {/* App Update */}
        <section>
          <div style={{ fontSize: 13, color: '#6C63FF', fontWeight: 700, marginBottom: 12 }}>🔄 تحديث التطبيق</div>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ color: 'var(--text2)', fontSize: 13 }}>
              اضغط للتحقق من وجود نسخة جديدة وتثبيتها فوراً بدون حذف التطبيق
            </p>
            <button
              onClick={handleAppUpdate}
              disabled={updateStatus === 'checking' || updateStatus === 'updating'}
              style={{
                padding: '13px', borderRadius: 12, border: 'none', cursor: 'pointer',
                fontFamily: 'Mestika, Cairo, sans-serif', fontWeight: 700, fontSize: 15,
                transition: 'all .2s',
                background: updateStatus === 'current' ? 'var(--accent-dim)'
                  : updateStatus === 'error' ? 'var(--danger-dim)'
                  : '#6C63FF',
                color: updateStatus === 'current' ? 'var(--accent)'
                  : updateStatus === 'error' ? 'var(--danger)'
                  : '#fff',
                opacity: (updateStatus === 'checking' || updateStatus === 'updating') ? 0.75 : 1,
              }}
            >
              {updateStatus === 'idle' && '🔄 تحديث التطبيق'}
              {updateStatus === 'checking' && '⏳ جاري الفحص...'}
              {updateStatus === 'updating' && '⬇️ جاري التحديث...'}
              {updateStatus === 'current' && '✓ التطبيق محدّث بالفعل'}
              {updateStatus === 'error' && '⚠️ حدث خطأ، حاول مجدداً'}
            </button>

            <button
              onClick={forceRefresh}
              style={{
                padding: '12px', borderRadius: 12, cursor: 'pointer',
                fontFamily: 'Mestika, Cairo, sans-serif', fontWeight: 700, fontSize: 14,
                background: 'transparent', color: 'var(--text2)',
                border: '1.5px solid var(--border)',
              }}
            >
              🧹 مسح الذاكرة المؤقتة وإعادة التحميل
            </button>
            <p style={{ color: 'var(--text3)', fontSize: 11, lineHeight: 1.7, textAlign: 'center' }}>
              استخدمه إذا بقي التطبيق على النسخة القديمة. بياناتك محفوظة ولن تُمس.
            </p>
          </div>
        </section>

        {/* App Info */}
        <section>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>💼</div>
            <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 4 }}>راتبي</div>
            <div style={{ color: 'var(--text3)', fontSize: 12, marginBottom: 12 }}>الإصدار 1.0 · أوفلاين كامل</div>

            <div style={{
              background: 'var(--bg2)', borderRadius: 10, padding: '10px 12px',
              display: 'flex', flexDirection: 'column', gap: 5,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text3)', fontSize: 11 }}>الفرع</span>
                <span className="num" style={{ color: 'var(--primary)', fontSize: 11, fontWeight: 700 }}>{BUILD_BRANCH}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text3)', fontSize: 11 }}>النسخة</span>
                <span className="num" style={{ color: 'var(--text2)', fontSize: 11 }}>{BUILD_COMMIT}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text3)', fontSize: 11 }}>تاريخ البناء</span>
                <span className="num" style={{ color: 'var(--text2)', fontSize: 11 }}>
                  {new Date(BUILD_TIME).toLocaleString('ar-SA', { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
