// v1.0.0: Генератор UUID для локальных сущностей приложения.
// Сначала используем native crypto.randomUUID, а fallback оставляем для Expo runtimes без Web Crypto.
export const createUuid = (): string => {
  const randomUuid = globalThis.crypto?.randomUUID?.();

  if (randomUuid) {
    return randomUuid;
  }

  // Fallback формирует UUID v4 compatible string без дополнительных dependencies.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (symbol) => {
    const random = Math.floor(Math.random() * 16);
    const value = symbol === 'x' ? random : (random & 0x3) | 0x8;

    return value.toString(16);
  });
};
