import { getDatabase } from './sqlite';
import { ensureGeneralCategory, seedDefaultCategories } from './services/categories_v1.0.0';

let initPromise: Promise<void> | null = null;

// v1.0.0: Schema bootstrap создаёт таблицы, индексы и seed-ит default categories один раз.
export const initDatabase = async (): Promise<void> => {
  if (!initPromise) {
    initPromise = setupDatabase().catch((error) => {
      // Если bootstrap упал, retry button на UI должен иметь шанс открыть базу заново.
      initPromise = null;
      throw error;
    });
  }

  return initPromise;
};

const setupDatabase = async (): Promise<void> => {
  const db = await getDatabase();

  // Foreign keys включены явно, потому что SQLite не всегда активирует их по умолчанию.
  await db.execAsync(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      isDefault INTEGER NOT NULL DEFAULT 0
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_categories_name_unique
      ON categories (name COLLATE NOCASE);

    CREATE TABLE IF NOT EXISTS wish_items (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        price REAL,
        url TEXT,
        imageUrl TEXT,
        priority TEXT NOT NULL,
        categoryId TEXT NOT NULL,
        status TEXT NOT NULL,
        note TEXT,
        createdAt TEXT NOT NULL,
        deadline TEXT,
        FOREIGN KEY (categoryId) REFERENCES categories (id) ON DELETE RESTRICT
      );

    CREATE INDEX IF NOT EXISTS idx_wish_items_category
      ON wish_items (categoryId);

    CREATE INDEX IF NOT EXISTS idx_wish_items_status
      ON wish_items (status);

    CREATE INDEX IF NOT EXISTS idx_wish_items_created_at
      ON wish_items (createdAt);
  `);

  await migrateWishItemsSchema();
  await seedDefaultCategories();
  await ensureGeneralCategory();
};

const migrateWishItemsSchema = async (): Promise<void> => {
  const db = await getDatabase();
  const columns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(wish_items)');
  const columnNames = new Set(columns.map((column) => column.name));

  if (!columnNames.has('imageUrl')) {
    // Migration v1.3.0: optional thumbnail URL для компактной картинки в списке.
    await db.execAsync('ALTER TABLE wish_items ADD COLUMN imageUrl TEXT');
  }
};
