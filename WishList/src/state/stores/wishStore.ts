import { create } from 'zustand';
import { WishItem } from '../../types/models';
import * as wishService from '../../db/services/wishService';

interface WishStore {
  items: WishItem[];
  totalWantPrice: number;
  isLoading: boolean;
  loadItems: () => Promise<void>;
  refreshItems: () => Promise<void>;
  addItem: (item: wishService.WishItemInput) => Promise<WishItem>;
  updateItem: (item: WishItem) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  toggleItemStatus: (item: WishItem) => Promise<void>;
  loadTotalPrice: () => Promise<void>;
}

export const useWishStore = create<WishStore>((set, get) => ({
  items: [],
  totalWantPrice: 0,
  isLoading: false,

  loadItems: async () => {
    set({ isLoading: true });

    try {
      const items = await wishService.getWishItems();
      set({ items });
    } catch (error) {
      console.error('Error loading wish items', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  refreshItems: async () => {
    // v1.0.0: Один refresh обновляет список и сумму, чтобы screens не дублировали orchestration.
    await get().loadItems();
    await get().loadTotalPrice();
  },

  addItem: async (item) => {
    try {
      const createdItem = await wishService.addWishItem(item);
      await get().refreshItems();

      return createdItem;
    } catch (error) {
      console.error('Error adding wish item', error);
      throw error;
    }
  },

  updateItem: async (item) => {
    try {
      await wishService.updateWishItem(item);
      await get().refreshItems();
    } catch (error) {
      console.error('Error updating wish item', error);
      throw error;
    }
  },

  deleteItem: async (id) => {
    try {
      await wishService.deleteWishItem(id);
      await get().refreshItems();
    } catch (error) {
      console.error('Error deleting wish item', error);
      throw error;
    }
  },

  toggleItemStatus: async (item) => {
    const nextStatus = item.status === 'want' ? 'bought' : 'want';

    // Обновляем весь item, чтобы createdAt и остальные поля сохранились без side effects.
    await get().updateItem({ ...item, status: nextStatus });
  },

  loadTotalPrice: async () => {
    try {
      const total = await wishService.getTotalWantPrice();
      set({ totalWantPrice: total });
    } catch (error) {
      console.error('Error loading total price', error);
      throw error;
    }
  },
}));
