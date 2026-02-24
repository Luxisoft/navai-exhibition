from __future__ import annotations

import json
import re
import time
from pathlib import Path

from deep_translator import GoogleTranslator

ROOT = Path(__file__).resolve().parents[1]
SRC_DIR = ROOT / "src" / "content" / "navai-readmes"
JSON_PATH = SRC_DIR / "localized-markdown.json"

SLUG_TO_FILE = {
    "home": "root.md",
    "installation-api": "installation-api.md",
    "installation-web": "installation-web.md",
    "installation-mobile": "installation-mobile.md",
    "playground-api": "playground-api.md",
    "playground-web": "playground-web.md",
    "playground-mobile": "playground-mobile.md",
    "voice-backend": "voice-backend.md",
    "voice-frontend": "voice-frontend.md",
    "voice-mobile": "voice-mobile.md",
}

LANG_TARGETS = {
    "es": "es",
    "fr": "fr",
    "pt": "pt",
    "zh": "zh-CN",
    "ja": "ja",
    "ru": "ru",
    "ko": "ko",
    "hi": "hi",
}

CODE_FENCE_RE = re.compile(r"(```[\s\S]*?```)", re.MULTILINE)

# Keep technical constructs intact while translating prose.
TOKEN_PATTERNS = [
    re.compile(r"`[^`\n]+`"),
    re.compile(r"!\[[^\]\n]*\]\([^\)\n]+\)"),
    re.compile(r"\[[^\]\n]*\]\([^\)\n]+\)"),
    re.compile(r"https?://[^\s)]+"),
    re.compile(r"</?[^>\n]+>"),
    re.compile(r"@[A-Za-z0-9_-]+/[A-Za-z0-9_.-]+"),
]


def mask_text(text: str) -> tuple[str, list[str]]:
    tokens: list[str] = []

    def repl(match: re.Match[str]) -> str:
        idx = len(tokens)
        tokens.append(match.group(0))
        return f"@@@{idx}@@@"

    masked = text
    for pattern in TOKEN_PATTERNS:
        masked = pattern.sub(repl, masked)
    return masked, tokens


def unmask_text(text: str, tokens: list[str]) -> str:
    def repl(match: re.Match[str]) -> str:
        idx = int(match.group(1))
        if 0 <= idx < len(tokens):
            return tokens[idx]
        return match.group(0)

    return re.sub(r"@@@\s*(\d+)\s*@@@", repl, text)


def split_masked(masked: str, max_len: int = 4200) -> list[str]:
    if len(masked) <= max_len:
        return [masked]

    pieces: list[str] = []
    start = 0
    while start < len(masked):
        end = min(start + max_len, len(masked))
        if end < len(masked):
            cut = masked.rfind("\n\n", start, end)
            if cut == -1:
                cut = masked.rfind("\n", start, end)
            if cut != -1 and cut > start + 800:
                end = cut
        pieces.append(masked[start:end])
        start = end
    return pieces


def translate_piece(piece: str, translator: GoogleTranslator) -> str:
    for attempt in range(5):
        try:
            translated = translator.translate(piece)
            if translated is None:
                raise RuntimeError("translator returned None")
            return translated
        except Exception:
            if attempt == 4:
                return piece
            time.sleep(1.2 * (attempt + 1))
    return piece


def translate_text(text: str, target_lang_code: str) -> str:
    if not text.strip():
        return text

    translator = GoogleTranslator(source="auto", target=target_lang_code)
    masked, tokens = mask_text(text)
    chunks = split_masked(masked)
    translated_chunks = [translate_piece(chunk, translator) for chunk in chunks]
    translated = "".join(translated_chunks)
    return unmask_text(translated, tokens)


def translate_markdown(markdown: str, target_lang_code: str) -> str:
    parts = CODE_FENCE_RE.split(markdown)
    output: list[str] = []
    for part in parts:
        if part.startswith("```"):
            output.append(part)
        else:
            output.append(translate_text(part, target_lang_code))
    return "".join(output)


def main() -> None:
    localized: dict[str, dict[str, str]] = {}

    for slug, file_name in SLUG_TO_FILE.items():
        source_markdown = (SRC_DIR / file_name).read_text(encoding="utf-8")
        localized[slug] = {}
        print(f"\n=== {slug} ===")

        for lang, target_code in LANG_TARGETS.items():
            print(f"  translating -> {lang} ...", end="")
            translated = translate_markdown(source_markdown, target_code)
            localized[slug][lang] = translated
            print(f" done ({len(translated)} chars)")

    JSON_PATH.write_text(
        json.dumps(localized, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print("\nlocalized-markdown.json regenerated successfully.")


if __name__ == "__main__":
    main()
