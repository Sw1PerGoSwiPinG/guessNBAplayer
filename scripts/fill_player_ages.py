# -*- coding: utf-8 -*-
import json
import os
import time
from datetime import date, datetime
from pathlib import Path

from nba_api.stats.endpoints import commonplayerinfo

DATA_PATH = Path(__file__).resolve().parents[1] / "data" / "players.2025-26.json"
CACHE_PATH = Path(__file__).resolve().parents[1] / "data" / "player-age-cache.2025-26.json"
REF_DATE = date(2026, 4, 15)
USE_NETWORK = os.getenv("NBA_AGE_NETWORK", "0") == "1"


def calc_age(birth: date, ref: date) -> int:
    years = ref.year - birth.year
    if (ref.month, ref.day) < (birth.month, birth.day):
        years -= 1
    return years


def parse_birthdate(raw: str) -> date | None:
    if not raw:
        return None
    try:
        return datetime.fromisoformat(raw.replace("Z", "")).date()
    except Exception:  # noqa: BLE001
        return None


def load_cache() -> dict[str, int]:
    if not CACHE_PATH.exists():
        return {}
    try:
        return json.loads(CACHE_PATH.read_text(encoding="utf-8"))
    except Exception:  # noqa: BLE001
        return {}


def fetch_age(player_id: str) -> int | None:
    if not USE_NETWORK:
        return None
    for i in range(3):
        try:
            data = commonplayerinfo.CommonPlayerInfo(player_id=int(player_id)).get_dict()
            rs = data["resultSets"][0]
            if not rs["rowSet"]:
                return None
            headers = rs["headers"]
            row = {headers[idx]: rs["rowSet"][0][idx] for idx in range(len(headers))}
            birth = parse_birthdate(str(row.get("BIRTHDATE") or ""))
            if birth is None:
                return None
            return calc_age(birth, REF_DATE)
        except Exception:  # noqa: BLE001
            time.sleep(0.8 * (i + 1))
    return None


def infer_age_from_local(player: dict) -> int | None:
    draft_year = player.get("draftYear")
    if isinstance(draft_year, int) and draft_year > 1900:
        # Typical rookie age baseline for NBA draftees.
        return max(18, REF_DATE.year - draft_year + 19)

    career_years = player.get("careerYears")
    if isinstance(career_years, int) and career_years > 0:
        # Undrafted/unknown draft year fallback.
        return max(18, career_years + 18)

    return None


def main() -> None:
    players = json.loads(DATA_PATH.read_text(encoding="utf-8"))
    cache = load_cache()

    missing_before = sum(1 for p in players if p.get("age") is None)
    updated = 0

    for idx, p in enumerate(players):
        pid = str(p["playerId"])

        if pid in cache:
            p["age"] = cache[pid]
        elif p.get("age") is None:
            age = infer_age_from_local(p)
            if age is None:
                age = fetch_age(pid)
            if age is not None:
                cache[pid] = age
                p["age"] = age

        # 移除旧字段，避免前后端语义混淆
        if "careerYears" in p:
            p.pop("careerYears", None)

        if p.get("age") is not None:
            updated += 1

        if idx % 25 == 0:
            time.sleep(0.1)

    missing_after = sum(1 for p in players if p.get("age") is None)

    DATA_PATH.write_text(json.dumps(players, ensure_ascii=False, indent=2), encoding="utf-8")
    CACHE_PATH.write_text(json.dumps(cache, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"players={len(players)} missing_before={missing_before} missing_after={missing_after} age_filled={updated}")
    if not USE_NETWORK:
        print("age_mode=fast_local_inference (set NBA_AGE_NETWORK=1 to enable online exact backfill)")


if __name__ == "__main__":
    main()
