import { create } from 'zustand';
import { DEFAULT_APP_SETTINGS } from '../../constants/appSettings_v1.4.0';
import * as settingsService from '../../db/services/settings_v1.4.0';
import { AppSettingKey, AppSettings } from '../../types/settings_v1.4.0';

interface SettingsStore {
  settings: AppSettings;
  isLoading: boolean;
  loadSettings: () => Promise<AppSettings>;
  updateSetting: <K extends AppSettingKey>(key: K, value: AppSettings[K]) => Promise<void>;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: DEFAULT_APP_SETTINGS,
  isLoading: false,

  loadSettings: async () => {
    set({ isLoading: true });

    try {
      const settings = await settingsService.getAppSettings();
      set({ settings });

      return settings;
    } catch (error) {
      console.error('Error loading settings', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  updateSetting: async (key, value) => {
    try {
      await settingsService.updateAppSetting(key, value);
      set({ settings: { ...get().settings, [key]: value } });
    } catch (error) {
      console.error('Error updating setting', error);
      throw error;
    }
  },
}));
