import { create } from 'zustand';
import { Category } from '../../types/models';
import * as categoryService from '../../db/services/categories_v1.0.0';

interface CategoryStore {
  categories: Category[];
  isLoading: boolean;
  loadCategories: () => Promise<void>;
  addCategory: (name: string, isDefault?: boolean) => Promise<Category>;
  updateCategory: (id: string, name: string) => Promise<Category>;
  deleteCategory: (id: string) => Promise<categoryService.DeleteCategoryResult>;
  getCategoryUsageCount: (id: string) => Promise<number>;
  seedDefaults: () => Promise<void>;
}

export const useCategoryStore = create<CategoryStore>((set, get) => ({
  categories: [],
  isLoading: false,

  loadCategories: async () => {
    set({ isLoading: true });

    try {
      const categories = await categoryService.getCategories();
      set({ categories });
    } catch (error) {
      console.error('Error loading categories', error);
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  addCategory: async (name, isDefault = false) => {
    try {
      const category = await categoryService.addCategory(name, isDefault);
      await get().loadCategories();

      return category;
    } catch (error) {
      console.error('Error adding category', error);
      throw error;
    }
  },

  updateCategory: async (id, name) => {
    try {
      const category = await categoryService.updateCategory(id, name);
      await get().loadCategories();

      return category;
    } catch (error) {
      console.error('Error updating category', error);
      throw error;
    }
  },

  deleteCategory: async (id) => {
    try {
      const result = await categoryService.deleteCategory(id);

      if (result.ok) {
        await get().loadCategories();
      }

      return result;
    } catch (error) {
      console.error('Error deleting category', error);
      throw error;
    }
  },

  getCategoryUsageCount: async (id) => categoryService.getCategoryUsageCount(id),

  seedDefaults: async () => {
    try {
      await categoryService.seedDefaultCategories();
      await get().loadCategories();
    } catch (error) {
      console.error('Error seeding default categories', error);
      throw error;
    }
  },
}));
