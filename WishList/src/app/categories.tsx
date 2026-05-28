import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Appbar, Button, Dialog, Divider, List, Portal, RadioButton, Switch } from 'react-native-paper';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { LIST_DENSITY_OPTIONS, SORT_OPTIONS } from '../constants/appSettings_v1.4.0';
import { GENERAL_CATEGORY_NAME } from '../constants/defaultCategories_v1.0.0';
import { initDatabase } from '../db/schema';
import { useCategoryStore } from '../state/stores/categoryStore';
import { useSettingsStore } from '../state/stores/settingsStore';
import { useWishStore } from '../state/stores/wishStore';
import { AppSortKey, ListDensity } from '../types/settings_v1.4.0';
import { colors } from '../theme/theme_v1.0.0';

const appVersion = Constants.expoConfig?.version ?? '1.4.1';

export default function Settings() {
  const router = useRouter();
  const { categories, loadCategories } = useCategoryStore();
  const { items, clearAllItems, clearBoughtItems, refreshItems } = useWishStore();
  const { settings, loadSettings, updateSetting } = useSettingsStore();
  const [isSortDialogVisible, setSortDialogVisible] = useState(false);
  const [isCategoryDialogVisible, setCategoryDialogVisible] = useState(false);
  const [isDensityDialogVisible, setDensityDialogVisible] = useState(false);
  const [isWhatsNewVisible, setWhatsNewVisible] = useState(false);

  const bootstrapSettings = useCallback(async () => {
    try {
      await initDatabase();
      await Promise.all([loadCategories(), loadSettings(), refreshItems()]);
    } catch (error) {
      console.error('Error loading settings screen', error);
      Alert.alert('Ошибка', 'Не удалось загрузить настройки.');
    }
  }, [loadCategories, loadSettings, refreshItems]);

  useEffect(() => {
    void bootstrapSettings();
  }, [bootstrapSettings]);

  const selectedSortLabel = useMemo(() => {
    return SORT_OPTIONS.find((option) => option.key === settings.defaultSortKey)?.label ?? 'Дата ↓';
  }, [settings.defaultSortKey]);

  const selectedDensityLabel = useMemo(() => {
    return LIST_DENSITY_OPTIONS.find((option) => option.key === settings.listDensity)?.label ?? 'Обычно';
  }, [settings.listDensity]);

  const selectedDefaultCategoryName = useMemo(() => {
    const savedCategory = categories.find((category) => category.id === settings.defaultCategoryId);
    const fallbackCategory = categories.find((category) => category.name === GENERAL_CATEGORY_NAME) ?? categories[0];

    return savedCategory?.name ?? fallbackCategory?.name ?? GENERAL_CATEGORY_NAME;
  }, [categories, settings.defaultCategoryId]);

  const defaultCategoryValue = useMemo(() => {
    const savedCategory = categories.find((category) => category.id === settings.defaultCategoryId);
    const fallbackCategory = categories.find((category) => category.name === GENERAL_CATEGORY_NAME) ?? categories[0];

    return savedCategory?.id ?? fallbackCategory?.id ?? '';
  }, [categories, settings.defaultCategoryId]);

  const boughtItemsCount = useMemo(() => {
    return items.filter((item) => item.status === 'bought').length;
  }, [items]);

  const handleUpdateSetting = async <K extends keyof typeof settings>(key: K, value: (typeof settings)[K]) => {
    try {
      // Settings пишем сразу в SQLite, чтобы поведение списка сохранялось после restart.
      await updateSetting(key, value);
    } catch (error) {
      console.error('Error updating setting from settings screen', error);
      Alert.alert('Ошибка', 'Не удалось сохранить настройку.');
    }
  };

  const handleClearBought = () => {
    Alert.alert('Очистить купленные?', 'Все хотелки со статусом "Куплено" будут удалены.', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Очистить',
        style: 'destructive',
        onPress: async () => {
          try {
            await clearBoughtItems();
          } catch (error) {
            console.error('Error clearing bought items', error);
            Alert.alert('Ошибка', 'Не удалось очистить купленные хотелки.');
          }
        },
      },
    ]);
  };

  const handleClearAll = () => {
    Alert.alert('Удалить все хотелки?', 'Категории останутся, но весь список желаний будет очищен.', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          try {
            await clearAllItems();
          } catch (error) {
            console.error('Error clearing all items', error);
            Alert.alert('Ошибка', 'Не удалось удалить все хотелки.');
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Appbar.Header elevated={false} style={styles.appbar}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Настройки" />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.brandBlock}>
          <Text style={styles.brandTitle}>WishList</Text>
          <Text style={styles.brandMeta}>v{appVersion}</Text>
        </View>

        <SettingsSection title="Список">
          <SettingsRow
            icon="check-circle-outline"
            title="Показывать купленные"
            description="Значение по умолчанию при открытии списка"
            right={() => (
              <Switch
                value={settings.showBoughtByDefault}
                onValueChange={(value) => void handleUpdateSetting('showBoughtByDefault', value)}
                color={colors.accent}
              />
            )}
          />
          <SettingsRow
            icon="sort"
            title="Сортировка по умолчанию"
            value={selectedSortLabel}
            onPress={() => setSortDialogVisible(true)}
          />
          <SettingsRow
            icon="tag-outline"
            title="Категория по умолчанию"
            value={selectedDefaultCategoryName}
            onPress={() => setCategoryDialogVisible(true)}
          />
          <SettingsRow
            icon="image-outline"
            title="Миниатюры в списке"
            description="Показывать маленькие картинки хотелок"
            right={() => (
              <Switch
                value={settings.thumbnailsEnabled}
                onValueChange={(value) => void handleUpdateSetting('thumbnailsEnabled', value)}
                color={colors.accent}
              />
            )}
          />
          <SettingsRow
            icon="format-line-spacing"
            title="Компактность списка"
            value={selectedDensityLabel}
            onPress={() => setDensityDialogVisible(true)}
          />
        </SettingsSection>

        <SettingsSection title="Категории">
          <SettingsRow
            icon="shape-outline"
            title="Управление категориями"
            description={`${categories.length} категорий`}
            onPress={() => router.push('/category-management')}
          />
        </SettingsSection>

        <SettingsSection title="Данные">
          <SettingsRow
            icon="broom"
            title="Очистить купленные"
            description={`${boughtItemsCount} купленных хотелок`}
            danger
            onPress={handleClearBought}
          />
          <SettingsRow
            icon="delete-outline"
            title="Удалить все хотелки"
            description="Категории и настройки останутся"
            danger
            onPress={handleClearAll}
          />
        </SettingsSection>

        <SettingsSection title="О приложении">
          <SettingsRow
            icon="star-outline"
            title="Что нового"
            value="v1.4.1"
            onPress={() => setWhatsNewVisible(true)}
          />
          <SettingsRow
            icon="database-outline"
            title="Информация для отладки"
            description={`${items.length} хотелок • ${categories.length} категорий`}
          />
          <SettingsRow icon="information-outline" title="Версия" value={appVersion} />
        </SettingsSection>
      </ScrollView>

      <Portal>
        <RadioDialog
          visible={isSortDialogVisible}
          title="Сортировка по умолчанию"
          value={settings.defaultSortKey}
          options={SORT_OPTIONS}
          onDismiss={() => setSortDialogVisible(false)}
          onChange={(value) => {
            void handleUpdateSetting('defaultSortKey', value as AppSortKey);
            setSortDialogVisible(false);
          }}
        />

        <RadioDialog
          visible={isDensityDialogVisible}
          title="Компактность списка"
          value={settings.listDensity}
          options={LIST_DENSITY_OPTIONS}
          onDismiss={() => setDensityDialogVisible(false)}
          onChange={(value) => {
            void handleUpdateSetting('listDensity', value as ListDensity);
            setDensityDialogVisible(false);
          }}
        />

        <Dialog visible={isCategoryDialogVisible} onDismiss={() => setCategoryDialogVisible(false)}>
          <Dialog.Title>Категория по умолчанию</Dialog.Title>
          <Dialog.ScrollArea>
            <ScrollView>
              <RadioButton.Group
                value={defaultCategoryValue}
                onValueChange={(value) => {
                  void handleUpdateSetting('defaultCategoryId', value || null);
                  setCategoryDialogVisible(false);
                }}
              >
                {categories.map((category) => (
                  <RadioButton.Item
                    key={category.id}
                    label={category.name}
                    value={category.id}
                    labelStyle={styles.radioLabel}
                    color={colors.accent}
                  />
                ))}
              </RadioButton.Group>
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setCategoryDialogVisible(false)} textColor={colors.textMuted}>
              Закрыть
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={isWhatsNewVisible} onDismiss={() => setWhatsNewVisible(false)}>
          <Dialog.Title>Что нового</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogText}>
              v1.4.1: исправлены мелкие шероховатости настроек. Категория по умолчанию корректно переживает удаление
              пользовательской категории, а UI-тексты снова полностью на русском.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setWhatsNewVisible(false)} textColor={colors.accent}>
              Понятно
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

