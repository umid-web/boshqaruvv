# EduControl Pro — o‘quv markazi boshqaruv paneli

React 19 + Vite + React Router + Recharts + SCSS.

## Ishga tushirish

```bash
npm install
npm run dev       # ishlab chiqish serveri
npm run build     # production build (dist/)
npm run preview   # build'ni local ko‘rish
npm run lint      # oxlint
```

## Tuzilma

```
src/
├─ main.jsx · App.jsx · index.css      # kirish nuqtasi, marshrutlar, global reset
└─ admin/
   ├─ navigation.js                    # menyu — Sidebar va marshrutlar uchun yagona manba
   ├─ ThemeContext.jsx · themeContextValue.js · useTheme.js   # yorug‘/qorong‘i mavzu (standart: qorong‘i, tanlov saqlanadi)
   ├─ chartTheme.js                    # Recharts uchun umumiy mavzu
   ├─ layout/AdminLayout.*             # sidebar + header + kontent
   ├─ pages/                           # Dashboard, PlaceholderPage, NotFound
   │  ├─ students/                     # Talabalar bo‘limi (jadval, filtr, forma, profil paneli, billing.js)
   │  ├─ teachers/                     # Ustozlar bo‘limi (jadval, filtr, forma, profil paneli)
   │  ├─ support-teachers/             # Qo‘shimcha ustozlar (yordamchi, mentor, o‘rinbosar)
   │  ├─ courses/                      # Kurslar (kartalar, narx, dastur, guruhlar, ustozlar)
   │  ├─ groups/                       # Guruhlar (jadval, asosiy va qo‘shimcha ustozlarni biriktirish)
   │  ├─ schedule/                     # Dars jadvali (ustoz/xona vaqt chizig‘i, band va bo‘sh vaqt)
   │  ├─ users-roles/                  # Foydalanuvchilar va rollar (jadval, ruxsatlar matritsasi)
   │  ├─ notifications/                # Bildirishnomalar sahifasi (filtr, tanlash, o‘qildi/o‘chirish)
   │  └─ activity/                     # Faoliyat tarixi sahifasi (audit jadvali, filtr, tafsilot paneli)
   ├─ activity/                        # Faoliyat tarixi va bildirishnomalar mantig‘i (do‘konlar, meta, eslatmalar)
   ├─ components/                      # Card, StatCard, grafiklar, jadval, ...
   │  └─ ui/                           # Modal, ConfirmDialog, Toast, RowMenu, Pagination, Avatar
   ├─ data/dashboardDemoData.js        # DEMO ma'lumotlar (backend bilan almashtiriladi)
   ├─ utils/format.js                  # raqam, pul va sana formatlash
   └─ styles/                          # variables.scss (SCSS), admin.scss (CSS tokenlar)
```

## Dizayn tizimi

Barcha ranglar `src/admin/styles/admin.scss` dagi CSS o‘zgaruvchilarda
(`--primary`, `--surface`, `--border`, ...) saqlanadi. Qorong‘i mavzu —
`[data-theme='dark']` bloki; komponentlarda alohida dark-kod yozish shart emas.

## Yangi sahifa qo‘shish

1. `src/admin/navigation.js` ga yangi element qo‘shing (`path`, `label`, `icon`).
2. Haqiqiy sahifa tayyor bo‘lsa, `App.jsx` da shu `path` uchun alohida `<Route>` yarating.

## Talabalar bo‘limi (`/admin/students`)

- Qidiruv (ism, ID, telefon, guruh), holat tablari, kurs/guruh/to‘lov filtrlari
- Ustunlar bo‘yicha saralash, sahifalash, ko‘p tanlash va ommaviy amallar
- Talaba qo‘shish/tahrirlash formasi (tekshiruv, telefon niqobi), profil paneli, o‘chirishni "Qaytarish" bilan bekor qilish
- CSV eksport (tanlangan yoki filtrlangan talabalar)
- DEMO ma'lumotlar `studentsData.js` da, saqlash `useStudents.js` da (hozircha localStorage).
  Backend ulanganda faqat `useStudents.js` ichidagi funksiyalar API so‘rovlariga almashtiriladi.

### Yangi talaba va to‘lov hisobi (`students/billing.js`)

