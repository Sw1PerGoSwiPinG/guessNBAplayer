# -*- coding: utf-8 -*-
import json
import math
import re
import time
import unicodedata
from collections import defaultdict
from pathlib import Path
from typing import Any

from nba_api.stats.endpoints import leaguedashplayerstats, playerindex

ACTIVE_SEASON = "2025-26"
SEASON_START_YEAR = 2025
DATA_DIR = Path(__file__).resolve().parents[1] / "data"
OUTPUT_PATH = DATA_DIR / "players.2025-26.json"
OVERRIDES_PATH = DATA_DIR / "player-cn-overrides.json"
CN_OVERRIDES: dict[str, dict[str, Any]] = json.loads(OVERRIDES_PATH.read_text(encoding="utf-8"))


def normalize_en_name(value: str) -> str:
    s = unicodedata.normalize("NFD", value)
    s = "".join(ch for ch in s if unicodedata.category(ch) != "Mn")
    return re.sub(r"[^a-zA-Z0-9]+", "", s).lower()


CN_OVERRIDE_BY_NORM: dict[str, dict[str, Any]] = {normalize_en_name(k): v for k, v in CN_OVERRIDES.items()}


def retry_call(func, retries: int = 4, sleep_seconds: float = 1.2):
    last_error: Exception | None = None
    for i in range(retries):
        try:
            return func()
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            if i < retries - 1:
                time.sleep(sleep_seconds * (i + 1))
    raise RuntimeError(f"API call failed after retries: {last_error}")


def to_dict(headers: list[str], row: list[Any]) -> dict[str, Any]:
    return {headers[i]: row[i] for i in range(len(headers))}


def season_label(start_year: int) -> str:
    return f"{start_year}-{(start_year + 1) % 100:02d}"


def parse_height_to_cm(height: str | None) -> int | None:
    if not height:
        return None
    m = re.match(r"^(\d+)-(\d+)$", str(height).strip())
    if not m:
        return None
    feet = int(m.group(1))
    inches = int(m.group(2))
    total_inches = feet * 12 + inches
    return round(total_inches * 2.54)


def clean_int(value: Any) -> int | None:
    if value in (None, "", "Undrafted", "undrafted"):
        return None
    try:
        v = int(value)
        if v <= 0:
            return None
        return v
    except Exception:  # noqa: BLE001
        return None


def clean_float(value: Any, digits: int = 1) -> float | None:
    try:
        v = float(value)
    except Exception:  # noqa: BLE001
        return None
    if math.isnan(v):
        return None
    return round(v, digits)


def make_aliases(en_name: str, zh_name: str) -> list[str]:
    aliases = set()
    aliases.add(en_name.lower())
    normalized = re.sub(r"[^a-z0-9\s]", "", en_name.lower()).strip()
    if normalized:
        aliases.add(normalized)
    parts = [p for p in re.split(r"\s+", en_name.lower()) if p]
    for p in parts:
        aliases.add(p)
    if zh_name and zh_name != en_name:
        aliases.add(zh_name)
    for extra in CN_OVERRIDE_BY_NORM.get(normalize_en_name(en_name), {}).get("aliases", []):
        aliases.add(extra)
    return sorted(a for a in aliases if a)


def fetch_regular_stats() -> dict[int, dict[str, Any]]:
    data = retry_call(
        lambda: leaguedashplayerstats.LeagueDashPlayerStats(
            season=ACTIVE_SEASON,
            season_type_all_star="Regular Season",
            per_mode_detailed="PerGame",
            measure_type_detailed_defense="Base",
        ).get_dict()
    )
    result = data["resultSets"][0]
    headers = result["headers"]

    out: dict[int, dict[str, Any]] = {}
    for row in result["rowSet"]:
        item = to_dict(headers, row)
        player_id = int(item["PLAYER_ID"])
        gp = int(item.get("GP") or 0)
        mpg = clean_float(item.get("MIN"))
        if gp <= 0 or mpg is None or mpg <= 0:
            continue
        out[player_id] = {
            "playerId": str(player_id),
            "enName": str(item.get("PLAYER_NAME") or "").strip(),
            "team": str(item.get("TEAM_ABBREVIATION") or "").strip(),
            "gamesPlayed": gp,
            "ppg": clean_float(item.get("PTS")),
            "apg": clean_float(item.get("AST")),
            "rpg": clean_float(item.get("REB")),
            "mpg": mpg,
        }
    return out