type SettingsSectionProps = {
  children: React.ReactNode;
  title: string;
};

function SettingsSection({ children, title }: SettingsSectionProps) {
  // Небольшая обёртка даёт settings-like groups без превращения экрана в набор карточек.
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionRows}>{children}</View>
    </View>
  );
}

type SettingsRowProps = {
  description?: string;
  danger?: boolean;
  icon: string;
  onPress?: () => void;
  right?: () => React.ReactNode;
  title: string;
  value?: string;
};

function SettingsRow({ description, danger, icon, onPress, right, title, value }: SettingsRowProps) {
  // Унифицированная строка настроек: слева icon, справа toggle/value/chevron.
  return (
    <>
      <List.Item
        title={title}
        description={description}
        onPress={onPress}
        titleStyle={[styles.rowTitle, danger && styles.dangerText]}
        descriptionStyle={styles.rowDescription}
        style={styles.row}
        left={(props) => (
          <List.Icon {...props} icon={icon} color={danger ? colors.danger : colors.textMuted} />
        )}
        right={() => {
          if (right) {
            return <View style={styles.rowRight}>{right()}</View>;
          }

          if (value) {
            return (
              <View style={styles.rowValueBlock}>
                <Text numberOfLines={1} style={styles.rowValue}>
                  {value}
                </Text>
                {onPress && <List.Icon icon="chevron-right" color={colors.textMuted} />}
              </View>
            );
          }

          return onPress ? <List.Icon icon="chevron-right" color={colors.textMuted} /> : null;
        }}
      />
      <Divider style={styles.divider} />
    </>
  );
}