- Yangi talaba **to‘lamagan holda** qo‘shiladi: qarzi = birinchi oy to‘lovi (+ qo‘shilgan oydan keyingi,
  joriy oygacha bo‘lgan to‘liq oylar). To‘lov holati — "Qarzdor".
- Talaba oyning o‘rtasida qo‘shilsa, to‘lov **guruh dars kunlariga** qarab kamayadi:
  `oylik narx × (qatnashadigan darslar / oydagi jami darslar)`, 1 000 so‘mgacha yaxlitlanadi.
  Qo‘shilgan kun ham hisobga kiradi. Formada hisob-kitob real vaqtda ko‘rinadi.
- Guruh jadvali (`GROUPS`) — `students/studentsData.js` da: kunlar, vaqt, xona.
- Keyingi oylardan boshlab oylik to‘lov to‘liq.

## Ustozlar bo‘limi (`/admin/teachers`)

- Qidiruv (ism, ID, telefon, fan, guruh), holat tablari (Ishlamoqda / Ta‘tilda / Ketgan), fan va guruh filtrlari
- Saralash, sahifalash, ko‘p tanlash, ommaviy amallar (holat, o‘chirish, CSV eksport)
- Ustoz qo‘shish/tahrirlash: shaxsiy va kasbiy ma'lumotlar, fanlar, **guruh biriktirish**, ish haqi (foiz yoki qat’iy)
  - Guruh faqat bitta ustozga biriktiriladi (band guruhni tanlab bo‘lmaydi)
  - Bir ustozning guruhlari dars vaqti bo‘yicha kesishsa, forma ruxsat bermaydi
- Profil paneli: haftalik dars jadvali, guruhlar va talabalar soni, taxminiy ish haqi
- "Ketgan" holatidagi ustozning guruhlari bo‘shatiladi; "Ustozsiz guruhlar" ko‘rsatkichi shuni kuzatadi
- Talaba formasi va profilida guruh ustozi hamda dars jadvali ko‘rinadi
- Ma'lumotlar `teachersStore.js` da (hozircha localStorage, kalit: `edu-teachers-v1`)

## Qo‘shimcha ustozlar bo‘limi (`/admin/support-teachers`)

Rollar: **Yordamchi ustoz**, **Mentor**, **O‘rinbosar ustoz** (`supportData.js` → `SUPPORT_ROLES`).

- Qidiruv, holat tablari (Ishlamoqda / Ta‘tilda / Ketgan), rol va fan filtrlari, saralash, sahifalash, ommaviy amallar, CSV eksport
- Asosiy ustozdan farqi: **bitta guruhga bir nechta qo‘shimcha ustoz** biriktirilishi mumkin; formada guruhning asosiy ustozi ko‘rsatiladi
- Tekshiruvlar: guruhlar dars vaqti kesishmasin; guruh kunlari ustozning "Ish kunlari"ga mos kelsin (bo‘sh qoldirilsa — istalgan kun)
- To‘lov: **har bir dars uchun** (oylik = narx × haftalik darslar × 4) yoki **qat’iy oylik** — profilda taxminiy hisob
- "Ketgan" holatidagi ustozning guruhlari bo‘shatiladi; o‘rinbosar ustozga guruh shart emas
- Ma'lumotlar `supportStore.js` da (hozircha localStorage, kalit: `edu-support-teachers-v1`)

## Kurslar bo‘limi (`/admin/courses`)

- Kurs kartalari: daraja, davomiylik, oylik narx, faol talabalar, guruhlar va kutilayotgan oylik tushum
- Holat tablari (Faol / Arxivda), qidiruv, saralash (nomi, talabalar, tushum, narx)
- Kurs qo‘shish/tahrirlash: tavsif, daraja, davomiylik, dars uzunligi, narx, rang belgisi, kurs dasturi (mavzular)
- Batafsil panel: guruhlar jadvali, asosiy va qo‘shimcha ustozlar, o‘rtacha davomat, qarzdorlik
- **Narx sinxronligi:** Kurslar sahifasida narx o‘zgartirilsa, *yangi talaba* qo‘shish formasida shu narx taklif etiladi
  (mavjud talabalarning to‘lovi o‘zgarmaydi) — `getCourseFee()` (`coursesStore.js`)
