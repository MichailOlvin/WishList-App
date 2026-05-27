import { DEFAULT_CATEGORY_NAMES, GENERAL_CATEGORY_NAME } from '../../constants/defaultCategories_v1.0.0';
import { Category } from '../../types/models';
import { createUuid } from '../../utils/uuid_v1.0.0';
import { getDatabase } from '../sqlite';

type CategoryRow = {
  id: string;
  name: string;
  isDefault: number;
};

export type DeleteCategoryResult =
  | { ok: true }
  | { ok: false; reason: 'default' | 'inUse' | 'missing'; itemCount?: number };

const mapCategory = (row: CategoryRow): Category => ({
  id: row.id,
  name: row.name,
  isDefault: Boolean(row.isDefault),
});

// v1.0.0: Repository возвращает domain models, а не raw SQLite rows.
export const getCategories = async (): Promise<Category[]> => {
  const db = await getDatabase();
  const rows = await db.getAllAsync<CategoryRow>(
    'SELECT id, name, isDefault FROM categories ORDER BY isDefault DESC, name COLLATE NOCASE ASC',
  );

  return rows.map(mapCategory);
};

export const addCategory = async (name: string, isDefault = false): Promise<Category> => {
  const db = await getDatabase();
  const normalizedName = name.trim();

  if (!normalizedName) {
    throw new Error('CATEGORY_NAME_REQUIRED');
  }

  const existingCategory = await db.getFirstAsync<CategoryRow>(
    'SELECT id, name, isDefault FROM categories WHERE name = ? COLLATE NOCASE LIMIT 1',
    normalizedName,
  );

  if (existingCategory) {
    throw new Error('CATEGORY_ALREADY_EXISTS');
  }

  const category: Category = {
    id: createUuid(),
    name: normalizedName,
    isDefault,
  };

  await db.runAsync(
    'INSERT INTO categories (id, name, isDefault) VALUES (?, ?, ?)',
    category.id,
    category.name,
    category.isDefault ? 1 : 0,
  );

  return category;
};

export const updateCategory = async (id: string, name: string): Promise<Category> => {
  const db = await getDatabase();
  const normalizedName = name.trim();

  if (!normalizedName) {
    throw new Error('CATEGORY_NAME_REQUIRED');
  }

  const category = await db.getFirstAsync<CategoryRow>(
    'SELECT id, name, isDefault FROM categories WHERE id = ? LIMIT 1',
    id,
  );

  if (!category) {
    throw new Error('CATEGORY_NOT_FOUND');
  }

  const existingCategory = await db.getFirstAsync<CategoryRow>(
    'SELECT id, name, isDefault FROM categories WHERE name = ? COLLATE NOCASE AND id != ? LIMIT 1',
    normalizedName,
    id,
  );

  if (existingCategory) {
    throw new Error('CATEGORY_ALREADY_EXISTS');
  }

  await db.runAsync('UPDATE categories SET name = ? WHERE id = ?', normalizedName, id);

  return {
    id,
    name: normalizedName,
    isDefault: Boolean(category.isDefault),
  };
};

export const getCategoryUsageCount = async (id: string): Promise<number> => {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM wish_items WHERE categoryId = ?',
    id,
  );

  return row?.count ?? 0;
};

export const deleteCategory = async (id: string): Promise<DeleteCategoryResult> => {
  const db = await getDatabase();
  const category = await db.getFirstAsync<CategoryRow>(
    'SELECT id, name, isDefault FROM categories WHERE id = ? LIMIT 1',
    id,
  );

  if (!category) {
    return { ok: false, reason: 'missing' };
  }

  if (category.isDefault) {
    return { ok: false, reason: 'default' };
  }

  const itemCount = await getCategoryUsageCount(id);

  if (itemCount > 0) {
    return { ok: false, reason: 'inUse', itemCount };
  }

  await db.runAsync('DELETE FROM categories WHERE id = ? AND isDefault = 0', id);

  return { ok: true };
};

export const seedDefaultCategories = async (): Promise<void> => {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM categories');

  if ((row?.count ?? 0) > 0) {
    return;
  }

  // Transaction держит seed атомарным: либо созданы все категории, либо ни одной.
  await db.withTransactionAsync(async () => {
    for (const name of DEFAULT_CATEGORY_NAMES) {
      await db.runAsync(
        'INSERT INTO categories (id, name, isDefault) VALUES (?, ?, 1)',
        createUuid(),
        name,
      );
    }
  });
};

export const ensureGeneralCategory = async (): Promise<void> => {
  const db = await getDatabase();
  const generalCategory = await db.getFirstAsync<CategoryRow>(
    'SELECT id, name, isDefault FROM categories WHERE name = ? COLLATE NOCASE LIMIT 1',
    GENERAL_CATEGORY_NAME,
  );

  if (generalCategory) {
    return;
  }

  const legacyMiscCategory = await db.getFirstAsync<CategoryRow>(
    'SELECT id, name, isDefault FROM categories WHERE name = ? COLLATE NOCASE AND isDefault = 1 LIMIT 1',
    'Прочее',
  );

  if (legacyMiscCategory) {
    // Migration v1.2.5: старую дефолтную категорию переименовываем, сохраняя item links.
    await db.runAsync('UPDATE categories SET name = ? WHERE id = ?', GENERAL_CATEGORY_NAME, legacyMiscCategory.id);
    return;
  }

  await db.runAsync(
    'INSERT INTO categories (id, name, isDefault) VALUES (?, ?, 1)',
    createUuid(),
    GENERAL_CATEGORY_NAME,
  );
};
