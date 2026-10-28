import { useCallback, useEffect, useMemo, useState } from 'react';
import { ThemeContext } from './themeContextValue';

const STORAGE_KEY = 'admin-theme';
const DEFAULT_THEME = 'dark';
const isValid = (t) => t === 'light' || t === 'dark';

// Boshlang‘ich mavzu: foydalanuvchi tanlovi → index.html skripti o‘rnatgan qiymat → qorong‘i
const getInitialTheme = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isValid(stored)) return stored;
  } catch {
    /* localStorage mavjud emas (masalan, private rejim) */
  }
  const attr = document.documentElement.getAttribute('data-theme');
  return isValid(attr) ? attr : DEFAULT_THEME;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(getInitialTheme);

  // Mavzuni <html> ga qo‘llaydi — CSS tokenlar ([data-theme='dark']) shu orqali ishlaydi
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    root.style.colorScheme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'dark' ? '#0b1424' : '#f5f8fc');
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* e'tiborsiz */
    }
  }, [theme]);

  const setTheme = useCallback((next) => {
    if (isValid(next)) setThemeState(next);
  }, []);
  const toggleTheme = useCallback(
    () => setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark')),
    [],
  );

  const value = useMemo(() => ({ theme, setTheme, toggleTheme }), [theme, setTheme, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
