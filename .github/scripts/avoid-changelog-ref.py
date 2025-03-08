from pathlib import Path
import re
import sys

pattern = re.compile(r"#(\d+)")

for file in sys.argv[1:]:
    changelog = Path(file).resolve()

    changelog.write_text(
        pattern.sub(
            r"[#\1](https://redirect.github.com/bangumi/server-private/pull/\1)",
            changelog.read_text(encoding="utf-8"),
        ),
        encoding="utf-8",
    )
