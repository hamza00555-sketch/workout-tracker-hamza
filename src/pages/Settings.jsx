import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext.jsx';
import * as db from '../db/index.js';
import {
  getPermissionStatus, requestPermission, registerPeriodicSync,
  hashPin, isBiometricAvailable, registerBiometric, removeBiometric,
} from '../utils/notifications.js';


export default function Settings() {
  const { settings, updateSettings, setPage, syncStatus, lastSynced, scheduleSync, pullFromCloud } = useApp();
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

  const [updateStatus, setUpdateStatus] = useState('idle'); // idle | checking | updating | current | error

  async function handleAppUpdate() {
    setUpdateStatus('checking');
    try {
      if (!('serviceWorker' in navigator)) { window.location.reload(); return; }
      const reg = await navigator.serviceWorker.getRegistration('/');
      if (!reg) { window.location.reload(); return; }

      // Ask the browser to fetch the SW file and compare.
      // If a new SW is found it installs → self.skipWaiting activates it →
      // clients.claim takes control → controllerchange fires →
      // the always-active listener in App.jsx reloads the page automatically.
      await reg.update();

      if (reg.installing) {
        // New SW is downloading/installing — App.jsx will reload when ready
        setUpdateStatus('updating');
      } else {
        // No new version on the server
        setUpdateStatus('current');
        setTimeout(() => setUpdateStatus('idle'), 3000);
      }
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
      window.location.reload();
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
          </div>
        </section>

        {/* App Info */}
        <section>
          <div className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>💼</div>
            <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 4 }}>راتبي</div>
            <div style={{ color: 'var(--text3)', fontSize: 12 }}>الإصدار 1.0 · أوفلاين كامل</div>
          </div>
        </section>
      </div>
    </div>
  );
}
