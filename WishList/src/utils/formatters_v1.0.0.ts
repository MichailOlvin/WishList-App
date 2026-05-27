import { Priority, Status } from '../types/models';

export const priorityLabels: Record<Priority, string> = {
  high: 'Высокий',
  medium: 'Средний',
  low: 'Низкий',
};

export const statusLabels: Record<Status, string> = {
  want: 'Хочу',
  bought: 'Куплено',
};

// v1.0.0: Все денежные значения показываем в евро, а null оставляем понятным текстом.
export const formatPrice = (price: number | null): string => {
  if (price === null || Number.isNaN(price)) {
    return 'Цена не указана';
  }

  return `${price.toFixed(2)} €`;
};

export const formatDate = (isoDate: string | null): string => {
  if (!isoDate) {
    return 'Дата не выбрана';
  }

  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(isoDate));
};