def fetch_player_index() -> dict[int, dict[str, Any]]:
    data = retry_call(lambda: playerindex.PlayerIndex(season=ACTIVE_SEASON).get_dict())
    result = data["resultSets"][0]
    headers = result["headers"]
    out: dict[int, dict[str, Any]] = {}

    for row in result["rowSet"]:
        item = to_dict(headers, row)
        player_id = int(item["PERSON_ID"])
        out[player_id] = {
            "jersey": str(item.get("JERSEY_NUMBER") or "").strip(),
            "position": str(item.get("POSITION") or "").strip(),
            "heightCm": parse_height_to_cm(str(item.get("HEIGHT") or "")),
            "country": str(item.get("COUNTRY") or "Unknown").strip() or "Unknown",
            "draftYear": clean_int(item.get("DRAFT_YEAR")),
            "draftPick": clean_int(item.get("DRAFT_NUMBER")),
            "fromYear": clean_int(item.get("FROM_YEAR")),
            "team": str(item.get("TEAM_ABBREVIATION") or "").strip(),
        }
    return out


def fetch_playoff_appearance_counts(start_year: int = 1996, end_year: int = SEASON_START_YEAR) -> dict[int, int]:
    counts: defaultdict[int, int] = defaultdict(int)
    for year in range(start_year, end_year + 1):
        label = season_label(year)
        data = retry_call(
            lambda: leaguedashplayerstats.LeagueDashPlayerStats(
                season=label,
                season_type_all_star="Playoffs",
                per_mode_detailed="PerGame",
                measure_type_detailed_defense="Base",
            ).get_dict(),
            retries=3,
            sleep_seconds=0.9,
        )
        result = data["resultSets"][0]
        headers = result["headers"]
        seen: set[int] = set()
        for row in result["rowSet"]:
            item = to_dict(headers, row)
            pid = int(item["PLAYER_ID"])
            gp = int(item.get("GP") or 0)
            if gp > 0 and pid not in seen:
                seen.add(pid)
                counts[pid] += 1
        time.sleep(0.15)
    return dict(counts)


def build_dataset() -> list[dict[str, Any]]:
    regular_stats = fetch_regular_stats()
    index_map = fetch_player_index()
    playoff_counts = fetch_playoff_appearance_counts()

    players: list[dict[str, Any]] = []
    for pid, stat in regular_stats.items():
        profile = index_map.get(pid, {})
        en_name = stat["enName"]
        zh_name = CN_OVERRIDE_BY_NORM.get(normalize_en_name(en_name), {}).get("zhName", en_name)
        team = stat.get("team") or profile.get("team") or "UNK"

        players.append(
            {
                "playerId": stat["playerId"],
                "enName": en_name,
                "zhName": zh_name,
                "aliases": make_aliases(en_name, zh_name),
                "team": team,
                "jersey": profile.get("jersey") or "",
                "position": profile.get("position") or "",
                "heightCm": profile.get("heightCm"),
                "country": profile.get("country") or "Unknown",
                "draftYear": profile.get("draftYear"),
                "draftPick": profile.get("draftPick"),
                "age": None,
                "ppg": stat.get("ppg"),
                "apg": stat.get("apg"),
                "rpg": stat.get("rpg"),
                "playoffAppearances": playoff_counts.get(pid, 0),
                "mpg": stat.get("mpg"),
                "gamesPlayed": stat.get("gamesPlayed"),
                "activeInSeason": ACTIVE_SEASON,
            }
        )

    players.sort(key=lambda p: p["enName"])
    return players


def main() -> None:
    players = build_dataset()
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(players, ensure_ascii=False, indent=2), encoding="utf-8")

    easy = sum(1 for p in players if (p.get("mpg") or 0) >= 25 and (p.get("gamesPlayed") or 0) >= 20)
    normal = sum(1 for p in players if (p.get("mpg") or 0) >= 20 and (p.get("gamesPlayed") or 0) >= 15)
    hard = sum(1 for p in players if (p.get("mpg") or 0) >= 15 and (p.get("gamesPlayed") or 0) >= 10)

    print(f"Wrote {len(players)} players to {OUTPUT_PATH}")
    print(f"Pools -> easy:{easy} normal:{normal} hard:{hard}")


if __name__ == "__main__":
    main()
