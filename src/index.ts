import { randomUUID } from "crypto";
import express, { Response } from "express";
import { Dice, Die, Game, Score } from "./domain";
import { pipe } from "fp-ts/lib/function";
import { either } from "fp-ts";

const app = express();
const port = 3000;

app.use(express.static("build"));

const scoreLabels: Record<Score.ScoreType | "bonus", string> = {
  ones: "Ones",
  twos: "Twos",
  threes: "Threes",
  fours: "Fours",
  fives: "Fives",
  sixes: "Sixes",
  threeOfAKind: "Three of a kind",
  fourOfAKind: "Four of a kind",
  fullHouse: "Full house",
  smallStraight: "Small straight",
  largeStraight: "Large straight",
  yams: "Yams",
  chance: "Chance",
  bonus: "Bonus (if more than 62)",
};

const buttonClass = "bg-lime-600 text-white rounded-md px-2 py-1";

const dieNumberToClass = (number: Die.DieNumber) => {
  switch (number) {
    case 1:
      return "one";
    case 2:
      return "two";
    case 3:
      return "three";
    case 4:
      return "four";
    case 5:
      return "five";
    case 6:
      return "six";
  }
};

const generateDieHtml = ({ die, index }: { die: Die.Die; index: number }) => `
    <div
      class="die ${dieNumberToClass(
        die.number
      )} text-4xl leading-6 w-6 flex justify-center ${
  die.selected ? "bg-black text-white" : "not-selected"
}"
      hx-put="/select/${index}"
      hx-swap="outerHTML"
    >
    </div>
  `;

const throwDiceButton = (label: string | null = "Throw dice") =>
  label
    ? `<button
        hx-put="/throw"
        hx-target="#dice"
        hx-swap="innerHTML settle:500ms"
        hx-indicator="#dice"
        class="${buttonClass}">
          ${label}
      </button>`
    : "";

const games: Record<string, Game.Game> = {};

const generateDiceHtml = (dice: Dice.Dice) =>
  `${dice.map((die, index) => generateDieHtml({ die, index })).join("")}`;

const generateScoreHtml = (game: Game.Game) => {
  const scoreTable = [
    ["ones", "threeOfAKind"],
    ["twos", "fourOfAKind"],
    ["threes", "fullHouse"],
    ["fours", "smallStraight"],
    ["fives", "largeStraight"],
    ["sixes", "yams"],
    ["bonus", "chance"],
  ] as const satisfies ReadonlyArray<
    readonly [Score.ScoreType | "bonus", Score.ScoreType]
  >;
  const commonCellClass = "p-1 border border-solid border-black";
  return `
  <div class="grid grid-cols-4">
    ${scoreTable
      .map(([scoreType1, scoreType2], index) => {
        const optionalTopBorder = index === 0 ? "" : "border-t-0";
        return `
          <div class="${commonCellClass} ${optionalTopBorder}">${
          scoreLabels[scoreType1]
        }</div>
          <div class="${commonCellClass} ${optionalTopBorder} border-l-0">${
          Game.getScoreForScoreType(scoreType1)(game) ?? ""
        }</div>
          <div class="${commonCellClass} ${optionalTopBorder} border-l-0">${
          scoreLabels[scoreType2]
        }</div>
          <div class="${commonCellClass} ${optionalTopBorder} border-l-0">${
          game.score[scoreType2] ?? ""
        }</div>
        `;
      })
      .join("")}
    </div>
  `;
};

app.get("/", (_, res) => {
  const uuid = randomUUID();
  const game = Game.create();
  games[uuid] = game;
  res.header("Content-Type", "text/html").send(`
    <!DOCTYPE html>
    <html>
      <head>
      <meta charset="utf-8">
        <title>Yams</title>
        <script src="https://unpkg.com/htmx.org/dist/htmx.js" ></script>
        <link rel="stylesheet" href="/style.css" />
      </head>
      <body class="flex flex-col gap-4 pt-24 items-center h-screen" hx-headers='{"game-uuid": "${uuid}"}'>
        <div
          hx-get="/score"
          hx-trigger="load, game-reset from:body, score-updated from:body"
          class="flex flex-col gap-2 items-center"
        >${generateScoreHtml(game)}</div>
        <div id="game" class="flex flex-col gap-6 items-center">
          <div id="dice" class="flex gap-2 bg-green-700 p-6 w-[205px] h-[73px]">
          </div>
          <div class="flex gap-2">
            <div
              class="h-8"
              hx-trigger="load, dice-thrown from:body, game-reset from:body, score-updated from:body"
              hx-get="/main-button"
            >${throwDiceButton()}</div>
            <button hx-post="/reset" hx-target="#dice" class="bg-red-400 text-white rounded-md px-2 py-1">
              Reset
            </button>
          </div>
        </div>
        <div
          hx-get="/score-options"
          hx-trigger="load, dice-thrown from:body, game-reset from:body, score-updated from:body"
          class="flex flex-col gap-2 items-center"
        ></div>
      </body>
    </html>
  `);
});

