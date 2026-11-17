"""Schedule photo → structured JSON through a vision model (OpenAI-compatible API).

The model only transcribes the table. Every rule that turns the transcription into
concrete dates (week alternation, date ranges, overlaps) lives in schedule_import.py,
so the result is deterministic and is validated before anything is saved.
"""

import base64
import binascii
import json
import logging
from datetime import date
from functools import lru_cache

from openai import APIStatusError, OpenAI, RateLimitError
from pydantic import ValidationError
from pydantic_settings import BaseSettings, SettingsConfigDict

from app.schedule_schemas import ScheduleDraft

log = logging.getLogger(__name__)


class VisionSettings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", env_prefix="AI_")
    api_key: str = ""
    base_url: str = "https://api.openai.com/v1"
    vision_model: str = "gpt-6-luna"
    vision_reasoning_effort: str = "low"
    vision_max_tokens: int = 16000


vision_settings = VisionSettings()

MAX_IMAGE_BYTES = 8 * 1024 * 1024
_SIGNATURES = {
    b"\x89PNG\r\n\x1a\n": "image/png",
    b"\xff\xd8\xff": "image/jpeg",
}


class RecognitionError(Exception):
    """The image cannot be recognized; the message is safe to show to the user."""


class AIQuotaExceededError(RecognitionError):
    """The provider rejected the request because its quota or balance ran out."""


def decode_image(data_url: str) -> tuple[bytes, str]:
    """Accept a data URL or bare base64 and verify that it is a real PNG/JPEG/WebP."""
    payload = data_url.split(",", 1)[1] if data_url.startswith("data:") else data_url
    try:
        raw = base64.b64decode(payload, validate=True)
    except (binascii.Error, ValueError):
        raise RecognitionError("Файл повреждён или не является изображением") from None
    if len(raw) > MAX_IMAGE_BYTES:
        raise RecognitionError("Изображение больше 8 МБ")
    for signature, mime in _SIGNATURES.items():
        if raw.startswith(signature):
            return raw, mime
    if raw[:4] == b"RIFF" and raw[8:12] == b"WEBP":
        return raw, "image/webp"
    raise RecognitionError("Поддерживаются только PNG, JPEG и WebP")


PROMPT = """Ты распознаёшь фото или скриншот расписания колледжа в Казахстане.
Текст на русском и казахском (например «Дүйсенбі / Понедельник», «Кабинет»,
«Аудитория / Аудитория», «Тәжірибе жетекшісі»). Перепиши таблицу в JSON по схеме.
Ничего не выдумывай: если не уверен в слове, времени или номере, всё равно запиши
лучший вариант и добавь пояснение в warnings.

ФИО пиши буква в букву, сохраняя казахские буквы Ә ә, Ғ ғ, Қ қ, Ң ң, Ө ө, Ұ ұ, Ү ү,
Һ һ, І і — не заменяй их на русские (Тұрсынова Ә.Ғ., Жақыпбер Б.Қ., а не
Тұрсынова Э.Г., Жакыпбер Б.К.). Одна и та же фамилия во всей таблице пишется
одинаково.

note — короткая пометка с документа без пояснений (например «красн.: 05.10»,
«06.10», «2 пара», «1,2 пп (онл)»). warnings — только конкретные сомнения
одним коротким предложением с днём и номером пары; не пиши общих рассуждений.

Определи вид документа (kind):
- "weekly" — недельное расписание по дням недели без конкретных дат у каждой пары;
- "dated" — расписание по конкретным датам (например, расписание практики).

group — номер группы как в документе (например «ТИС-24Р»), иначе null.
title — заголовок: для weekly, например «6 учебных недель»; для dated — название
практики. weeks_count — сколько учебных недель указано в заголовке («6 учебных
недель» → 6), иначе null. start_date — дата начала этих недель, только если она
явно напечатана (например «с 10.10.2026»), в формате YYYY-MM-DD, иначе null;
не выводи её из дат внутри ячеек.

Правила для "weekly":
- weekday: 1 = понедельник … 6 = суббота (Дүйсенбі=1, Сейсенбі=2, Сәрсенбі=3,
  Бейсенбі=4, Жұма=5, Сенбі=6). date = null.
- pair — номер пары из колонки «№ сабақ», для мероприятий без номера
  (например «Кураторский час») — null.
- starts_at/ends_at — время ИМЕННО этой строки в формате HH:MM. Время в разные дни
  может отличаться (например, во вторник 10:00-11:20 вместо 09:30-10:50).
- subject — название предмета (верхняя строка ячейки), teacher — ФИО преподавателя
  (обычно строка под предметом), room — аудитория из колонки «Аудитория»
  («спорт зал» пиши как «Спортзал»). Если чего-то нет — пустая строка.
- Сокращение предмета (например «КС») раскрой, если полное название есть в этой же
  таблице («Компьютерные сети»).
- Пустые строки без предмета пропусти.
- День недели записан в объединённой ячейке слева и относится ко ВСЕМ строкам его
  блока, включая строки без номера пары (например «Кураторский час» 08:00-08:25 в
  блоке «Сейсенбі / Вторник» — это вторник, pair = null). Не пропускай такие строки.

ЧЕРЕДОВАНИЕ НЕДЕЛЬ (самое важное):
- Чёрный текст — нечётные недели (1, 3, 5 …): week = "odd".
- Красный текст — чётные недели (2, 4, 6 …): week = "even".
- Если в ячейке нет красного текста и она не разделена — week = "every".
- Ячейка, разделённая вертикальной линией на две части: левая часть — "odd",
  правая — "even". Аудитории в такой строке тоже бывают записаны двумя строками:
  первая относится к левой части, вторая — к правой.
- Если красным написаны дата и/или другой преподаватель внутри ячейки (например
  «Компьютерные сети 01.10 Жақыпбер Б.Қ.», где «01.10 Жақыпбер Б.Қ.» красное, а
  «Атибаев М.Т.» чёрное) — создай ДВЕ записи: "odd" с чёрным преподавателем и
  "even" с красным, предмет тот же. Красную дату запиши в note: «красн.: 01.10».
- Если красная часть — не преподаватель, а пометка (например «2 пара»), то вся пара
  проходит только в чётные недели: одна запись с week = "even", пометку запиши
  в note и добавь короткое предупреждение в warnings.
- Чёрные даты рядом с предметом (например «Основы сетевой безопасности 06.10»)
  не меняют недели — запиши их в note.

Правила для "dated":
- Одна запись на каждую строку с датой: date в формате YYYY-MM-DD, weekday = null,
  pair = null, week = "every".
- starts_at/ends_at — из колонки времени.
- subject — название практики/дисциплины из шапки, teacher — руководитель практики,
  room — кабинет из шапки, если в строке не указан другой.
- Дополнительные пометки строки (например «1,2 пп (онл)» — 1 и 2 пары онлайн)
  запиши в note. Количество часов запиши в note, только если оно важно.
- Итоговые строки («Барлығы/Итого», «Жалпы/Всего») не являются занятиями.

Сегодня {today}. Если в дате нет года, выбери ближайший подходящий год."""


