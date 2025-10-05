from pathlib import Path

import yaml
import msgspec

__common_path = Path(__file__, "../../").resolve()


class Platform(msgspec.Struct):
    id: int
    type: str
    type_cn: str
    wiki_tpl: str = ""
    sort_keys: tuple[str, ...] = ()


class PlatformDefault(msgspec.Struct):
    wiki_tpl: str
    sort_keys: tuple[str, ...]


__subject_platforms = yaml.safe_load(
    __common_path.joinpath("subject_platforms.yml").read_bytes()
)

WIKI_TEMPLATES: dict[str, str] = msgspec.convert(
    yaml.safe_load(__common_path.joinpath("wiki_template.yml").read_bytes()),
    dict[str, str],
)

PLATFORM_DEFAULT: dict[int, PlatformDefault] = msgspec.convert(
    __subject_platforms["defaults"],
    type=dict[int, PlatformDefault],
)


PLATFORM_CONFIG: dict[int, dict[int, Platform]] = msgspec.convert(
    {
        key: value
        for key, value in __subject_platforms["platforms"].items()
        if isinstance(key, int)
    },
    type=dict[int, dict[int, Platform]],
)