- **Bog‘liqlik himoyasi:** guruhi yoki talabasi bor kursning nomini o‘zgartirib bo‘lmaydi va o‘chirib bo‘lmaydi
  (faqat "Arxivga o‘tkazish"), chunki guruhlar va talabalar kurs nomi bo‘yicha bog‘langan
- Guruhlar `Guruhlar` bo‘limida boshqariladi; kurs ularni `getCourseGroups()` orqali oladi
- Ma'lumotlar `coursesStore.js` da (hozircha localStorage, kalit: `edu-courses-v1`)

## Guruhlar bo‘limi (`/admin/groups`)

- Jadval: guruh, kurs, dars jadvali, **asosiy ustoz**, **qo‘shimcha ustozlar**, talabalar (faol / sig‘im), holat
- Qidiruv (guruh, kurs, xona, ustoz ismi), holat tablari (Faol / Arxivda), kurs va ustoz filtrlari
  (asosiy ustozsiz · qo‘shimcha ustozli · qo‘shimcha ustozsiz), saralash, sahifalash, ommaviy amallar, CSV eksport
- Guruh qo‘shish/tahrirlash: kurs, kod (kursga qarab avtomatik taklif: `MAT-C`), dars kunlari, vaqt, xona, sig‘im, boshlanish sanasi
- **Ustoz biriktirish:** formaning o‘zida yoki qatordagi "Ustozlarni biriktirish" menyusi orqali
  - **Asosiy ustoz** — bitta (ro‘yxatdan tanlanadi)
  - **Qo‘shimcha ustozlar** — istalgancha (yordamchi, mentor, o‘rinbosar), belgilash orqali
  - Faqat guruh kursi fanini o‘qitadigan, "Ketgan" bo‘lmagan ustozlar ko‘rinadi
  - Dars vaqti ustozning boshqa guruhi bilan kesishsa yoki qo‘shimcha ustozning "Ish kunlari"ga mos kelmasa, tanlab bo‘lmaydi (sababi ko‘rsatiladi)
  - Jadval o‘zgartirilganda ham shu tekshiruvlar qayta ishlaydi; bir xonada bir vaqtda ikkita guruh bo‘lishi mumkin emas
- Profil paneli: jadval, asosiy va qo‘shimcha ustozlar, talabalar ro‘yxati, davomat va tushum
- **Bog‘liqlik himoyasi:** talabasi bor guruhni o‘chirib/arxivlab bo‘lmaydi, kursini o‘zgartirib bo‘lmaydi; kod o‘zgarmaydi.
  Arxivga o‘tkazilgan yoki o‘chirilgan guruhdan ustozlar bo‘shatiladi ("Qaytarish" ularni tiklaydi)
- **Ma'lumotlar manbasi:** ustoz biriktirishlar avvalgidek `teacher.groups` (Ustozlar) va `person.groups` (Qo‘shimcha ustozlar)
  ichida saqlanadi — Ustozlar, Qo‘shimcha ustozlar, Kurslar va Talabalar sahifalari o‘zgarishsiz yangi biriktirishlarni ko‘radi
- Guruhlar `groupsStore.js` da (localStorage, kalit: `edu-groups-v1`). `applyGroupsRegistry()` har o‘zgarishda umumiy
  `GROUPS`, `GROUP_LIST`, `COURSES[].groups` ro‘yxatlarini joyida yangilaydi; `App.jsx` bu faylni ilova ochilishida import qiladi

## Dars jadvali (`/admin/schedule`)

- Ma'lumot manbasi — Guruhlar (kunlar, vaqt, xona) va ularga biriktirilgan ustozlar; sahifa yangi ma'lumot saqlamaydi
- **Ustozlar** va **Xonalar** rejimi. Har bir qator — vaqt chizig'i (08:00–20:00, darslar tashqariga chiqsa kengayadi):
  rangli blok — band vaqt, bloklar orasidagi joy — bo'sh vaqt. Qatorning o'ng tomonida band soat va bo'sh oraliqlar yoziladi
