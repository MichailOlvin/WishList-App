import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Appbar, Button, Chip, FAB, IconButton, Menu, Switch } from 'react-native-paper';
import { useFocusEffect, useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { initDatabase } from '../db/schema';
import { useCategoryStore } from '../state/stores/categoryStore';
import { useWishStore } from '../state/stores/wishStore';
import { Category, Priority, WishItem } from '../types/models';
import { formatDate, formatPrice } from '../utils/formatters_v1.0.0';
import { normalizeProductUrl } from '../utils/url_v1.1.0';
import { colors } from '../theme/theme_v1.0.0';

type SortKey = 'priceAsc' | 'priceDesc' | 'priority' | 'dateAsc' | 'dateDesc' | 'nameAsc';

const priorityColors: Record<Priority, string> = {
  high: colors.danger,
  medium: colors.warning,
  low: colors.success,
};

const sortOptions: Array<{ key: SortKey; label: string }> = [
  { key: 'priceAsc', label: 'Цена ↑' },
  { key: 'priceDesc', label: 'Цена ↓' },
  { key: 'priority', label: 'Приоритет' },
  { key: 'dateDesc', label: 'Дата ↓' },
  { key: 'dateAsc', label: 'Дата ↑' },
  { key: 'nameAsc', label: 'Название А-Я' },
];

// Version берём из Expo config, чтобы UI не расходился с app.json при следующих релизах.
const appVersion = Constants.expoConfig?.version ?? '1.2.5';

export default function Index() {
  const router = useRouter();
  const { items, totalWantPrice, refreshItems, toggleItemStatus, isLoading } = useWishStore();
  const { categories, loadCategories } = useCategoryStore();
  const [search, setSearch] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>('dateDesc');
  const [isSortMenuVisible, setSortMenuVisible] = useState(false);
  const [showBought, setShowBought] = useState(false);
  const [isReady, setReady] = useState(false);
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);

  const bootstrapApp = useCallback(async () => {
    try {
      setBootstrapError(null);
      await initDatabase();
      await Promise.all([loadCategories(), refreshItems()]);
      setReady(true);
    } catch (error) {
      console.error('Error bootstrapping WishList', error);
      setBootstrapError('Не удалось открыть локальную базу данных');
    }
  }, [loadCategories, refreshItems]);

  useEffect(() => {
    void bootstrapApp();
  }, [bootstrapApp]);

  useFocusEffect(
    useCallback(() => {
      if (isReady) {
        void Promise.all([loadCategories(), refreshItems()]);
      }
    }, [isReady, loadCategories, refreshItems]),
  );

  const categoryById = useMemo(() => {
    return categories.reduce<Record<string, Category>>((accumulator, category) => {
      accumulator[category.id] = category;
      return accumulator;
    }, {});
  }, [categories]);

  const filteredAndSortedItems = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    const filteredItems = items.filter((item) => {
      const matchesSearch = item.name.toLowerCase().includes(normalizedSearch);
      const matchesCategory = selectedCategoryId === null || item.categoryId === selectedCategoryId;
      const matchesStatus = showBought || item.status === 'want';

      return matchesSearch && matchesCategory && matchesStatus;
    });

    return [...filteredItems].sort((firstItem, secondItem) => {
      switch (sortKey) {
        case 'priceAsc':
          return compareNullablePrices(firstItem.price, secondItem.price, 'asc');
        case 'priceDesc':
          return compareNullablePrices(firstItem.price, secondItem.price, 'desc');
        case 'priority':
          return getPriorityRank(secondItem.priority) - getPriorityRank(firstItem.priority);
        case 'dateAsc':
          return new Date(firstItem.createdAt).getTime() - new Date(secondItem.createdAt).getTime();
        case 'dateDesc':
          return new Date(secondItem.createdAt).getTime() - new Date(firstItem.createdAt).getTime();
        case 'nameAsc':
          return firstItem.name.localeCompare(secondItem.name, 'ru');
        default:
          return 0;
      }
    });
  }, [items, search, selectedCategoryId, showBought, sortKey]);

  const selectedSortLabel = sortOptions.find((option) => option.key === sortKey)?.label ?? 'Сортировка';

  const renderCategoryChip = (category: Category | null) => {
    const isSelected = selectedCategoryId === category?.id || (category === null && selectedCategoryId === null);
    const label = category?.name ?? 'Все';

    return (
      <Chip
        key={category?.id ?? 'all'}
        compact
        selected={isSelected}
        onPress={() => setSelectedCategoryId(category?.id ?? null)}
        style={[styles.chip, isSelected && styles.selectedChip]}
        textStyle={styles.chipText}
      >
        {label}
      </Chip>
    );
  };

  const renderWishItem = ({ item }: { item: WishItem }) => {
    const categoryName = categoryById[item.categoryId]?.name ?? 'Без категории';
    const isBought = item.status === 'bought';
    const productUrl = normalizeProductUrl(item.url);
    const metaText = `${categoryName} • ${formatPrice(item.price)}`;
    const isDeadlinePast = isPastDeadline(item.deadline);

    return (
      <Pressable
        onPress={() => router.push({ pathname: '/add-edit', params: { id: item.id } })}
        style={({ pressed }) => [
          styles.row,
          pressed && styles.pressedRow,
          isBought && styles.boughtRow,
        ]}
      >
        <View style={[styles.priorityRail, { backgroundColor: priorityColors[item.priority] }]} />

        <View style={styles.itemTextBlock}>
          <Text numberOfLines={1} style={[styles.itemName, isBought && styles.boughtText]}>
            {item.name}
          </Text>
          <Text numberOfLines={1} style={styles.itemMeta}>
            {metaText}
          </Text>
          {item.deadline && (
            <Text numberOfLines={1} style={[styles.deadlineText, isDeadlinePast && styles.pastDeadlineText]}>
              Дедлайн: {formatDate(item.deadline)}
            </Text>
          )}
          {productUrl && (
            <Button
              compact
              icon="open-in-new"
              mode="text"
              textColor={colors.accent}
              onPress={(event) => {
                event.stopPropagation();
                void openProductUrl(productUrl);
              }}
              contentStyle={styles.urlButtonContent}
              labelStyle={styles.urlButtonLabel}
              style={styles.urlButton}
            >
              Сайт
            </Button>
          )}
        </View>

        <View style={styles.actionButtons}>
          <IconButton
            icon={isBought ? 'undo-variant' : 'check'}
            accessibilityLabel={isBought ? 'Вернуть в хочу' : 'Отметить купленным'}
            iconColor={isBought ? colors.textMuted : colors.accent}
            size={20}
            onPress={(event) => {
              event.stopPropagation();
              void toggleItemStatus(item);
            }}
            style={styles.rowButton}
          />
        </View>
      </Pressable>
    );
  };

  if (!isReady && !bootstrapError) {
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator color={colors.accent} size="large" />
        <Text style={styles.centeredText}>Загрузка WishList...</Text>
      </View>
    );
  }

  if (bootstrapError) {
    return (
      <View style={styles.centeredContainer}>
        <Text style={styles.errorText}>{bootstrapError}</Text>
        <Button mode="contained" onPress={bootstrapApp}>
          Повторить
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Appbar.Header elevated={false} style={styles.appbar}>
        <View style={styles.headerTextBlock}>
          <Text style={styles.headerTitle}>WishList</Text>
          <Text style={[styles.metaText, styles.headerVersion]}>v{appVersion}</Text>
        </View>
        <Appbar.Action
          icon="cog-outline"
          color={colors.text}
          accessibilityLabel="Настройки"
          onPress={() => router.push('/categories')}
        />
      </Appbar.Header>

      <View style={styles.content}>
        <Text style={[styles.metaText, styles.totalText]}>Сумма желаний: {totalWantPrice.toFixed(2)} €</Text>

        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Поиск по названию"
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
        />

        <FlatList
          horizontal
          data={[null, ...categories]}
          keyExtractor={(category) => category?.id ?? 'all'}
          renderItem={({ item }) => renderCategoryChip(item)}
          showsHorizontalScrollIndicator={false}
          style={styles.categoryList}
          contentContainerStyle={styles.categoryListContent}
        />

        <View style={styles.controlsRow}>
          <Menu
            visible={isSortMenuVisible}
            onDismiss={() => setSortMenuVisible(false)}
            anchor={
              <Button
                icon="sort"
                mode="outlined"
                compact
                textColor={colors.text}
                style={styles.sortButton}
                onPress={() => setSortMenuVisible(true)}
              >
                {selectedSortLabel}
              </Button>
            }
          >
            {sortOptions.map((option) => (
              <Menu.Item
                key={option.key}
                title={option.label}
                leadingIcon={option.key === sortKey ? 'check' : undefined}
                onPress={() => {
                  setSortKey(option.key);
                  setSortMenuVisible(false);
                }}
              />
            ))}
          </Menu>

          <View style={styles.boughtToggle}>
            <Text style={styles.toggleText}>Купленные</Text>
            <Switch value={showBought} onValueChange={setShowBought} color={colors.accent} />
          </View>
        </View>

        <FlatList
          data={filteredAndSortedItems}
          keyExtractor={(item) => item.id}
          renderItem={renderWishItem}
          refreshing={isLoading}
          onRefresh={refreshItems}
          contentContainerStyle={filteredAndSortedItems.length === 0 && styles.emptyList}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              {search || selectedCategoryId ? 'Ничего не найдено' : 'Пока нет желаний'}
            </Text>
          }
        />
      </View>

      <FAB
        icon="plus"
        onPress={() => router.push({ pathname: '/add-edit', params: { mode: 'add', draftId: Date.now().toString() } })}
        style={styles.fab}
        color={colors.background}
      />
    </View>
  );
}

