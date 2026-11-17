# Фронтенд: FSD и Tailwind CSS

```text
src/
  app/                       сборка приложения, маршруты, глобальные стили
  pages/                     home, auth, schedule, documents, applications, chat
  widgets/portal-layout/     общая оболочка и навигация
  features/access-guard/     доступ к закрытым разделам
  entities/                  типы урока, документа, приложения и сессии
  shared/                    API-клиент, общие UI-компоненты, конфигурация
```

Зависимости идут вниз: `app → pages → widgets → features → entities → shared`. Слайсы одного слоя не импортируют друг друга. Внешние импорты слайса идут через его `index.ts`/`index.tsx`. В `shared` сегменты (`api`, `ui`, `lib`, `config`) импортируются напрямую, без общего barrel-файла. Псевдоним `@/` указывает на `src/`.

Верстка использует Tailwind CSS через официальный Vite-плагин. Токены темы и базовые стили находятся в `app/styles/index.css`; стили компонентов задаются утилитами Tailwind. Не складывайте компоненты, загрузку данных и маршруты в один файл.

`app/config/route-config.tsx` содержит типизированный массив `routeConfig: RouteObject[]`: главную, закрытые разделы и маршрут 404. `app/providers/router.ts` создаёт единственный экземпляр `createBrowserRouter(routeConfig)`, а `app/app.tsx` подключает его через `RouterProvider`. Новые страницы добавляются в конфигурацию маршрутов.

Закрытые страницы обёрнуты в `AccessGuard`. `SessionProvider` получает аккаунт через `/api/v1/auth/me`; `useAuth` предоставляет состояние загрузки, вход, выход и повторную проверку. HttpOnly-cookie передаётся серверу браузером. Флаг в localStorage не используется; API независимо проверяет сессию и статус в БД.

`pages/auth` содержит вход и регистрацию на `/auth` и `/auth?mode=register`. После регистрации открывается форма входа. Параметр `next` возвращает пользователя в исходный раздел после входа. В шапке отображаются данные аккаунта и кнопка выхода. Админ-панель, RU/KZ-переводы, импорт Excel, загрузка изображений и AI остаются задачами следующих этапов.

## Форматирование

В `client`:

```powershell
npm run format
npm run format:check
npm run lint
npm run build
```

Prettier форматирует TS, TSX, CSS, JSON и Markdown; плагин Tailwind сортирует классы. Конфигурация хранится в `.prettierrc.json`. Длинные выражения и JSX раскладываются по строкам; длинные строки классов могут оставаться одной строкой по правилам Prettier.

В `api`, после установки `requirements-dev.txt`:

```powershell
python -m ruff format .
python -m ruff format --check .
python -m ruff check .
```

Ruff форматирует Python и проверяет импорты. Настройки лежат в `api/pyproject.toml`. В корне `.editorconfig` и `.vscode/settings.json` задают отступы, LF и форматирование при сохранении; установите рекомендованные расширения из `.vscode/extensions.json`.
