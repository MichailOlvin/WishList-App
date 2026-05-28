export type AppSortKey = 'priceAsc' | 'priceDesc' | 'priority' | 'dateAsc' | 'dateDesc' | 'nameAsc';

export type ListDensity = 'comfortable' | 'compact';

export interface AppSettings {
  showBoughtByDefault: boolean;
  defaultSortKey: AppSortKey;
  defaultCategoryId: string | null;
  thumbnailsEnabled: boolean;
  listDensity: ListDensity;
}

export type AppSettingKey = keyof AppSettings;