const getPriorityRank = (priority: Priority): number => {
  const ranks: Record<Priority, number> = {
    high: 3,
    medium: 2,
    low: 1,
  };

  return ranks[priority];
};

const compareNullablePrices = (firstPrice: number | null, secondPrice: number | null, direction: 'asc' | 'desc') => {
  // Null prices всегда уходят вниз списка, чтобы items с ценой были удобнее для сравнения.
  if (firstPrice === null && secondPrice === null) {
    return 0;
  }

  if (firstPrice === null) {
    return 1;
  }

  if (secondPrice === null) {
    return -1;
  }

  return direction === 'asc' ? firstPrice - secondPrice : secondPrice - firstPrice;
};

const openProductUrl = async (url: string): Promise<void> => {
  try {
    // Для http/https не вызываем canOpenURL: на Android он может вернуть false без manifest queries.
    await Linking.openURL(url);
  } catch (error) {
    console.error('Error opening product URL', error);
    Alert.alert('Ошибка', 'Не удалось открыть сайт.');
  }
};

const isPastDeadline = (deadline: string | null): boolean => {
  if (!deadline) {
    return false;
  }

  const deadlineDate = new Date(deadline);

  if (Number.isNaN(deadlineDate.getTime())) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  deadlineDate.setHours(0, 0, 0, 0);

  return deadlineDate.getTime() < today.getTime();
};

