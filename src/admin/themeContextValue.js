import { createContext } from 'react';

// Mavzu kontekstining o‘zi alohida faylda — komponent fayllari faqat komponent eksport qiladi.
export const ThemeContext = createContext({
  theme: 'dark',
  setTheme: () => {},
  toggleTheme: () => {},
});
