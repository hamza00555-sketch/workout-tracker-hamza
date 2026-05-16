const TIPS = [
  'قاعدة 50/30/20: 50% للاحتياجات، 30% للرغبات، 20% للادخار 💰',
  'ابنِ صندوق طوارئ يكفي 3-6 أشهر من مصروفك — الأمان المالي أساس كل شيء',
  'المبلغ الصغير يتراكم مع الزمن — وفّر 100 ريال كل شهر وشوف النتيجة بعد سنة',
  'راجع التزاماتك كل 3 أشهر وشيل اللي ماتحتاجه',
  'خصص للادخار أول ما ينزل راتبك، مو من اللي يتبقى',
  'قبل أي شراء اسأل نفسك: هل أحتاجه فعلاً أم أريده فقط؟',
  'الاشتراكات الصغيرة تتراكم — راجعها دورياً وألغِ اللي ماتستخدمه',
  'ضع هدفاً مالياً واضحاً والتزم بخطة ادخار شهرية لتحقيقه',
  'تجنب القروض للكماليات — ادفع للمستقبل مو للماضي',
  'زد مساهمتك الشهرية في هدف التوفير ولو 50 ريال كل شهر',
  'لا تقارن نفسك بغيرك — الاستقرار المالي أهم من المظاهر',
  'التخطيط المسبق يوفر عليك كثيراً — خطط لمصروفك قبل ما يجي',
];

export function getPermissionStatus() {
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

export async function requestPermission() {
  if (!('Notification' in window)) return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export function canNotify() {
  return 'Notification' in window && Notification.permission === 'granted';
}

function showNotification(title, body, options = {}) {
  if (!canNotify()) return;
  if (navigator.serviceWorker?.controller) {
    navigator.serviceWorker.ready.then(reg => {
      reg.showNotification(title, {
        body,
        icon: '/assets/icons/app-icon.png',
        badge: '/icon-192.png',
        ...options,
      });
    });
  } else {
    new Notification(title, { body, icon: '/assets/icons/app-icon.png', ...options });
  }
}

export function checkCommitmentsAndNotify(commitments) {
  if (!canNotify()) return;
  const today = new Date().getDate();
  const tomorrow = today + 1;
  const notifiedKey = `ratebi-notified-${new Date().toISOString().split('T')[0]}`;
  const notified = new Set(JSON.parse(localStorage.getItem(notifiedKey) || '[]'));

  for (const c of commitments) {
    if (c.active === false) continue;
    const day = Number(c.dayOfMonth);
    const key = `${c.id}-${day === today ? 'today' : 'tomorrow'}`;
    if (notified.has(key)) continue;

    if (day === today) {
      showNotification('تذكير: التزام مستحق اليوم 📅', `${c.name} — ${c.amount} ريال`, { tag: `c-today-${c.id}` });
      notified.add(key);
    } else if (day === tomorrow) {
      showNotification('تذكير: التزام مستحق غداً ⏰', `${c.name} — ${c.amount} ريال`, { tag: `c-tmrw-${c.id}` });
      notified.add(key);
    }
  }
  localStorage.setItem(notifiedKey, JSON.stringify([...notified]));
}

export function showRandomTipIfDue() {
  if (!canNotify()) return;
  const todayStr = new Date().toISOString().split('T')[0];
  if (localStorage.getItem('ratebi-last-tip') === todayStr) return;
  const tip = TIPS[Math.floor(Math.random() * TIPS.length)];
  showNotification('نصيحة مالية 💡', tip, { tag: 'financial-tip' });
  localStorage.setItem('ratebi-last-tip', todayStr);
}

export async function registerPeriodicSync() {
  if (!('serviceWorker' in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    if (!('periodicSync' in reg)) return;
    const status = await navigator.permissions.query({ name: 'periodic-background-sync' });
    if (status.state === 'granted') {
      await reg.periodicSync.register('check-reminders', { minInterval: 24 * 60 * 60 * 1000 });
    }
  } catch {}
}

export async function hashPin(pin) {
  const data = new TextEncoder().encode(pin + 'ratebi-secure-salt-2024');
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function isBiometricAvailable() {
  try {
    return !!(window.PublicKeyCredential &&
      await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable());
  } catch { return false; }
}

export async function registerBiometric() {
  try {
    const credential = await navigator.credentials.create({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        rp: { name: 'راتبي', id: window.location.hostname },
        user: { id: new Uint8Array(16), name: 'ratebi-user', displayName: 'المستخدم' },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },
          { alg: -257, type: 'public-key' },
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          requireResidentKey: false,
          userVerification: 'required',
        },
        timeout: 60000,
        attestation: 'none',
      },
    });
    const rawId = new Uint8Array(credential.rawId);
    const credId = btoa(String.fromCharCode(...rawId));
    localStorage.setItem('ratebi-biometric-id', credId);
    return true;
  } catch { return false; }
}

export async function authenticateBiometric() {
  const credId = localStorage.getItem('ratebi-biometric-id');
  if (!credId) return false;
  try {
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge: crypto.getRandomValues(new Uint8Array(32)),
        allowCredentials: [{
          type: 'public-key',
          id: Uint8Array.from(atob(credId), c => c.charCodeAt(0)),
        }],
        userVerification: 'required',
        timeout: 60000,
      },
    });
    return !!assertion;
  } catch { return false; }
}

export function removeBiometric() {
  localStorage.removeItem('ratebi-biometric-id');
}