- Ko'rinish: **kun bo'yicha** (tanlangan kunda hamma ustoz yoki xona) yoki **hafta bo'yicha** (bitta ustoz/xonaning butun haftasi)
- Qidiruv va "Faqat darsi borlar" filtri; ta'tildagi ustozlar belgilanadi; ranglar kurs rangiga mos
- **Qoidalar:** bir xonada bir vaqtda bitta dars; bir ustoz (asosiy yoki qo'shimcha) bir vaqtda bitta guruhda.
  Bu Guruhlar formasi, tezkor biriktirish, darsni o'zgartirish va arxivdan faollashtirishda tekshiriladi
- Darsni bosib kun, vaqt va xonasini o'zgartirish mumkin ("Qaytarish" bilan); saqlashdan oldin xona va ustozlar tekshiriladi
- Agar eski ma'lumotda vaqti kesishgan darslar bo'lsa, sahifa tepasida ogohlantirish chiqadi va bloklar qizil bilan belgilanadi

## Davomat (`/admin/attendance`)

- Chapda barcha faol guruhlar (tanlangan kunda "Belgilangan / Kutilmoqda / Dars yo'q"), o'ngda tanlangan guruh talabalari
- Har bir talaba yonida **to'lov holati va qarzi** ko'rinadi; belgilar: Keldi · Kechikdi · Sababli · Kelmadi
- Sana tanlash (oldingi/keyingi kun), "Hammasi keldi", qidiruv, oylik davomat foizi; saqlash `edu-attendance-v1` (localStorage)

## Moliya (`/admin/finance`, `payments`, `debts`, `expenses`)

- Bitta `Finance.jsx` to'rt ko'rinishda: umumiy (KPI, tushum/xarajat grafigi, xarajat tarkibi), to'lovlar, qarzdorlik, xarajatlar
- **To'lov qabul qilish** talabaning qarzidan avtomatik ayiriladi (Talabalar va Davomat sahifalarida ham darhol ko'rinadi)
- Qidiruv, filtrlar, CSV eksport; ma'lumotlar `financeStore.js` da (`edu-payments-v1`, `edu-expenses-v1`)

## Foydalanuvchilar va rollar (`/admin/users-roles`)

Ikki bo‘lim, bitta sahifada (`?tab=roles` — rollar bo‘limi):

**Foydalanuvchilar**
- Qidiruv (ism, email, ID, telefon, rol), holat tablari (Faol / Taklif yuborilgan / Bloklangan), rol filtri
- Saralash, sahifalash, ko‘p tanlash; ommaviy amallar: faollashtirish, bloklash, **rolni o‘zgartirish**, CSV eksport, o‘chirish
- Qo‘shish/tahrirlash formasi (email noyobligi, telefon niqobi), profil paneli (rol ruxsatlari xulosasi bilan)
- Parol so‘ralmaydi va saqlanmaydi: yangi foydalanuvchiga **taklif** yuboriladi, parolni o‘zi o‘rnatadi
  ("Parolni tiklash" / "Taklifni qayta yuborish" — hozircha DEMO xabar)
- **Himoya:** tizimda kamida bitta faol Super admin qolishi shart — uni o‘chirish, bloklash yoki rolini
  almashtirish (yakka va ommaviy) rad etiladi
- Hamma o‘chirish/holat/rol o‘zgarishlari "Qaytarish" tugmasi bilan bekor qilinadi

**Rollar va ruxsatlar**
- Tizim rollari: Super admin (qulflangan), Administrator, Menejer, Buxgalter, Qabul xodimi, Ustoz
- Maxsus rol yaratish (boshqa roldan ruxsatlarni nusxalash mumkin), tahrirlash, nusxa olish, o‘chirish
  (foydalanuvchisi bor rolni o‘chirib bo‘lmaydi); tizim rolini "Asl holatga" qaytarish mumkin
- Ruxsatlar matritsasi: bo‘lim × amal (Ko‘rish / Qo‘shish / Tahrirlash / O‘chirish / Eksport).
  Satr va ustun bo‘yicha ommaviy belgilash; "Ko‘rish" ruxsatisiz boshqa amal bo‘lmaydi
  (tahrirlashni yoqsangiz, "Ko‘rish" o‘zi yoqiladi, "Ko‘rish" o‘chsa — bo‘limning hamma amali o‘chadi)
