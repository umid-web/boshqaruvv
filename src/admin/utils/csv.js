import { logActivity } from '../activity/activityStore';

// CSV yuklab olish yordamchisi. BOM (\uFEFF) — Excel o‘zbekcha belgilarni (‘, ʻ) to‘g‘ri ochishi uchun.
const cell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;

export const downloadCsv = (filename, rows) => {
  const csv = '\uFEFF' + rows.map((r) => r.map(cell).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  // Har bir eksport faoliyat tarixiga yoziladi (ma'lumot qaysi fayl bilan chiqib ketgani izi)
  logActivity({
    module: 'system',
    action: 'export',
    title: `Eksport: ${filename}`,
    entityName: filename,
    meta: { Qatorlar: Math.max(0, rows.length - 1) },
  });
};
