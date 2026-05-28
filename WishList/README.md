# WishList v1.4.1

Мобильное Android-приложение на Expo (React Native) + TypeScript для личного списка будущих покупок.

## Функции v1.0.0

- Add / edit / delete wish items
- SQLite storage через `expo-sqlite`
- Seed default categories при первом запуске
- Category filter chips и real-time search
- Sort по цене, приоритету, дате и названию
- Status toggle `Хочу` / `Куплено`
- Total sum для всех items со статусом `Хочу`
- Category management: add custom category, delete only unused custom category
- Dark theme only

## Изменения v1.1.0

- Исправлен выбор deadline date в Android date picker
- Добавлена кнопка открытия product URL для items со ссылкой

## Изменения v1.1.1

- Android deadline picker переведён на `DateTimePickerAndroid.open`
- URL action вынесен в явную кнопку `Сайт` в строке хотелки

## Изменения v1.2.0

- Убран выбор статуса из формы создания/редактирования
- Убран текстовый badge приоритета из списка, осталась цветовая полоса слева
- Deadline теперь отображается в строке хотелки
- Категории перенесены в экран `Настройки`, открываемый через шестерёнку
- Добавлено переименование категорий
- Исправлены отступы списка категорий, чтобы FAB не закрывал нижние actions

## Изменения v1.2.1

- Версия приложения отображается мелко под названием `WishList`

## Изменения v1.2.2

- Версия вынесена в явный текстовый блок header, чтобы точно отображаться на Android

## Изменения v1.2.3

- Сумма желаний вынесена из header в отдельную строку, чтобы текст не обрезался

## Изменения v1.2.4

- Просроченный deadline отображается более приглушённым цветом
- Текст суммы желаний стилизован так же, как версия приложения

## Изменения v1.2.5

- Версия и сумма желаний стали менее яркими
- Категория `Общее` теперь используется по умолчанию при создании хотелки
- Старая default category `Прочее` мигрирует в `Общее`

## Изменения v1.2.6

- Версия приложения и сумма желаний используют общий текстовый стиль

## Изменения v1.3.0

- Добавлено optional поле `imageUrl` и компактная миниатюра в строке хотелки
- Добавлен индикатор заметки с просмотром текста в dialog
- Единый поиск теперь ищет по названию, категории, заметке, URL, цене, приоритету, статусу и deadline
- Добавлена SQLite migration для поля `imageUrl`, чтобы старые локальные базы обновлялись без сброса данных

## Изменения v1.4.0

- Экран шестерёнки превращён в полноценные настройки с grouped rows
- Управление категориями вынесено в отдельный экран
- Добавлено локальное хранение preferences через SQLite `app_settings`
- Добавлены настройки: показывать купленные по умолчанию, сортировка, категория по умолчанию, миниатюры, компактность списка
- Добавлены actions для очистки купленных хотелок и удаления всех хотелок
- Main screen теперь применяет сохранённые настройки списка

## Изменения v1.4.1

- Исправлен fallback выбора категории по умолчанию, если сохранённая пользовательская категория была удалена
- UI-тексты на экране настроек и категорий приведены к русскому языку

## Roadmap

- Автозаполнение названия из URL: делать только через preview/confirm, чтобы неправильный title с сайта не затирал ручной ввод.

## Project Structure

- `src/app/` — Expo Router screens: main list, add/edit form, categories
- `src/db/schema.ts` — SQLite schema bootstrap и seed orchestration
- `src/db/services/*_v*.ts` — versioned repository/data layer
- `src/state/stores/` — Zustand stores для items, categories и settings
- `src/types/models.ts` — domain models `WishItem` и `Category`
- `src/theme/theme_v1.0.0.ts` — dark theme palette
- `src/utils/*_v1.0.0.ts` — UUID и formatting helpers

## Run

```bash
npm install
npm start
```

Expo dev server по умолчанию доступен на `http://localhost:8081`.

## Testing And Debugging

### Phone + Expo Go

```bash
npx expo start
```

После запуска отсканируйте QR code в Expo Go. Если телефон не видит Mac в Wi-Fi сети:

```bash
npx expo start --tunnel
```

### Useful Checks

```bash
npx tsc --noEmit
npx expo-doctor
```

### Logs

Во время работы через Expo Go все `console.log`, `console.warn` и `console.error` выводятся в terminal, где запущен `npx expo start`.

Developer menu:

- Android phone: shake device
- Emulator / USB Android: `Ctrl + M`
- Terminal with Expo CLI: press `m`
