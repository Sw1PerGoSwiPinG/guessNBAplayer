# -*- coding: utf-8 -*-
import json
import re
import time
import unicodedata
from pathlib import Path

from deep_translator import GoogleTranslator

DATA_PATH = Path(__file__).resolve().parents[1] / "data" / "players.2025-26.json"
OVERRIDE_PATH = Path(__file__).resolve().parents[1] / "data" / "player-cn-overrides.json"

ASCII_PATTERN = re.compile(r"^[\x00-\x7F\s\.'\-]+$")


def needs_translation(name: str) -> bool:
    if not name:
        return True
    return ASCII_PATTERN.match(name) is not None


def normalize_en_name(value: str) -> str:
    s = unicodedata.normalize("NFD", value)
    s = "".join(ch for ch in s if unicodedata.category(ch) != "Mn")
    return re.sub(r"[^a-zA-Z0-9]+", "", s).lower()


def clean_zh_name(name: str) -> str:
    value = (name or "").strip()
    value = value.replace(" ", "")
    value = value.replace("· ", "·").replace(" ·", "·")
    value = value.replace("-", "·")
    value = re.sub(r"\.+", "·", value)
    value = re.sub(r"·+", "·", value)
    return value.strip("·")


def batch_translate(names: list[str], batch_size: int = 25) -> dict[str, str]:
    translator = GoogleTranslator(source="en", target="zh-CN")
    result: dict[str, str] = {}

    for i in range(0, len(names), batch_size):
        batch = names[i : i + batch_size]
        ok = False
        for retry in range(3):
            try:
                translated = translator.translate_batch(batch)
                for en, zh in zip(batch, translated):
                    result[en] = clean_zh_name(zh)
                ok = True
                break
            except Exception:
                time.sleep(0.8 * (retry + 1))
        if not ok:
            for en in batch:
                # fallback: keep english if translation fails
                result[en] = en
        time.sleep(0.15)
    return result


def main() -> None:
    players = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    overrides = json.loads(OVERRIDE_PATH.read_text(encoding="utf-8"))
    overrides_by_norm = {normalize_en_name(k): v for k, v in overrides.items()}

    # First pass: apply explicit overrides
    for p in players:
        ov = overrides_by_norm.get(normalize_en_name(p["enName"]))
        if ov and ov.get("zhName"):
            p["zhName"] = ov["zhName"].strip()

    to_translate = sorted({p["enName"] for p in players if needs_translation(p.get("zhName", ""))})
    translated = batch_translate(to_translate)

    changed = 0
    ascii_left = 0
    for p in players:
        en = p["enName"]
        ov = overrides_by_norm.get(normalize_en_name(en))
        if ov and ov.get("zhName"):
            target = ov["zhName"].strip()
        else:
            target = translated.get(en, p.get("zhName", en))
        target = clean_zh_name(target)
        if p.get("zhName") != target:
            changed += 1
        p["zhName"] = target

        if needs_translation(p["zhName"]):
            ascii_left += 1

    DATA_PATH.write_text(json.dumps(players, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"players={len(players)} changed={changed} ascii_left={ascii_left}")


if __name__ == "__main__":
    main()
