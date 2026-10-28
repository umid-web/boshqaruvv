// To‘lov hisob-kitobi: talaba oyning o‘rtasida qo‘shilsa, faqat qatnashadigan darslari uchun to‘laydi.
// Bu fayl hech narsaga bog‘liq emas (sof funksiyalar) — guruh dars kunlari `days` sifatida beriladi
// (JS formatida: 0 = yakshanba, 1 = dushanba … 6 = shanba).

const roundTo = (n, step = 1000) => Math.round(n / step) * step;

// "2026-10-23" → Date (mahalliy vaqt, soat zonasi siljishisiz)
export const parseIso = (iso) => {
  const [y, m, d] = String(iso).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

/** Oyning `fromDay` kunidan oxirigacha guruh necha marta dars o‘tishini sanaydi. */
export const countLessons = (days, year, month, fromDay = 1) => {
  if (!days?.length) return 0;
  const last = new Date(year, month + 1, 0).getDate();
  let count = 0;
  for (let day = Math.max(1, fromDay); day <= last; day++) {
    if (days.includes(new Date(year, month, day).getDay())) count++;
  }
  return count;
};

/**
 * Qo‘shilgan oy uchun to‘lov.
 *  - total  — oyda guruhning jami darslari
 *  - attend — talaba qatnashadigan darslar (qo‘shilgan kundan boshlab, o‘sha kun ham kiradi)
 *  - charge — to‘lov = oylik narx × attend / total (1 000 so‘mgacha yaxlitlanadi)
 */
export const calcFirstMonth = ({ days, fee, enrolledAt }) => {
  const monthlyFee = Number(fee) || 0;
  const date = parseIso(enrolledAt);
  const total = countLessons(days, date.getFullYear(), date.getMonth());
  const attend = countLessons(days, date.getFullYear(), date.getMonth(), date.getDate());

  // Guruh jadvali noma'lum yoki oyda dars yo‘q — to‘liq narx
  if (!total) return { total: 0, attend: 0, perLesson: 0, charge: monthlyFee, prorated: false };

  const prorated = attend < total;
  return {
    total,
    attend,
    perLesson: monthlyFee / total,
    charge: prorated ? roundTo((monthlyFee * attend) / total) : monthlyFee,
    prorated,
  };
};

/**
 * Yangi talabaning boshlang‘ich qarzi: qo‘shilgan oy (proratsiya bilan) + undan keyingi,
 * joriy oygacha bo‘lgan to‘liq oylar. Yangi talaba hech narsa to‘lamagan hisoblanadi.
 */
export const calcInitialDebt = ({ days, fee, enrolledAt, today = new Date() }) => {
  const first = calcFirstMonth({ days, fee, enrolledAt });
  const date = parseIso(enrolledAt);
  const monthsPassed = (today.getFullYear() - date.getFullYear()) * 12 + (today.getMonth() - date.getMonth());
  const extraMonths = Math.max(0, monthsPassed);
  return { ...first, extraMonths, debt: first.charge + extraMonths * (Number(fee) || 0) };
};

const sameMonth = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();

/** Berilgan oy uchun talabadan olinadigan summa (qo‘shilgan oyda — proratsiyalangan). */
export const chargeForMonth = (student, monthDate = new Date()) => {
  if (student.firstCharge != null && student.enrolledAt && sameMonth(parseIso(student.enrolledAt), monthDate)) {
    return student.firstCharge;
  }
  return student.monthlyFee;
};
