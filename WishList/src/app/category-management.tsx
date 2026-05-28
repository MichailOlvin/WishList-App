import React, { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { Appbar, Button, Dialog, FAB, IconButton, List, Portal, TextInput } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { initDatabase } from '../db/schema';
import { useCategoryStore } from '../state/stores/categoryStore';
import { Category } from '../types/models';
import { colors } from '../theme/theme_v1.0.0';

export default function CategoryManagement() {
  const router = useRouter();
  const {
    categories,
    addCategory,
    updateCategory,
    deleteCategory,
    getCategoryUsageCount,
    loadCategories,
    isLoading,
  } = useCategoryStore();
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isAddDialogVisible, setAddDialogVisible] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<Category | null>(null);
  const [editedCategoryName, setEditedCategoryName] = useState('');
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [isSaving, setSaving] = useState(false);

  const bootstrapCategories = useCallback(async () => {
    try {
      await initDatabase();
      await loadCategories();
    } catch (error) {
      console.error('Error loading category management screen', error);
      Alert.alert('Ошибка', 'Не удалось загрузить категории.');
    }
  }, [loadCategories]);

  useEffect(() => {
    void bootstrapCategories();
  }, [bootstrapCategories]);

  const handleAddCategory = async () => {
    const trimmedName = newCategoryName.trim();

    if (!trimmedName) {
      Alert.alert('Введите название', 'Название категории не может быть пустым.');
      return;
    }

    try {
      setSaving(true);
      await addCategory(trimmedName);
      setNewCategoryName('');
      setAddDialogVisible(false);
    } catch (error) {
      console.error('Error adding category', error);
      const message = error instanceof Error && error.message === 'CATEGORY_ALREADY_EXISTS'
        ? 'Такая категория уже существует.'
        : 'Не удалось добавить категорию.';
      Alert.alert('Ошибка', message);
    } finally {
      setSaving(false);
    }
  };

  const requestEditCategory = (category: Category) => {
    setCategoryToEdit(category);
    setEditedCategoryName(category.name);
  };

  const confirmEditCategory = async () => {
    if (!categoryToEdit) {
      return;
    }

    const trimmedName = editedCategoryName.trim();

    if (!trimmedName) {
      Alert.alert('Введите название', 'Название категории не может быть пустым.');
      return;
    }

    try {
      setSaving(true);
      await updateCategory(categoryToEdit.id, trimmedName);
      setCategoryToEdit(null);
      setEditedCategoryName('');
    } catch (error) {
      console.error('Error editing category', error);
      const message = error instanceof Error && error.message === 'CATEGORY_ALREADY_EXISTS'
        ? 'Такая категория уже существует.'
        : 'Не удалось переименовать категорию.';
      Alert.alert('Ошибка', message);
    } finally {
      setSaving(false);
    }
  };

  const requestDeleteCategory = async (category: Category) => {
    // Default categories и занятые categories не удаляем, чтобы не оставлять items без FK.
    if (category.isDefault) {
      Alert.alert('Стандартная категория', 'Эту категорию нельзя удалить.');
      return;
    }

    try {
      const itemCount = await getCategoryUsageCount(category.id);

      if (itemCount > 0) {
        Alert.alert(
          'Категория используется',
          `В этой категории есть хотелки: ${itemCount}. Сначала перенесите или удалите их.`,
        );
        return;
      }

      setCategoryToDelete(category);
    } catch (error) {
      console.error('Error checking category usage', error);
      Alert.alert('Ошибка', 'Не удалось проверить категорию.');
    }
  };

  const confirmDeleteCategory = async () => {
    if (!categoryToDelete) {
      return;
    }

    try {
      const result = await deleteCategory(categoryToDelete.id);

      if (!result.ok && result.reason === 'inUse') {
        Alert.alert('Категория используется', `В категории есть хотелки: ${result.itemCount}.`);
      }

      if (!result.ok && result.reason === 'default') {
        Alert.alert('Стандартная категория', 'Эту категорию нельзя удалить.');
      }
    } catch (error) {
      console.error('Error deleting category', error);
      Alert.alert('Ошибка', 'Не удалось удалить категорию.');
    } finally {
      setCategoryToDelete(null);
    }
  };

  const renderCategory = ({ item }: { item: Category }) => (
    <List.Item
      title={item.name}
      description={item.isDefault ? 'Стандартная' : 'Пользовательская'}
      titleStyle={styles.categoryTitle}
      descriptionStyle={styles.categoryDescription}
      style={styles.categoryRow}
      left={(props) => (
        <List.Icon
          {...props}
          icon={item.isDefault ? 'lock-outline' : 'tag-outline'}
          color={item.isDefault ? colors.textMuted : colors.accent}
        />
      )}
      right={() => (
        <View style={styles.categoryActions}>
          <IconButton
            icon="pencil-outline"
            iconColor={colors.accent}
            onPress={() => requestEditCategory(item)}
          />
          <IconButton
            icon={item.isDefault ? 'lock' : 'delete-outline'}
            iconColor={item.isDefault ? colors.textMuted : colors.danger}
            disabled={item.isDefault}
            onPress={() => requestDeleteCategory(item)}
          />
        </View>
      )}
    />
  );

  return (
    <View style={styles.container}>
      <Appbar.Header elevated={false} style={styles.appbar}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Категории" />
      </Appbar.Header>

      <FlatList
        data={categories}
        keyExtractor={(category) => category.id}
        renderItem={renderCategory}
        refreshing={isLoading}
        onRefresh={bootstrapCategories}
        ListHeaderComponent={<Text style={styles.sectionTitle}>Управление категориями</Text>}
        contentContainerStyle={[styles.listContent, categories.length === 0 && styles.emptyList]}
        ListEmptyComponent={<Text style={styles.emptyText}>Категорий пока нет</Text>}
      />

      <FAB
        icon="plus"
        onPress={() => setAddDialogVisible(true)}
        style={styles.fab}
        color={colors.background}
      />

      <Portal>
        <Dialog visible={isAddDialogVisible} onDismiss={() => setAddDialogVisible(false)}>
          <Dialog.Title>Добавить категорию</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Название категории"
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              mode="outlined"
              autoFocus
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setAddDialogVisible(false)} textColor={colors.textMuted}>
              Отмена
            </Button>
            <Button loading={isSaving} disabled={isSaving} onPress={handleAddCategory}>
              Сохранить
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={Boolean(categoryToEdit)} onDismiss={() => setCategoryToEdit(null)}>
          <Dialog.Title>Переименовать категорию</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Название категории"
              value={editedCategoryName}
              onChangeText={setEditedCategoryName}
              mode="outlined"
              autoFocus
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setCategoryToEdit(null)} textColor={colors.textMuted}>
              Отмена
            </Button>
            <Button loading={isSaving} disabled={isSaving} onPress={confirmEditCategory}>
              Сохранить
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={Boolean(categoryToDelete)} onDismiss={() => setCategoryToDelete(null)}>
          <Dialog.Title>Удалить категорию?</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogText}>
              Категория "{categoryToDelete?.name}" будет удалена. Это действие нельзя отменить.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setCategoryToDelete(null)} textColor={colors.textMuted}>
              Отмена
            </Button>
            <Button onPress={confirmDeleteCategory} textColor={colors.danger}>
              Удалить
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  appbar: {
    backgroundColor: colors.background,
  },
  categoryActions: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  categoryDescription: {
    color: colors.textMuted,
  },
  categoryRow: {
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    minHeight: 62,
  },
  categoryTitle: {
    color: colors.text,
    fontWeight: '700',
  },
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  dialogText: {
    color: colors.text,
    lineHeight: 20,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyText: {
    color: colors.textMuted,
    textAlign: 'center',
  },
  fab: {
    backgroundColor: colors.accent,
    bottom: 18,
    position: 'absolute',
    right: 18,
  },
  listContent: {
    paddingBottom: 110,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    paddingBottom: 6,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
});
