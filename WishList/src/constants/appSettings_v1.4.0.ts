import { AppSettings, AppSortKey, ListDensity } from '../types/settings_v1.4.0';

export const DEFAULT_APP_SETTINGS: AppSettings = {
  showBoughtByDefault: false,
  defaultSortKey: 'dateDesc',
  defaultCategoryId: null,
  thumbnailsEnabled: true,
  listDensity: 'comfortable',
};

export const SORT_OPTIONS: Array<{ key: AppSortKey; label: string }> = [
  { key: 'priceAsc', label: 'Цена ↑' },
  { key: 'priceDesc', label: 'Цена ↓' },
  { key: 'priority', label: 'Приоритет' },
  { key: 'dateDesc', label: 'Дата ↓' },
  { key: 'dateAsc', label: 'Дата ↑' },
  { key: 'nameAsc', label: 'Название А-Я' },
];

export const LIST_DENSITY_OPTIONS: Array<{ key: ListDensity; label: string }> = [
  { key: 'comfortable', label: 'Обычно' },
  { key: 'compact', label: 'Компактно' },
];