const getGameFromReq = (req: express.Request) => {
  const gameUuid = req.headers["game-uuid"];
  if (typeof gameUuid !== "string" || !(gameUuid in games)) {
    return { game: undefined, gameUuid: undefined };
  }
  return { game: games[gameUuid], gameUuid };
};

const errorToBadRequest = (response: Response) => (error: Error) => {
  response.status(400).send(`Bad request: ${error.message}`);
};

app.get("/main-button", (req, res) => {
  const { game } = getGameFromReq(req);
  if (game === undefined) {
    return res.status(400).send("Bad request: game not found");
  }
  if (!Game.isGameWithDice(game)) {
    return res.send(throwDiceButton());
  }

  const { round } = game;
  if (round === 3) {
    return res.send("");
  }
  return res.send(throwDiceButton("Throw not selected dice"));
});

app.post("/reset", (req, res) => {
  const { gameUuid } = getGameFromReq(req);
  if (gameUuid === undefined) {
    return res.status(400).send("Bad request: game not found");
  }
  games[gameUuid] = Game.create();
  res.header("hx-trigger", "game-reset").send("");
});

app.get("/score-options", (req, res) => {
  const { game } = getGameFromReq(req);
  if (game === undefined) {
    return res.status(400).send("Bad request: game not found");
  }
  if (!Game.isGameWithDice(game)) {
    return res.send("");
  }
  const scoreOptions = Game.getScoreOptions(game);
  res.send(`
    <div class="grid grid-cols-4 gap-2">
      ${scoreOptions
        .map(
          ({ score, scoreType }) =>
            `<button
              class="${
                score === 0 ? "bg-gray-500" : "bg-cyan-500"
              } text-white rounded-md px-2 py-1"
              hx-put="/score/${scoreType}"
              hx-target="#dice"
            >
              ${scoreLabels[scoreType]} (${score})
            </button>`
        )
        .join("")}
    </div>
  `);
});

app.put("/score/:scoreType", (req, res) => {
  const { game, gameUuid } = getGameFromReq(req);
  if (game === undefined) {
    return res.status(400).send("Bad request: game not found");
  }
  const { scoreType } = req.params;
  if (!Score.isScorableScoreType(scoreType)) {
    return res
      .status(400)
      .send("Bad request: given scoreType is not a valid one");
  }
  pipe(
    game,
    Game.addScoreForScoreType(scoreType),
    either.match(errorToBadRequest(res), (game) => {
      games[gameUuid] = game;
      res.header("hx-trigger", "score-updated").send("");
    })
  );
});

app.get("/score", (req, res) => {
  const { game } = getGameFromReq(req);
  if (game === undefined) {
    return res.status(400).send("Bad request: game not found");
  }
  res.send(generateScoreHtml(game));
});

app.put("/throw", (req, res) => {
  const { game, gameUuid } = getGameFromReq(req);
  if (game === undefined) {
    return res.status(400).send("Bad request: game not found");
  }
  pipe(
    game,
    Game.throwDice,
    either.match(errorToBadRequest(res), (game) => {
      games[gameUuid] = game;
      res
        .header("hx-trigger-after-settle", "dice-thrown")
        .send(generateDiceHtml(game.dice));
    })
  );
});

app.put("/select/:index", (req, res) => {
  const index = parseInt(req.params.index);
  if (isNaN(index) || !Dice.isDiceIndex(index)) {
    return res.status(400).send("Bad request");
  }
  const { game, gameUuid } = getGameFromReq(req);
  if (game === undefined) {
    return res.status(400).send("Bad request: game not found");
  }
  pipe(
    game,
    Game.toggleDieSelection(index),
    either.match(errorToBadRequest(res), (game) => {
      games[gameUuid] = game;
      res.send(generateDieHtml({ die: game.dice[index], index }));
    })
  );
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
