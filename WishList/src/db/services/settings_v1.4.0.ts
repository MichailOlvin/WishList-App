import { DEFAULT_APP_SETTINGS } from '../../constants/appSettings_v1.4.0';
import { AppSettingKey, AppSettings, AppSortKey, ListDensity } from '../../types/settings_v1.4.0';
import { getDatabase } from '../sqlite';

type SettingRow = {
  key: AppSettingKey;
  value: string;
};

const SORT_KEYS: AppSortKey[] = ['priceAsc', 'priceDesc', 'priority', 'dateAsc', 'dateDesc', 'nameAsc'];
const LIST_DENSITIES: ListDensity[] = ['comfortable', 'compact'];

export const getAppSettings = async (): Promise<AppSettings> => {
  const db = await getDatabase();
  const rows = await db.getAllAsync<SettingRow>('SELECT key, value FROM app_settings');

  // v1.4.0: неизвестные или старые значения игнорируем и мягко возвращаем defaults.
  return rows.reduce<AppSettings>((settings, row) => {
    return {
      ...settings,
      [row.key]: parseSettingValue(row.key, row.value),
    };
  }, DEFAULT_APP_SETTINGS);
};

export const updateAppSetting = async <K extends AppSettingKey>(
  key: K,
  value: AppSettings[K],
): Promise<void> => {
  const db = await getDatabase();

  await db.runAsync(
    `INSERT INTO app_settings (key, value)
     VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    key,
    serializeSettingValue(value),
  );
};

const serializeSettingValue = (value: AppSettings[AppSettingKey]): string => {
  if (value === null) {
    return '';
  }

  return String(value);
};

const parseSettingValue = <K extends AppSettingKey>(key: K, value: string): AppSettings[K] => {
  switch (key) {
    case 'showBoughtByDefault':
    case 'thumbnailsEnabled':
      return (value === 'true') as AppSettings[K];
    case 'defaultSortKey':
      return (
        SORT_KEYS.includes(value as AppSortKey) ? value : DEFAULT_APP_SETTINGS.defaultSortKey
      ) as AppSettings[K];
    case 'defaultCategoryId':
      return (value.trim() || null) as AppSettings[K];
    case 'listDensity':
      return (
        LIST_DENSITIES.includes(value as ListDensity) ? value : DEFAULT_APP_SETTINGS.listDensity
      ) as AppSettings[K];
    default:
      return DEFAULT_APP_SETTINGS[key];
  }
};
