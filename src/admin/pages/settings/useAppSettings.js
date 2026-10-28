import { useContext } from 'react';
import { SettingsContext } from './settingsContextValue';

export const useAppSettings = () => useContext(SettingsContext);
