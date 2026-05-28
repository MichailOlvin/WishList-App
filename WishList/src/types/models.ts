export type Priority = 'high' | 'medium' | 'low';

export type Status = 'want' | 'bought';

export interface WishItem {
  id: string;
  name: string;
  price: number | null;
  url: string | null;
  imageUrl: string | null;
  priority: Priority;
  categoryId: string;
  status: Status;
  note: string | null;
  createdAt: string;
  deadline: string | null;
}

export interface Category {
  id: string;
  name: string;
  isDefault: boolean;
}