_TEXT = {"type": "string"}
_NULLABLE_TEXT = {"type": ["string", "null"]}
_NULLABLE_INT = {"type": ["integer", "null"]}

RESPONSE_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": [
        "kind",
        "group",
        "title",
        "weeks_count",
        "start_date",
        "lessons",
        "warnings",
    ],
    "properties": {
        "kind": {"type": "string", "enum": ["weekly", "dated"]},
        "group": _NULLABLE_TEXT,
        "title": _NULLABLE_TEXT,
        "weeks_count": _NULLABLE_INT,
        "start_date": _NULLABLE_TEXT,
        "lessons": {
            "type": "array",
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": [
                    "weekday",
                    "date",
                    "pair",
                    "starts_at",
                    "ends_at",
                    "subject",
                    "teacher",
                    "room",
                    "week",
                    "note",
                ],
                "properties": {
                    "weekday": _NULLABLE_INT,
                    "date": _NULLABLE_TEXT,
                    "pair": _NULLABLE_INT,
                    "starts_at": _TEXT,
                    "ends_at": _TEXT,
                    "subject": _TEXT,
                    "teacher": _TEXT,
                    "room": _TEXT,
                    "week": {"type": "string", "enum": ["every", "odd", "even"]},
                    "note": _NULLABLE_TEXT,
                },
            },
        },
        "warnings": {"type": "array", "items": _TEXT},
    },
}


@lru_cache
def get_vision_client() -> OpenAI:
    return OpenAI(
        api_key=vision_settings.api_key,
        base_url=vision_settings.base_url,
        timeout=180,
        max_retries=1,
    )


def call_model(image: bytes, mime: str, today: date) -> str:
    """Send the image to the model and return its raw JSON text."""
    data_url = f"data:{mime};base64,{base64.b64encode(image).decode()}"
    response = get_vision_client().chat.completions.create(
        model=vision_settings.vision_model,
        messages=[
            {"role": "system", "content": PROMPT.format(today=today.isoformat())},
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "Распознай это расписание."},
                    {
                        "type": "image_url",
                        "image_url": {"url": data_url, "detail": "high"},
                    },
                ],
            },
        ],
        response_format={
            "type": "json_schema",
            "json_schema": {
                "name": "schedule",
                "strict": True,
                "schema": RESPONSE_SCHEMA,
            },
        },
        reasoning_effort=vision_settings.vision_reasoning_effort,
        max_completion_tokens=vision_settings.vision_max_tokens,
    )
    choice = response.choices[0]
    if choice.finish_reason == "length" or not choice.message.content:
        raise RecognitionError(
            "Модель не успела распознать таблицу целиком. Попробуйте обрезать фото."
        )
    if response.usage:
        log.info(
            "Schedule recognition: model=%s input=%s output=%s tokens",
            vision_settings.vision_model,
            response.usage.prompt_tokens,
            response.usage.completion_tokens,
        )
    return choice.message.content


def parse_model_output(raw: str) -> ScheduleDraft:
    try:
        return ScheduleDraft.model_validate(json.loads(raw))
    except (json.JSONDecodeError, ValidationError) as error:
        log.warning("Model returned invalid schedule JSON: %s", error)
        raise RecognitionError(
            "Не удалось разобрать ответ модели. Попробуйте более чёткое фото."
        ) from None


def recognize_schedule(image: bytes, mime: str, today: date) -> ScheduleDraft:
    try:
        raw = call_model(image, mime, today)
    except RecognitionError:
        raise
    except RateLimitError:
        log.warning("Schedule recognition quota or rate limit exceeded", exc_info=True)
        raise AIQuotaExceededError(
            "Закончились запросы на ИИ-модель. Пополните баланс или попробуйте позже."
        ) from None
    except APIStatusError as error:
        if error.status_code in (402, 429):
            log.warning(
                "Schedule recognition provider limit: status=%s",
                error.status_code,
                exc_info=True,
            )
            raise AIQuotaExceededError(
                "Закончились запросы на ИИ-модель. Пополните баланс или попробуйте позже."
            ) from None
        log.exception("Schedule recognition request failed")
        raise RecognitionError("ИИ-сервис недоступен. Попробуйте позже.") from None
    except Exception:
        log.exception("Schedule recognition request failed")
        raise RecognitionError("ИИ-сервис недоступен. Попробуйте позже.") from None
    return parse_model_output(raw)
