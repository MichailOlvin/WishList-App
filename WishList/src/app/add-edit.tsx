import DateTimePicker, {
  DateTimePickerAndroid,
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Appbar, Button, Menu, SegmentedButtons, TextInput } from 'react-native-paper';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { initDatabase } from '../db/schema';
import { useCategoryStore } from '../state/stores/categoryStore';
import { useWishStore } from '../state/stores/wishStore';
import { Category, Priority, WishItem } from '../types/models';
import { colors } from '../theme/theme_v1.0.0';
import { formatDate } from '../utils/formatters_v1.0.0';
import { GENERAL_CATEGORY_NAME } from '../constants/defaultCategories_v1.0.0';

export default function AddEdit() {
  const router = useRouter();
  const { id, draftId } = useLocalSearchParams<{ id?: string; draftId?: string; mode?: string }>();
  const isEditing = Boolean(id);
  const { items, addItem, updateItem, deleteItem, refreshItems } = useWishStore();
  const { categories, loadCategories } = useCategoryStore();
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [url, setUrl] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [categoryId, setCategoryId] = useState('');
  const [deadline, setDeadline] = useState<string | null>(null);
  const [deadlinePickerDate, setDeadlinePickerDate] = useState<Date>(() => getTodayForPicker());
  const [note, setNote] = useState('');
  const [isCategoryMenuVisible, setCategoryMenuVisible] = useState(false);
  const [isDatePickerVisible, setDatePickerVisible] = useState(false);
  const [isSaving, setSaving] = useState(false);
  const [initializedItemId, setInitializedItemId] = useState<string | null>(null);
  const lastDraftTokenRef = useRef<string | null>(null);

  const selectedCategoryName = useMemo(() => {
    return categories.find((category) => category.id === categoryId)?.name ?? 'Выберите категорию';
  }, [categories, categoryId]);

  const currentItem = useMemo(() => {
    return id ? items.find((item) => item.id === id) : undefined;
  }, [id, items]);

  const bootstrapForm = useCallback(async () => {
    try {
      await initDatabase();
      await Promise.all([loadCategories(), refreshItems()]);
    } catch (error) {
      console.error('Error bootstrapping form', error);
      Alert.alert('Ошибка', 'Не удалось загрузить данные формы');
    }
  }, [loadCategories, refreshItems]);

  const resetForm = useCallback(() => {
    // Hidden tab screens остаются mounted, поэтому add mode должен сам очищать draft state.
    setName('');
    setPrice('');
    setUrl('');
    setPriority('medium');
    setCategoryId(getDefaultCategoryId(categories));
    setDeadline(null);
    setDeadlinePickerDate(getTodayForPicker());
    setNote('');
    setCategoryMenuVisible(false);
    setDatePickerVisible(false);
    setInitializedItemId(null);
  }, [categories]);

  useFocusEffect(
    useCallback(() => {
      void bootstrapForm();

      const draftToken = draftId ?? 'new';

      if (!isEditing && lastDraftTokenRef.current !== draftToken) {
        resetForm();
        lastDraftTokenRef.current = draftToken;
      }

      if (isEditing) {
        lastDraftTokenRef.current = null;
      }
    }, [bootstrapForm, draftId, isEditing, resetForm]),
  );

  useEffect(() => {
    if (isEditing && currentItem && initializedItemId !== currentItem.id) {
      // При редактировании заполняем форму один раз, чтобы не перетирать ручные изменения.
      setName(currentItem.name);
      setPrice(currentItem.price === null ? '' : String(currentItem.price));
      setUrl(currentItem.url ?? '');
      setPriority(currentItem.priority);
      setCategoryId(currentItem.categoryId);
      setDeadline(currentItem.deadline);
      setDeadlinePickerDate(getPickerDate(currentItem.deadline));
      setNote(currentItem.note ?? '');
      setInitializedItemId(currentItem.id);
    }

    if (!isEditing && categories.length > 0 && !categoryId) {
      setCategoryId(getDefaultCategoryId(categories));
    }
  }, [categories, categoryId, currentItem, initializedItemId, isEditing]);

  const handleDeadlineChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (event.type === 'dismissed' || !selectedDate) {
      return;
    }

    // Android picker иногда пересоздаётся при re-render, поэтому держим выбранную дату отдельным state.
    const normalizedDate = normalizeDateForStorage(selectedDate);
    setDeadlinePickerDate(normalizedDate);
    setDeadline(normalizedDate.toISOString());
  };

  const handleOpenDeadlinePicker = () => {
    const currentPickerDate = getPickerDate(deadline);
    setDeadlinePickerDate(currentPickerDate);

    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: currentPickerDate,
        mode: 'date',
        display: 'calendar',
        onChange: handleDeadlineChange,
      });

      return;
    }

    setDatePickerVisible(true);
  };

  const handleClearDeadline = () => {
    setDeadline(null);
    setDeadlinePickerDate(getTodayForPicker());
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    const parsedPrice = parsePrice(price);

    if (!trimmedName) {
      Alert.alert('Название обязательно', 'Добавьте название желания.');
      return;
    }

    if (parsedPrice === 'invalid') {
      Alert.alert('Некорректная цена', 'Введите число, например 199.99.');
      return;
    }

    if (!categoryId) {
      Alert.alert('Выберите категорию', 'Категория нужна для сохранения желания.');
      return;
    }

    const itemData = {
      name: trimmedName,
      price: parsedPrice,
      url: url.trim() || null,
      priority,
      categoryId,
      status: currentItem?.status ?? 'want',
      note: note.trim() || null,
      deadline,
    };

    try {
      setSaving(true);

      if (isEditing && id) {
        const updatedItem: WishItem = {
          ...itemData,
          id,
          createdAt: currentItem?.createdAt ?? new Date().toISOString(),
        };

        await updateItem(updatedItem);
      } else {
        await addItem(itemData);
      }

      resetForm();
      router.replace('/');
    } catch (error) {
      console.error('Error saving item', error);
      Alert.alert('Ошибка', 'Не удалось сохранить желание.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!id) {
      return;
    }

    Alert.alert('Удалить желание?', 'Это действие нельзя отменить.', [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteItem(id);
            router.back();
          } catch (error) {
            console.error('Error deleting item', error);
            Alert.alert('Ошибка', 'Не удалось удалить желание.');
          }
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <Appbar.Header elevated={false} style={styles.appbar}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title={isEditing ? 'Редактировать' : 'Добавить'} />
        {isEditing && <Appbar.Action icon="delete" color={colors.danger} onPress={handleDelete} />}
      </Appbar.Header>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.form}
      >
        <TextInput
          label="Название *"
          value={name}
          onChangeText={setName}
          mode="outlined"
          style={styles.input}
        />

        <TextInput
          label="Цена (€)"
          value={price}
          onChangeText={setPrice}
          keyboardType="decimal-pad"
          mode="outlined"
          style={styles.input}
        />

        <TextInput
          label="URL"
          value={url}
          onChangeText={setUrl}
          autoCapitalize="none"
          keyboardType="url"
          mode="outlined"
          style={styles.input}
        />

        <Text style={styles.label}>Приоритет</Text>
        <SegmentedButtons
          value={priority}
          onValueChange={(value) => setPriority(value as Priority)}
          buttons={[
            { value: 'high', label: 'Высокий' },
            { value: 'medium', label: 'Средний' },
            { value: 'low', label: 'Низкий' },
          ]}
          style={styles.segmented}
        />

        <Text style={styles.label}>Категория</Text>
        <Menu
          visible={isCategoryMenuVisible}
          onDismiss={() => setCategoryMenuVisible(false)}
          anchor={
            <Button
              icon="tag"
              mode="outlined"
              textColor={colors.text}
              onPress={() => setCategoryMenuVisible(true)}
              style={styles.pickerButton}
            >
              {selectedCategoryName}
            </Button>
          }
        >
          {categories.map((category) => (
            <Menu.Item
              key={category.id}
              title={category.name}
              leadingIcon={category.id === categoryId ? 'check' : undefined}
              onPress={() => {
                setCategoryId(category.id);
                setCategoryMenuVisible(false);
              }}
            />
          ))}
        </Menu>

        <Text style={styles.label}>Дедлайн</Text>
        <View style={styles.deadlineRow}>
          <Button
            icon="calendar"
            mode="outlined"
            textColor={colors.text}
            onPress={handleOpenDeadlinePicker}
            style={styles.deadlineButton}
          >
            {formatDate(deadline)}
          </Button>
          {deadline && (
            <Button icon="close" mode="text" textColor={colors.textMuted} onPress={handleClearDeadline}>
              Очистить
            </Button>
          )}
        </View>

        {isDatePickerVisible && (
          <DateTimePicker
            value={deadlinePickerDate}
            mode="date"
            display="default"
            onChange={handleDeadlineChange}
          />
        )}

        <TextInput
          label="Заметка"
          value={note}
          onChangeText={setNote}
          multiline
          numberOfLines={4}
          mode="outlined"
          style={styles.noteInput}
        />

        <View style={styles.actionsRow}>
          <Button mode="outlined" textColor={colors.text} onPress={() => router.back()} style={styles.actionButton}>
            Отмена
          </Button>
          <Button
            mode="contained"
            loading={isSaving}
            disabled={isSaving}
            onPress={handleSave}
            style={styles.actionButton}
            buttonColor={colors.accent}
            textColor={colors.background}
          >
            Сохранить
          </Button>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const parsePrice = (rawPrice: string): number | null | 'invalid' => {
  const normalizedPrice = rawPrice.trim().replace(',', '.');

  if (!normalizedPrice) {
    return null;
  }

  const parsedPrice = Number(normalizedPrice);

  if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
    return 'invalid';
  }

  return parsedPrice;
};

const getTodayForPicker = (): Date => {
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  return today;
};

const getPickerDate = (isoDate: string | null): Date => {
  if (!isoDate) {
    return getTodayForPicker();
  }

  const parsedDate = new Date(isoDate);

  if (Number.isNaN(parsedDate.getTime())) {
    return getTodayForPicker();
  }

  parsedDate.setHours(12, 0, 0, 0);

  return parsedDate;
};

const normalizeDateForStorage = (date: Date): Date => {
  const normalizedDate = new Date(date);
  normalizedDate.setHours(12, 0, 0, 0);

  return normalizedDate;
};

const getDefaultCategoryId = (categories: Category[]): string => {
  const generalCategory = categories.find((category) => category.name === GENERAL_CATEGORY_NAME);

  return generalCategory?.id ?? categories[0]?.id ?? '';
};

const styles = StyleSheet.create({
  actionButton: {
    flex: 1,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  appbar: {
    backgroundColor: colors.background,
  },
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  deadlineButton: {
    flex: 1,
  },
  deadlineRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  form: {
    padding: 16,
    paddingBottom: 34,
  },
  input: {
    marginBottom: 14,
  },
  label: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  noteInput: {
    marginBottom: 18,
    minHeight: 112,
  },
  pickerButton: {
    alignSelf: 'stretch',
    borderColor: colors.border,
    marginBottom: 16,
  },
  segmented: {
    marginBottom: 16,
  },
});