type RadioDialogProps = {
  onChange: (value: string) => void;
  onDismiss: () => void;
  options: Array<{ key: string; label: string }>;
  title: string;
  value: string;
  visible: boolean;
};

function RadioDialog({ onChange, onDismiss, options, title, value, visible }: RadioDialogProps) {
  return (
    <Dialog visible={visible} onDismiss={onDismiss}>
      <Dialog.Title>{title}</Dialog.Title>
      <Dialog.Content>
        <RadioButton.Group value={value} onValueChange={onChange}>
          {options.map((option) => (
            <RadioButton.Item
              key={option.key}
              label={option.label}
              value={option.key}
              labelStyle={styles.radioLabel}
              color={colors.accent}
            />
          ))}
        </RadioButton.Group>
      </Dialog.Content>
      <Dialog.Actions>
        <Button onPress={onDismiss} textColor={colors.textMuted}>
          Закрыть
        </Button>
      </Dialog.Actions>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  appbar: {
    backgroundColor: colors.background,
  },
  brandBlock: {
    paddingBottom: 18,
    paddingHorizontal: 16,
    paddingTop: 6,
  },
  brandMeta: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
    opacity: 0.65,
  },
  brandTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
  },
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    paddingBottom: 32,
  },
  dangerText: {
    color: colors.danger,
  },
  dialogText: {
    color: colors.text,
    lineHeight: 21,
  },
  divider: {
    backgroundColor: colors.border,
    marginLeft: 64,
  },
  radioLabel: {
    color: colors.text,
  },
  row: {
    backgroundColor: colors.surface,
    minHeight: 58,
    paddingRight: 8,
  },
  rowDescription: {
    color: colors.textMuted,
    fontSize: 12,
  },
  rowRight: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: {
    color: colors.text,
    fontWeight: '700',
  },
  rowValue: {
    color: colors.textMuted,
    fontSize: 13,
    maxWidth: 130,
  },
  rowValueBlock: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  section: {
    marginBottom: 18,
  },
  sectionRows: {
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderTopColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0,
    paddingBottom: 7,
    paddingHorizontal: 16,
    textTransform: 'uppercase',
  },
});
