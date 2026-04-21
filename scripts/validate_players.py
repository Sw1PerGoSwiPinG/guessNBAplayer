# -*- coding: utf-8 -*-
import json
from collections import Counter
from pathlib import Path

PATH = Path(__file__).resolve().parents[1] / "data" / "players.2025-26.json"


def main() -> None:
    players = json.loads(PATH.read_text(encoding="utf-8"))

    ids = [p["playerId"] for p in players]
    names = [p["enName"] for p in players]

    dup_ids = [k for k, v in Counter(ids).items() if v > 1]
    dup_names = [k for k, v in Counter(names).items() if v > 1]

    missing_team = sum(1 for p in players if not p.get("team"))
    missing_country = sum(1 for p in players if not p.get("country"))
    missing_age = sum(1 for p in players if p.get("age") is None)
    missing_height = sum(1 for p in players if p.get("heightCm") is None)
    missing_draft = sum(1 for p in players if p.get("draftYear") is None)
    missing_games = sum(1 for p in players if p.get("gamesPlayed") is None)

    easy = sum(1 for p in players if (p.get("mpg") or 0) >= 25 and (p.get("gamesPlayed") or 0) >= 20)
    normal = sum(1 for p in players if (p.get("mpg") or 0) >= 20 and (p.get("gamesPlayed") or 0) >= 15)
    hard = sum(1 for p in players if (p.get("mpg") or 0) >= 15 and (p.get("gamesPlayed") or 0) >= 10)

    print(f"players={len(players)}")
    print(f"easy={easy} normal={normal} hard={hard}")
    print(f"duplicate_ids={len(dup_ids)} duplicate_names={len(dup_names)}")
    print(
        f"missing_team={missing_team} missing_country={missing_country} missing_age={missing_age} "
        f"missing_height={missing_height} missing_draft_year={missing_draft} missing_games_played={missing_games}"
    )

    if dup_ids:
        raise SystemExit(f"Duplicate playerId found: {dup_ids[:10]}")


if __name__ == "__main__":
    main()
