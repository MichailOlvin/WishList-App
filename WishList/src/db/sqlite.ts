import * as SQLite from 'expo-sqlite';

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

// v1.0.0: Единая точка открытия SQLite, чтобы позже добавить migrations/cloud sync без правок UI.
export const getDatabase = (): Promise<SQLite.SQLiteDatabase> => {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync('wishlist.db');
  }

  return databasePromise;
};