- O‘zgarishlar "Saqlash" bosilgandan keyin kuchga kiradi; saqlanmagan o‘zgarish bilan boshqa rolga o‘tilsa, ogohlantiriladi
- Bo‘limlar ro‘yxati `navigation.js` dan olinadi — menyuga yangi sahifa qo‘shilsa, u matritsada avtomatik paydo bo‘ladi
  (shu sahifaning amallari `usersData.js` dagi `MODULE_ACTIONS` da belgilanadi)

Ma'lumotlar `usersStore.js` da (hozircha localStorage, kalitlar: `edu-users-v1`, `edu-roles-v1`).
Backend ulanganda faqat shu fayldagi funksiyalar API so‘rovlariga almashtiriladi.
Ruxsat kaliti `<bo‘lim>.<amal>` ko‘rinishida (masalan, `students.edit`); tekshirish uchun `usersData.js` dagi `roleHas(role, 'students', 'edit')`.
> Eslatma: loyihada hali login/sessiya yo‘q, shuning uchun ruxsatlar sidebar va sahifalarga **hali qo‘llanmaydi** —
> autentifikatsiya qo‘shilganda `roleHas` orqali menyu va marshrutlar cheklanadi.



## Bildirishnomalar va faoliyat tarixi

Ikkita alohida, lekin bog‘liq tizim (`src/admin/activity/`):

- **Faoliyat tarixi** (`/admin/activity`) — audit jurnali: *kim, qachon, nimani, nimadan nimaga* o‘zgartirdi.
- **Bildirishnomalar** (`/admin/notifications` va sarlavhadagi qo‘ng‘iroqcha) — e’tibor talab qiladigan xabarlar:
  to‘lov qabul qilish/bekor qilish, qarzdorlik, past davomat, tug‘ilgan kun, xavfsizlik o‘zgarishlari.

### Qanday ishlaydi

```js
import { logActivity } from '../activity/activityStore';

logActivity({
  module: 'payments',            // activity/meta.js dagi MODULES kaliti
  action: 'payment',             // create | update | delete | restore | status | payment | save | export | security | system
  title: 'To‘lov qabul qilindi: Karimova Madina — 450 000 so‘m',
  entityId: 'PAY-1', entityName: 'Karimova Madina',
  changes: [{ field: 'amount', label: 'Summa', from: '0', to: '450 000 so‘m' }],   // ixtiyoriy
  notify: { category: 'payment', priority: 'normal', title: '…', message: '…', link: '/admin/payments' }, // ixtiyoriy
});
```

- Barcha CRUD do‘konlari (`useStudents`, `teachersStore`, `coursesStore`, `groupsStore`, `supportStore`, `usersStore`,
  `financeStore`) `createLogger()` orqali avtomatik yozadi — sahifa kodiga tegmasdan. Tahrirlashda faqat **haqiqatan
  o‘zgargan** maydonlar (oldin → keyin) saqlanadi.
- `downloadCsv()` har bir eksportni, `SettingsContext.save()` sozlamalar o‘zgarishini yozadi.
- `syncSystemAlerts()` (AdminLayout ochilganda) qarzdorlik / past davomat / tug‘ilgan kun eslatmalarini hosil qiladi;
  `key` orqali kuniga (davomat — oyiga) bir martadan ortiq takrorlanmaydi va Sozlamalar → Bildirishnomalar
  tumblerlariga bo‘ysunadi.
- Foydalanuvchi hozircha `getActor()` (activityStore.js) dan olinadi. Login qo‘shilganda shu funksiya almashtiriladi.

### Backend ulanganda

DEMO ma’lumotlar `localStorage` da (`edu-activity-v1`, `edu-notifications-v1`). Faqat `activityStore.js` va
`notificationStore.js` ichidagi o‘qish/yozish funksiyalari API so‘rovlariga (audit log serverda yozilishi kerak),
qo‘ng‘iroqcha uchun esa WebSocket/SSE ga almashtiriladi — sahifalar va do‘konlarga ulanishlar o‘zgarmaydi.
Birinchi ochilishdagi namunaviy yozuvlar `demo: true` bilan belgilangan (`demoSeed()`).
#   b o s h q a r u v v  
 