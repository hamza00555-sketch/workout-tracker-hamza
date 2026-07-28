# ربط راتبي برُشد — وثيقة الدمج

## نظرة عامة

يستطيع مستخدم **راتبي** ربط حسابه برُشد بحيث تُرسَل بيانات التخطيط المالي الشهري تلقائياً إلى Firestore ليقرأها تطبيق رُشد — بدون نسخ/لصق يدوي.

IndexedDB تبقى قاعدة البيانات الأساسية. Firebase sync إضافي اختياري.

---

## المتطلبات الأساسية

1. مشروع Firebase: `rushd-app-fd5a8`
2. Firestore + Authentication (Email/Password) مفعّلَين
3. إضافة نطاق Vercel إلى **Authentication → Authorized Domains** في Firebase Console

---

## متغيرات البيئة (Vercel)

أضف هذه القيم في Vercel → Project Settings → Environment Variables:

```
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

إذا كان أيٌّ منها فارغاً، يعمل التطبيق بشكل طبيعي offline بدون أي رسالة خطأ.

---

## الهيكل التقني

```
راتبي (IndexedDB)
    │
    ├─ db.exportAll()           ← snapshot كامل من IndexedDB
    │
    ├─ buildRushdFinanceBundle() ← RatibiFinanceBundleV1
    │     src/lib/rushdBundle.js
    │
    ├─ syncToRushd()             ← SHA-256 fingerprint → Firestore
    │     src/lib/rushdSync.js
    │
    └─ Firestore: users/{uid}/ratibiSync/{yyyy-mm}
          ↑
       رُشد يقرأ من هنا
```

---

## الملفات الجديدة

### `src/lib/firebase.js`
- يتحقق من وجود 6 VITE vars
- يُهيئ `auth` (browserLocalPersistence ← browserSessionPersistence fallback)
- يُهيئ `firestore` (persistentLocalCache ← getFirestore fallback)
- `auth.languageCode = 'ar'`
- يُصدّر: `auth`, `firestore`, `isFirebaseConfigured`

### `src/lib/rushdBundle.js`
Pure function — لا Firebase، لا React.

**`SalaryMissingError`**: يُرمى عندما salary ≤ 0 أو NaN.

**`buildRushdFinanceBundle({ rawSnapshot, month, displayName, exportedAt })`**:
- تحويل settings array → object عبر `settingsToObj()`
- الراتب: `record?.salary ?? settings.salary` ← يُرمى `SalaryMissingError` إذا كان 0
- الالتزامات: `active !== false` فقط، مع `dueDate` مضبوط لآخر يوم في الشهر
- الأهداف: `completed !== true` فقط، `saved = Math.min(savedAmount, target)`
- ميزانية الرغبات: تُضاف فقط إذا `rushdWishesBudget > 0`
- الميزانية المرنة: `salary - commitmentsTotal - goalsTotal`
- الحسابات: `id = "${bankId}:${accountId}"`, `balance = null` دائماً
- المعاملات: المصروفات للشهر الحالي فقط (فلتر على `expense.month` أو `expense.date`)
- كل القوائم محدودة بـ 200 عنصر
- Schema assertion عند النهاية: `schema === 'ratibi.rushd.finance'`, `version === 1`

### `src/lib/rushdSync.js`

**`syncToRushd({ force })`**:
1. يتحقق من Firebase configured + user مسجّل الدخول
2. `db.exportAll()` ← يشمل المصروفات حتى لو لم تكن في React context
3. `buildRushdFinanceBundle()` ← يُرمى `SalaryMissingError` إذا salary = 0
4. SHA-256 fingerprint (بدون `exportedAt`) لمنع الكتابة المكررة
5. `setDoc(doc(firestore, 'users', uid, 'ratibiSync', bundle.month), { sourceApp, sourceVersion, bundle, updatedAt: serverTimestamp() })`
6. يُعيد: `{ status: 'ok', syncedAt }` أو `{ status: 'error', errorKey }`

**`hasPendingSync()`**: يقرأ localStorage `'ratebi_rushd_pending'`

### `src/context/RushdSyncContext.jsx`

حالات الـ status:
- `'unconfigured'` — Firebase env vars ناقصة
- `'disconnected'` — غير مسجّل الدخول
- `'connecting'` — جاري تسجيل الدخول
- `'syncing'` — جاري المزامنة
- `'connected'` — مزامنة ناجحة
- `'offline'` — غير متصل بالإنترنت
- `'error'` — خطأ في المزامنة أو تسجيل الدخول

يُصدّر: `{ status, rushdUser, lastSyncedAt, error, login, logout, syncNow, isConfigured }`

---

## Firestore Document Schema

```json
{
  "sourceApp": "ratibi",
  "sourceVersion": 1,
  "bundle": {
    "schema": "ratibi.rushd.finance",
    "version": 1,
    "month": "2026-02",
    "currency": "SAR",
    "exportedAt": "2026-02-15T10:00:00.000Z",
    "displayName": "حمزة",
    "income": {
      "salary": 10000,
      "additional": []
    },
    "obligations": [],
    "goals": [],
    "budgets": [
      { "id": "flexible", "kind": "flexible", "label": "مرن", "limit": 6000, "spent": 0 }
    ],
    "accounts": [],
    "transactions": []
  },
  "updatedAt": "<serverTimestamp>"
}
```

---

## قواعد Firestore المطلوبة (في رُشد)

```
match /users/{uid}/ratibiSync/{month} {
  allow read, write: if request.auth != null && request.auth.uid == uid;
}
```

---

## تجربة المستخدم

### الربط الأول
1. المستخدم يفتح راتبي → Settings → "ربط رُشد"
2. يُدخل بريده الإلكتروني وكلمة المرور لحساب رُشد
3. كلمة المرور تُمسح من الذاكرة فور نجاح أو فشل تسجيل الدخول
4. عند النجاح: يُعرض البريد المُخفّى ونقطة خضراء + "زامن الآن"

### المزامنة التلقائية
- تحدث بعد 1500ms من أي تغيير في البيانات (commitments, goals, banks, debts, extraIncome, monthlyRecords)
- تحدث عند فتح التطبيق (إذا كان المستخدم مسجّلاً)
- تحدث عند العودة للاتصال إذا كان هناك sync معلّق

### رابط رُشد → راتبي
```
https://ratebi-salary-app2.vercel.app?connect=rushd
```
يُنقل المستخدم مباشرة لقسم "ربط رُشد" في الإعدادات.

---

## الاختبارات

```bash
npm run test:rushd-sync
```

25 اختباراً تشمل:
- تحويل settings array/object
- أولوية الراتب من السجل الشهري
- فلترة الدخل الإضافي بالشهر
- الالتزامات النشطة فقط
- تصحيح تاريخ الاستحقاق (يوم 31 في فبراير → 28)
- الأهداف غير المكتملة فقط
- تقييد saved بالهدف
- ميزانية الرغبات
- الميزانية المرنة
- دمج الحسابات البنكية
- فلترة المعاملات بالشهر
- الخصوصية (لا email/password/token في الـ bundle)
- رفض salary = 0 و NaN
- coercion للأرقام النصية
- حد 200 عنصر
- ثبات الـ fingerprint

---

## ما ليس في هذا الفرع

- Upstash Redis (فرع `claude/continue-session-gCVKM` فقط)
- Webhook (فرع `claude/continue-session-gCVKM` فقط)
- MCP Server (فرع `claude/continue-session-gCVKM` فقط)
- `RATEBI_API_KEY` (فرع `claude/continue-session-gCVKM` فقط)
