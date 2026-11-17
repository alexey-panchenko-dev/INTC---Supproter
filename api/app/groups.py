"""Canonical group names: «тис-24p», «ТИС 24Р» and «ТИС-24Р» are the same group."""

import re

# Latin letters that look like Cyrillic ones. Students often type them by mistake,
# and the recognition model may return either variant.
_LATIN_TO_CYRILLIC = str.maketrans("ABCEHKMOPTXY", "АВСЕНКМОРТХУ")
_CYRILLIC = re.compile(r"[А-ЯЁӘҒҚҢӨҰҮҺІ]")


def normalize_group(value: str) -> str:
    group = re.sub(r"\s*-\s*|\s+", "-", value.strip().upper())
    if _CYRILLIC.search(group):
        group = group.translate(_LATIN_TO_CYRILLIC)
    return group
