# NBA 猜球员（Guess NBA Player）

一个基于 Next.js 的 NBA 猜球员网页应用，玩法类似 Blast 的猜选手小游戏。

## 功能概览

- 系统从 2025-26 常规赛球员池随机选 1 人
- 玩家最多 8 回合输入球员姓名（支持中英文与别名）
- 每次猜测返回多维反馈：正确 / 很接近 / 接近 / 差距大 + 数值方向箭头
- 三档难度：
  - Easy：`mpg >= 25`
  - Normal：`mpg >= 20`
  - Hard：`mpg >= 15`
- 本地战绩统计（胜率、连胜）

## 技术栈

- Next.js 16（App Router）
- TypeScript
- Tailwind CSS v4
- Zod
- Vitest + Playwright

## 快速启动

```bash
npm install
npm run dev
```

浏览器打开：[http://localhost:3000](http://localhost:3000)

## 常用命令

```bash
npm run lint
npm run test
npm run build
npm run test:e2e
```

说明：首次运行 E2E 需要先安装浏览器。

```bash
npx playwright install
```

## 数据与赛季策略

- 当前激活赛季：`2025-26`（见 `data/seasons.json`）
- 游戏数据：`data/players.2025-26.json`
- 规则：永远使用“最近一个已经完整结束常规赛”的赛季快照

## ETL（全量抓取）

已提供基于 NBA 官方统计接口的全量 ETL：

```bash
npm run etl:players
```

该命令会重新生成：

- `data/players.2025-26.json`

并抓取字段：

- `playerId, enName, zhName, aliases, team, jersey, position, heightCm, country`
- `draftYear, draftPick, careerYears, ppg, apg, rpg, playoffAppearances, mpg`

## 数据质量校验

```bash
npm run data:check
```

会输出：

- 总球员数
- 各难度球员池数量
- 重复 playerId / 重复姓名
- 关键字段缺失统计

## 环境变量

参考 `.env.example`：

- `GAME_SESSION_SECRET`：用于会话签名，生产环境必须修改
