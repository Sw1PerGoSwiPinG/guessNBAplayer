# -*- coding: utf-8 -*-
import json
from pathlib import Path

PATH = Path(__file__).resolve().parents[1] / "data" / "players.2025-26.json"


def main() -> None:
    players = json.loads(PATH.read_text(encoding="utf-8"))

    easy = sum(1 for p in players if (p.get("mpg") or 0) >= 25 and (p.get("gamesPlayed") or 0) >= 20)
    normal = sum(1 for p in players if (p.get("mpg") or 0) >= 20 and (p.get("gamesPlayed") or 0) >= 15)
    hard = sum(1 for p in players if (p.get("mpg") or 0) >= 15 and (p.get("gamesPlayed") or 0) >= 10)

    print(f"total_players={len(players)}")
    print(f"easy_pool={easy}")
    print(f"normal_pool={normal}")
    print(f"hard_pool={hard}")


if __name__ == "__main__":
    main()
