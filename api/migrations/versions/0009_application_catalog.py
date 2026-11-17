"""Bilingual application cards and initial educational catalog."""

import sqlalchemy as sa
from alembic import op

revision = "0009"
down_revision = "0008"
branch_labels = None
depends_on = None

# Download pages and licensing checked against the publishers on 2026-11-17.
CATALOG = [
    (
        "Visual Studio Code",
        "Программирование",
        "Бағдарламалау",
        "Бесплатный редактор кода с расширениями, встроенным терминалом и отладчиком. Подходит для веб-разработки и изучения языков программирования.",
        "Кеңейтімдері, кіріктірілген терминалы және жөндегіші бар тегін код редакторы. Веб-әзірлеуге және бағдарламалау тілдерін үйренуге ыңғайлы.",
        "https://code.visualstudio.com/Download",
        "vscode.png",
        "free",
    ),
    (
        "Zed",
        "Программирование",
        "Бағдарламалау",
        "Быстрый редактор кода для индивидуальной и совместной работы. Сам редактор бесплатный; встроенные облачные ИИ-возможности доступны на платных тарифах.",
        "Жеке және бірлесіп жұмыс істеуге арналған жылдам код редакторы. Редактор тегін; кіріктірілген бұлттық ЖИ мүмкіндіктері ақылы тарифтерде қолжетімді.",
        "https://zed.dev/download",
        "zed.png",
        "freemium",
    ),
    (
        "PyCharm",
        "Python-разработка",
        "Python әзірлеу",
        "Среда разработки Python с подсказками, отладкой и инструментами для проектов. Основные функции бесплатны, расширенные возможности доступны в Pro.",
        "Кодты толықтыру, жөндеу және жобалармен жұмыс істеу құралдары бар Python әзірлеу ортасы. Негізгі функциялар тегін, кеңейтілген мүмкіндіктер Pro нұсқасында қолжетімді.",
        "https://www.jetbrains.com/pycharm/download/",
        "pycharm.png",
        "freemium",
    ),
    (
        "Oracle VirtualBox",
        "Операционные системы",
        "Операциялық жүйелер",
        "Запускай другие операционные системы в виртуальных машинах для лабораторных работ. Базовый пакет бесплатный; у дополнительного Extension Pack отдельные условия лицензии.",
        "Зертханалық жұмыстар үшін виртуалды машиналарда басқа операциялық жүйелерді іске қос. Негізгі пакет тегін; қосымша Extension Pack үшін бөлек лицензиялық шарттар қолданылады.",
        "https://www.virtualbox.org/wiki/Downloads",
        "virtualbox.png",
        "free",
    ),
    (
        "Git",
        "Контроль версий",
        "Нұсқаларды басқару",
        "Бесплатная система контроля версий: сохраняй историю изменений, работай с ветками и объединяй код командных проектов.",
        "Нұсқаларды басқарудың тегін жүйесі: өзгерістер тарихын сақта, тармақтармен жұмыс істе және командалық жобалардың кодын біріктір.",
        "https://git-scm.com/downloads",
        "git.png",
        "free",
    ),
    (
        "Python",
        "Программирование",
        "Бағдарламалау",
        "Язык программирования и интерпретатор для учебных задач, автоматизации и работы с данными. Бесплатный, с большой экосистемой библиотек.",
        "Оқу тапсырмаларына, автоматтандыруға және деректермен жұмыс істеуге арналған бағдарламалау тілі мен интерпретатор. Тегін, кітапханалар экожүйесі кең.",
        "https://www.python.org/downloads/",
        "python.png",
        "free",
    ),
    (
        "DBeaver Community",
        "Базы данных",
        "Дерекқорлар",
        "Бесплатный клиент для PostgreSQL, MySQL, SQLite и других баз данных. Позволяет писать SQL-запросы, просматривать таблицы и изучать структуру данных.",
        "PostgreSQL, MySQL, SQLite және басқа дерекқорларға арналған тегін клиент. SQL сұрауларын жазуға, кестелерді көруге және деректер құрылымын зерттеуге мүмкіндік береді.",
        "https://dbeaver.io/download/",
        "dbeaver.png",
        "free",
    ),
    (
        "Blender",
        "3D и графика",
        "3D және графика",
        "Бесплатный пакет для 3D-моделирования, анимации и рендеринга. Подходит для учебных проектов по компьютерной графике.",
        "3D модельдеу, анимация және рендерингке арналған тегін бағдарлама. Компьютерлік графика бойынша оқу жобаларына ыңғайлы.",
        "https://www.blender.org/download/",
        "blender.png",
        "free",
    ),
]


def upgrade():
    connection = op.get_bind()
    inspector = sa.inspect(connection)
    # Both branches originally used revision 0003 for different changes. A database
    # upgraded on plugins already has catalog columns, but skipped document files.
    # Reconcile that case without rewriting its version stamp or touching records.
    document_columns = {column["name"] for column in inspector.get_columns("documents")}
    for column in (
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("file_name", sa.String(250)),
        sa.Column("file_data", sa.LargeBinary()),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
    ):
        if column.name not in document_columns:
            op.add_column("documents", column)
            if column.name in {"description", "sort_order"}:
                op.alter_column("documents", column.name, server_default=None)

    application_columns = {
        column["name"] for column in inspector.get_columns("applications")
    }
    catalog_already_installed = "logo_url" in application_columns
    for column in (
        sa.Column("description_kk", sa.Text(), nullable=False, server_default=""),
        sa.Column("subject_kk", sa.String(200), nullable=False, server_default=""),
        sa.Column("logo_url", sa.Text(), nullable=False, server_default=""),
        sa.Column("pricing", sa.String(20), nullable=False, server_default="free"),
    ):
        if column.name not in application_columns:
            op.add_column("applications", column)
    if "application_pricing" not in {
        constraint["name"]
        for constraint in inspector.get_check_constraints("applications")
    }:
        op.create_check_constraint(
            "application_pricing",
            "applications",
            "pricing IN ('free', 'freemium', 'paid')",
        )
    # Preserve user edits and deletions in an already populated plugins catalog.
    if catalog_already_installed:
        return
    table = sa.table(
        "applications",
        *[
            sa.column(name)
            for name in (
                "name",
                "subject",
                "subject_kk",
                "description",
                "description_kk",
                "url",
                "logo_url",
                "pricing",
            )
        ],
    )
    existing = set(connection.execute(sa.select(table.c.name)).scalars())
    for (
        name,
        subject,
        subject_kk,
        description,
        description_kk,
        url,
        logo,
        pricing,
    ) in CATALOG:
        if name not in existing:
            connection.execute(
                table.insert().values(
                    name=name,
                    subject=subject,
                    subject_kk=subject_kk,
                    description=description,
                    description_kk=description_kk,
                    url=url,
                    logo_url=f"/logos/{logo}",
                    pricing=pricing,
                )
            )


def downgrade():
    # Keep catalog records and their original RU content on schema rollback.
    op.drop_constraint("application_pricing", "applications", type_="check")
    for column in ("pricing", "logo_url", "subject_kk", "description_kk"):
        op.drop_column("applications", column)
