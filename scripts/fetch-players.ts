import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

interface BallDontLieTeam {
  abbreviation: string;
}

interface BallDontLiePlayer {
  id: number;
  first_name: string;
  last_name: string;
  country: string | null;
  height: string | null;
  jersey_number: string | null;
  position: string | null;
  draft_year: number | null;
  draft_number: number | null;
  team: BallDontLieTeam;
}

interface PlayerSeasonStats {
  pts: number;
  ast: number;
  reb: number;
  min: string;
}

function parseMinutes(min: string | null | undefined): number | null {
  if (!min) return null;
  const [m, s] = min.split(":").map((v) => Number(v));
  if (Number.isNaN(m)) return null;
  return Number((m + (Number.isNaN(s) ? 0 : s / 60)).toFixed(1));
}

async function main(): Promise<void> {
  const apiKey = process.env.BALLDONTLIE_API_KEY;
  if (!apiKey) {
    throw new Error("Missing BALLDONTLIE_API_KEY env var.");
  }

  const headers = {
    Authorization: apiKey,
  };

  const season = "2025";
  const playersResp = await fetch(`https://api.balldontlie.io/v1/players?per_page=100`, { headers });
  const playersJson = (await playersResp.json()) as { data: BallDontLiePlayer[] };

  const output = [];

  for (const player of playersJson.data) {
    const statsResp = await fetch(
      `https://api.balldontlie.io/v1/season_averages?season=${season}&player_ids[]=${player.id}`,
      { headers },
    );
    const statsJson = (await statsResp.json()) as { data: PlayerSeasonStats[] };
    const stat = statsJson.data[0];
    if (!stat || parseMinutes(stat.min) === null) continue;

    output.push({
      playerId: String(player.id),
      enName: `${player.first_name} ${player.last_name}`.trim(),
      zhName: `${player.first_name} ${player.last_name}`.trim(),
      aliases: [],
      team: player.team.abbreviation,
      jersey: player.jersey_number ?? "",
      position: player.position ?? "",
      heightCm: null,
      country: player.country ?? "Unknown",
      draftYear: player.draft_year,
      draftPick: player.draft_number,
      careerYears: null,
      ppg: Number(stat.pts.toFixed(1)),
      apg: Number(stat.ast.toFixed(1)),
      rpg: Number(stat.reb.toFixed(1)),
      playoffAppearances: null,
      mpg: parseMinutes(stat.min),
      activeInSeason: "2025-26",
    });
  }

  await mkdir(join(process.cwd(), "data"), { recursive: true });
  await writeFile(join(process.cwd(), "data", "players.2025-26.generated.json"), JSON.stringify(output, null, 2), "utf-8");
  console.log(`Generated ${output.length} players to data/players.2025-26.generated.json`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