const styles = StyleSheet.create({
  actionButtons: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  appbar: {
    backgroundColor: colors.background,
    minHeight: 64,
  },
  boughtRow: {
    opacity: 0.5,
  },
  boughtText: {
    textDecorationLine: 'line-through',
  },
  boughtToggle: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  categoryList: {
    flexGrow: 0,
    marginBottom: 12,
  },
  categoryListContent: {
    paddingRight: 12,
  },
  centeredContainer: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    gap: 14,
    justifyContent: 'center',
    padding: 24,
  },
  centeredText: {
    color: colors.textMuted,
  },
  chip: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    marginRight: 8,
  },
  chipText: {
    color: colors.text,
  },
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 14,
  },
  controlsRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  deadlineText: {
    color: colors.accent,
    fontSize: 12,
    marginTop: 3,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyText: {
    color: colors.textMuted,
    textAlign: 'center',
  },
  errorText: {
    color: colors.danger,
    textAlign: 'center',
  },
  fab: {
    backgroundColor: colors.accent,
    bottom: 18,
    position: 'absolute',
    right: 18,
  },
  headerTextBlock: {
    flex: 1,
    paddingLeft: 16,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  headerVersion: {
    marginTop: 1,
  },
  metaText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 14,
    opacity: 0.65,
  },
  itemMeta: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 3,
  },
  itemName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  itemTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  pressedRow: {
    backgroundColor: colors.surfaceMuted,
  },
  pastDeadlineText: {
    color: colors.textMuted,
  },
  priorityRail: {
    borderRadius: 2,
    alignSelf: 'stretch',
    width: 4,
  },
  row: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: 10,
    minHeight: 72,
    paddingVertical: 10,
  },
  searchInput: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    color: colors.text,
    fontSize: 16,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  selectedChip: {
    backgroundColor: colors.accentPressed,
    borderColor: colors.accent,
  },
  sortButton: {
    borderColor: colors.border,
  },
  rowButton: {
    margin: 0,
  },
  toggleText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  totalText: {
    marginBottom: 12,
  },
  urlButton: {
    alignSelf: 'flex-start',
    marginLeft: -8,
    marginTop: 2,
  },
  urlButtonContent: {
    height: 26,
    paddingHorizontal: 0,
  },
  urlButtonLabel: {
    fontSize: 12,
    marginHorizontal: 4,
    marginVertical: 0,
  },
});
