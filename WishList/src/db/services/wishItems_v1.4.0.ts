import { WishItem } from '../../types/models';
import { createUuid } from '../../utils/uuid_v1.0.0';
import { getDatabase } from '../sqlite';

export type WishItemInput = Omit<WishItem, 'id' | 'createdAt'>;

// v1.4.0: Repository хранит thumbnails и добавляет bulk actions для settings screen.
type WishItemRow = WishItem;

const mapWishItem = (row: WishItemRow): WishItem => ({
  ...row,
  price: row.price ?? null,
  url: row.url ?? null,
  imageUrl: row.imageUrl ?? null,
  note: row.note ?? null,
  deadline: row.deadline ?? null,
});

export const getWishItems = async (): Promise<WishItem[]> => {
  const db = await getDatabase();
  const rows = await db.getAllAsync<WishItemRow>(
    `SELECT id, name, price, url, imageUrl, priority, categoryId, status, note, createdAt, deadline
     FROM wish_items
     ORDER BY createdAt DESC`,
  );

  return rows.map(mapWishItem);
};

export const addWishItem = async (item: WishItemInput): Promise<WishItem> => {
  const db = await getDatabase();
  const newItem: WishItem = {
    ...item,
    id: createUuid(),
    createdAt: new Date().toISOString(),
  };

  await db.runAsync(
    `INSERT INTO wish_items
      (id, name, price, url, imageUrl, priority, categoryId, status, note, createdAt, deadline)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    newItem.id,
    newItem.name,
    newItem.price,
    newItem.url,
    newItem.imageUrl,
    newItem.priority,
    newItem.categoryId,
    newItem.status,
    newItem.note,
    newItem.createdAt,
    newItem.deadline,
  );

  return newItem;
};

export const updateWishItem = async (item: WishItem): Promise<void> => {
  const db = await getDatabase();

  await db.runAsync(
    `UPDATE wish_items
     SET name = ?, price = ?, url = ?, imageUrl = ?, priority = ?, categoryId = ?, status = ?, note = ?, deadline = ?
     WHERE id = ?`,
    item.name,
    item.price,
    item.url,
    item.imageUrl,
    item.priority,
    item.categoryId,
    item.status,
    item.note,
    item.deadline,
    item.id,
  );
};

export const deleteWishItem = async (id: string): Promise<void> => {
  const db = await getDatabase();

  await db.runAsync('DELETE FROM wish_items WHERE id = ?', id);
};

export const deleteBoughtWishItems = async (): Promise<void> => {
  const db = await getDatabase();

  await db.runAsync('DELETE FROM wish_items WHERE status = ?', 'bought');
};

export const deleteAllWishItems = async (): Promise<void> => {
  const db = await getDatabase();

  await db.runAsync('DELETE FROM wish_items');
};

export const getTotalWantPrice = async (): Promise<number> => {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ total: number | null }>(
    'SELECT SUM(price) AS total FROM wish_items WHERE status = ? AND price IS NOT NULL',
    'want',
  );

  return row?.total ?? 0;
};
