import { createContext } from 'react';
import { DEFAULT_SETTINGS } from './settingsStore';

export const SettingsContext = createContext({
  settings: DEFAULT_SETTINGS,
  save: () => {},
  reset: () => {},
});
