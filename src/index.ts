import { randomUUID } from "crypto";
import express from "express";

const app = express();
const port = 3000;

app.use(express.static("build"));

const dieNumbers = [1, 2, 3, 4, 5, 6] as const;
type DieNumber = (typeof dieNumbers)[number];
const gameRounds = [1, 2, 3];
type GameRound = (typeof gameRounds)[number];
type Die = { number: DieNumber; selected: boolean };
type Dice = [Die, Die, Die, Die, Die];
type Game = { dice: Dice; round: GameRound };

const isIndex = (index: number): index is 0 | 1 | 2 | 3 | 4 =>
  [0, 1, 2, 3, 4].includes(index);

const isGameRound = (round: number): round is GameRound =>
  gameRounds.includes(round);

const initiateDie = (): Die => ({
  number: dieNumbers[Math.floor(Math.random() * dieNumbers.length)]!,
  selected: false,
});

const createGame = (): Game => ({
  dice: [
    initiateDie(),
    initiateDie(),
    initiateDie(),
    initiateDie(),
    initiateDie(),
  ],
  round: 1,
});

const throwDice = (currentDice: Dice) =>
  currentDice.map((dice) =>
    dice.selected
      ? dice
      : {
          number: dieNumbers[Math.floor(Math.random() * dieNumbers.length)]!,
          selected: false,
        }
  ) as Dice;

const buttonClass = "bg-lime-600 text-white rounded-md px-2 py-1";

const dieNumberToClass = (number: DieNumber) => {
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

const generateDieHtml = ({
  number,
  index,
  selected,
}: {
  number: DieNumber;
  index: number;
  selected: boolean;
}) => `
    <div
      class="die ${dieNumberToClass(
        number
      )} text-4xl leading-6 w-6 flex justify-center ${
  selected ? "bg-black text-white" : "not-selected"
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

const games: Record<string, Game | null> = {};

const generateDiceHtml = (game: Game) =>
  `${game.dice
    .map(({ number, selected }, index) =>
      generateDieHtml({ number, index, selected })
    )
    .join("")}`;

app.get("/", (_, res) => {
  const uuid = randomUUID();
  games[uuid] = null;
  res.header("Content-Type", "text/html").send(`
    <!DOCTYPE html>
    <html>
      <head>
      <meta charset="utf-8">
        <title>Yams</title>
        <script src="https://unpkg.com/htmx.org/dist/htmx.js" ></script>
        <link rel="stylesheet" href="/style.css" />
      </head>
      <body class="flex flex-col justify-center items-center h-screen" hx-headers='{"game-uuid": "${uuid}"}'>
        <div id="game" class="flex flex-col gap-4 items-center">
          <div id="dice" class="flex gap-2 bg-green-700 p-6 w-[205px] h-[73px]">
          </div>
          <div class="flex gap-2">
            <div
              class="h-8"
              hx-trigger="load, event-after-throw from:body, event-after-reset from:body"
              hx-get="/main-button"
            ></div>
            <button hx-post="/reset" hx-target="#dice" class="bg-red-400 text-white rounded-md px-2 py-1">
              Reset
            </button>
          </div>
        </div>
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

app.get("/main-button", (req, res) => {
  const { game } = getGameFromReq(req);
  if (game === undefined) {
    return res.status(400).send("Bad request: game not found");
  }
  if (game === null) {
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
  games[gameUuid] = null;
  res.header("hx-trigger", "event-after-reset").send("");
});

app.put("/throw", (req, res) => {
  const { game, gameUuid } = getGameFromReq(req);
  if (game === undefined) {
    return res.status(400).send("Bad request: game not found");
  }
  if (game === null) {
    games[gameUuid] = createGame();
  } else {
    const newRound = game.round + 1;
    if (!isGameRound(newRound)) {
      return res.status(400).send("Bad request");
    }

    game.dice = throwDice(game.dice);
    game.round = newRound;
  }
  res
    .header("hx-trigger", "event-after-throw")
    .send(generateDiceHtml(games[gameUuid]!));
});

app.put("/select/:index", (req, res) => {
  const index = parseInt(req.params.index);
  if (isNaN(index) || !isIndex(index)) {
    return res.status(400).send("Bad request");
  }
  const { game } = getGameFromReq(req);
  if (game === undefined) {
    return res.status(400).send("Bad request: game not found");
  }
  if (game === null) {
    return res.status(400).send("Game not started");
  }

  const { number, selected } = game.dice[index];
  game.dice[index] = { ...game.dice[index], selected: !selected };
  res.send(generateDieHtml({ number, index, selected: !selected }));
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
