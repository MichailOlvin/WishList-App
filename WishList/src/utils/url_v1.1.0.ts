// v1.1.0: URL helper нормализует пользовательский ввод перед открытием ссылки.
export const normalizeProductUrl = (url: string | null): string | null => {
  const trimmedUrl = url?.trim();

  if (!trimmedUrl) {
    return null;
  }

  // Если пользователь ввёл example.com, открываем как https://example.com.
  if (!/^https?:\/\//i.test(trimmedUrl)) {
    return `https://${trimmedUrl}`;
  }

  return trimmedUrl;
};
