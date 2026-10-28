import { useCallback, useEffect, useMemo, useState } from 'react';
import { SettingsContext } from './settingsContextValue';
import { logActivity } from '../../activity/activityStore';
import { cloneSettings, DEFAULT_SETTINGS, loadSettings, saveSettings } from './settingsStore';

const SECTION_LABELS = {
  org: 'Tashkilot',
  appearance: 'Ko‘rinish',
  finance: 'Moliya',
  attendance: 'Davomat',
  notifications: 'Bildirishnomalar',
  security: 'Xavfsizlik',
};

const KEY_LABELS = {
  name: 'Nomi', legalName: 'Yuridik nomi', phone: 'Telefon', email: 'Email', website: 'Veb-sayt', address: 'Manzil',
  inn: 'STIR', director: 'Direktor', timezone: 'Vaqt mintaqasi', workStart: 'Ish boshlanishi', workEnd: 'Ish tugashi',
  workDays: 'Ish kunlari', logo: 'Logotip', theme: 'Mavzu', density: 'Zichlik', language: 'Til', dateFormat: 'Sana formati',
  currency: 'Valyuta', invoicePrefix: 'Hisob prefiksi', lateFeePercent: 'Penya (%)', dueDay: 'To‘lov kuni',
  paymentMethods: 'To‘lov usullari', fiscalYearStart: 'Moliya yili boshlanishi', lateMinutes: 'Kechikish (daq.)',
  autoAbsentMinutes: 'Avto-yo‘q (daq.)', requireNote: 'Izoh majburiy', notifyParents: 'Ota-onaga xabar',
  sms: 'SMS', telegram: 'Telegram', paymentReminders: 'To‘lov eslatmalari', attendanceAlerts: 'Davomat ogohlantirishlari',
  birthdayReminders: 'Tug‘ilgan kun eslatmalari', digest: 'Xulosa', sessionMinutes: 'Sessiya (daq.)',
  twoFactor: 'Ikki bosqichli himoya', passwordMinLength: 'Parol uzunligi', loginAlerts: 'Kirish ogohlantirishlari',
};

const show = (v) => (v === true ? 'Yoqilgan' : v === false ? 'O‘chirilgan' : Array.isArray(v) ? v.join(', ') || '—' : v === '' || v == null ? '—' : String(v));

/** Ikki sozlamalar to‘plami orasidagi farq: [{ field, label, from, to }] (logotip rasmi matn sifatida yozilmaydi). */
const diffSettings = (prev, next) => {
  const changes = [];
  for (const section of Object.keys(SECTION_LABELS)) {
    for (const key of Object.keys(next[section] ?? {})) {
      const a = prev[section]?.[key];
      const b = next[section][key];
      if (JSON.stringify(a) === JSON.stringify(b)) continue;
      const label = `${SECTION_LABELS[section]}: ${KEY_LABELS[key] ?? key}`;
      changes.push(key === 'logo'
        ? { field: `${section}.${key}`, label, from: a ? 'bor' : '—', to: b ? 'yangilandi' : 'olib tashlandi' }
        : { field: `${section}.${key}`, label, from: show(a), to: show(b) });
    }
  }
  return changes;
};

const applyChrome = (settings) => {
  const density = settings.appearance?.density === 'compact' ? 'compact' : 'comfortable';
  document.documentElement.setAttribute('data-density', density);
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(loadSettings);

  useEffect(() => {
    applyChrome(settings);
  }, [settings]);

  const save = useCallback((next) => {
    const previous = loadSettings();
    const stored = saveSettings(next);
    const changes = diffSettings(previous, stored);
    if (changes.length) {
      const securityChanged = changes.some((c) => c.field.startsWith('security.'));
      logActivity({
        module: 'settings',
        action: securityChanged ? 'security' : 'save',
        severity: securityChanged ? 'warning' : 'info',
        title: `Sozlamalar saqlandi (${changes.length} ta o‘zgarish)`,
        changes,
        notify: securityChanged
          ? { category: 'security', priority: 'high', title: 'Xavfsizlik sozlamalari o‘zgartirildi', message: 'Sessiya, parol yoki ikki bosqichli himoya parametrlari yangilandi', link: '/admin/activity' }
          : null,
      });
    }
    setSettings(stored);
    applyChrome(stored);
    return stored;
  }, []);

  const reset = useCallback(() => {
    logActivity({ module: 'settings', action: 'system', severity: 'warning', title: 'Sozlamalar standart holatga qaytarildi' });
    const stored = saveSettings(cloneSettings(DEFAULT_SETTINGS));
    setSettings(stored);
    applyChrome(stored);
    return stored;
  }, []);

  const value = useMemo(() => ({ settings, save, reset }), [settings, save, reset]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
};
