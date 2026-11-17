# Фронтенд: FSD и Tailwind CSS

```text
src/
  app/                       сборка приложения, маршруты, глобальные стили
  pages/                     home, schedule, documents, applications, chat
  widgets/portal-layout/     общая оболочка и навигация
  features/access-guard/     доступ к закрытым разделам
  entities/                  типы урока, документа, приложения и сессии
  shared/                    API-клиент, общие UI-компоненты, конфигурация
```

Зависимости идут вниз: `app → pages → widgets → features → entities → shared`. Слайсы одного слоя не импортируют друг друга. Внешние импорты слайса идут через его `index.ts`/`index.tsx`. В `shared` сегменты (`api`, `ui`, `lib`, `config`) импортируются напрямую, без общего barrel-файла. Псевдоним `@/` указывает на `src/`.

Верстка использует Tailwind CSS через официальный Vite-плагин. Токены темы и базовые стили находятся в `app/styles/index.css`; стили компонентов задаются утилитами Tailwind. Не складывайте компоненты, загрузку данных и маршруты в один файл.

`app/app.tsx` связывает страницы с маршрутизатором. Закрытые страницы обёрнуты в `AccessGuard`; `entities/session` содержит точку подключения будущей авторизации. Сейчас сессия отсутствует и гость видит приглашение войти. API отдельно возвращает 401 для методов контента. Не заменяйте проверку сессии флагом в localStorage.

Базовые типы и экраны готовы к наполнению. Вход, админ-панель, RU/KZ-переводы, импорт Excel, загрузка изображений и интеграция AI остаются задачами следующих этапов.

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
