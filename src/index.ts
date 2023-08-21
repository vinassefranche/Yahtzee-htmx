import { randomUUID } from "crypto";
import express from "express";

const app = express();
const port = 3000;

app.use(express.static("build"));

const dieNumbers = [1, 2, 3, 4, 5, 6] as const;
type DieNumber = (typeof dieNumbers)[number];
const gameRounds = [0, 1, 2, 3] as const;
type GameRound = (typeof gameRounds)[number];
type Die = { number: DieNumber; selected: boolean };
type Dice = [Die, Die, Die, Die, Die];

const scoreOptions = [
  "ones",
  "twos",
  "threes",
  "fours",
  "fives",
  "sixes",
  "threeOfAKind",
  "fourOfAKind",
  "fullHouse",
  "smallStraight",
  "largeStraight",
  "yams",
  "chance",
] as const;
type ScoreOption = (typeof scoreOptions)[number];
type Score = Record<ScoreOption | "bonus", number | null>;

const isEligibleForBonus = (score: Score) => {
  const sumOfNumbers =
    (score.ones ?? 0) +
    (score.twos ?? 0) +
    (score.threes ?? 0) +
    (score.fours ?? 0) +
    (score.fives ?? 0) +
    (score.sixes ?? 0);
  return sumOfNumbers >= 62;
};

const addScore =
  ({ dice, scoreOption }: { dice: Dice; scoreOption: ScoreOption }) =>
  (score: Score): Score => ({
    ...score,
    [scoreOption]: getScoreForScoreOption({ dice, scoreOption }),
    bonus: score.bonus === null && isEligibleForBonus(score) ? 35 : null,
  });

const isScoreOptions = (string: string): string is ScoreOption =>
  scoreOptions.includes(string as ScoreOption);

type GameWithoutDice = {
  dice: null;
  round: Extract<GameRound, 0>;
  score: Score;
};
type GameWithDice = {
  dice: Dice;
  round: Exclude<GameRound, 0>;
  score: Score;
};
type Game = GameWithDice | GameWithoutDice;

const isGameWithDice = (game: Game): game is GameWithDice => game.dice !== null;

const isIndex = (index: number): index is 0 | 1 | 2 | 3 | 4 =>
  [0, 1, 2, 3, 4].includes(index);

const isGameRound = (round: number): round is GameRound =>
  gameRounds.includes(round as GameRound);

const getRandomDieNumber = (): DieNumber =>
  dieNumbers[Math.floor(Math.random() * dieNumbers.length)]!;
const initializeDie = (): Die => ({
  number: getRandomDieNumber(),
  selected: false,
});

const createGame = (): Game => ({
  dice: null,
  round: 0,
  score: scoreOptions.reduce(
    (acc, scoreOption) => {
      acc[scoreOption] = null;
      return acc;
    },
    { bonus: null } as Score
  ),
});

const startRound1 = (game: Game): Game => ({
  dice: [
    initializeDie(),
    initializeDie(),
    initializeDie(),
    initializeDie(),
    initializeDie(),
  ],
  round: 1,
  score: game.score,
});

const throwDice = (currentDice: Dice) =>
  currentDice.map((dice) =>
    dice.selected
      ? dice
      : {
          number: getRandomDieNumber(),
          selected: false,
        }
  ) as Dice;

const sumSameNumber = ({ dice, number }: { number: DieNumber; dice: Dice }) =>
  sumAllDice(dice.filter((die) => die.number === number));

const sumAllDice = (dice: ReadonlyArray<Die>) =>
  dice.reduce((acc, die) => acc + die.number, 0);

const getNumberOfEachNumber = (dice: Dice) => {
  const numberOfEachNumber = [0, 0, 0, 0, 0, 0];
  dice.forEach((die) => {
    numberOfEachNumber[die.number - 1]++;
  });
  return numberOfEachNumber;
};

const getScoreForScoreOption = ({
  dice,
  scoreOption,
}: {
  dice: Dice;
  scoreOption: ScoreOption;
}) => {
  const numberOfEachNumber = getNumberOfEachNumber(dice);
  switch (scoreOption) {
    case "ones":
      return sumSameNumber({ dice, number: 1 });
    case "twos":
      return sumSameNumber({ dice, number: 2 });
    case "threes":
      return sumSameNumber({ dice, number: 3 });
    case "fours":
      return sumSameNumber({ dice, number: 4 });
    case "fives":
      return sumSameNumber({ dice, number: 5 });
    case "sixes":
      return sumSameNumber({ dice, number: 6 });
    case "threeOfAKind":
      return numberOfEachNumber.some((number) => number >= 3)
        ? sumAllDice(dice)
        : 0;
    case "fourOfAKind":
      return numberOfEachNumber.some((number) => number >= 4)
        ? sumAllDice(dice)
        : 0;
    case "fullHouse":
      return numberOfEachNumber.some((number) => number === 3) &&
        numberOfEachNumber.some((number) => number === 2)
        ? 25
        : 0;
    case "smallStraight":
      return dice.some((die) => die.number === 3) &&
        dice.some((die) => die.number === 4) &&
        ((dice.some((die) => die.number === 1) &&
          dice.some((die) => die.number === 2)) ||
          (dice.some((die) => die.number === 2) &&
            dice.some((die) => die.number === 5)) ||
          (dice.some((die) => die.number === 5) &&
            dice.some((die) => die.number === 6)))
        ? 30
        : 0;
    case "largeStraight":
      return dice.some((die) => die.number === 2) &&
        dice.some((die) => die.number === 3) &&
        dice.some((die) => die.number === 4) &&
        dice.some((die) => die.number === 5) &&
        (dice.some((die) => die.number === 1) ||
          dice.some((die) => die.number === 6))
        ? 40
        : 0;
    case "yams":
      return numberOfEachNumber.some((number) => number === 5) ? 50 : 0;
    case "chance":
      return sumAllDice(dice);
  }
};

const getScoreOptions = (game: GameWithDice) =>
  scoreOptions
    .map((scoreOption) => ({
      scoreOption,
      score: getScoreForScoreOption({ dice: game.dice, scoreOption }),
    }))
    .filter(({ scoreOption }) => game.score[scoreOption] === null);

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

const games: Record<string, Game> = {};

const generateDiceHtml = (game: GameWithDice) =>
  `${game.dice
    .map(({ number, selected }, index) =>
      generateDieHtml({ number, index, selected })
    )
    .join("")}`;

app.get("/", (_, res) => {
  const uuid = randomUUID();
  games[uuid] = createGame();
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
        ></div>
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

app.get("/main-button", (req, res) => {
  const { game } = getGameFromReq(req);
  if (game === undefined) {
    return res.status(400).send("Bad request: game not found");
  }
  if (!isGameWithDice(game)) {
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
  games[gameUuid] = createGame();
  res.header("hx-trigger", "game-reset").send("");
});

app.get("/score-options", (req, res) => {
  const { game } = getGameFromReq(req);
  if (game === undefined) {
    return res.status(400).send("Bad request: game not found");
  }
  if (!isGameWithDice(game)) {
    return res.send("");
  }
  const scoreOptions = getScoreOptions(game);
  res.send(`
    <div class="grid grid-cols-4 gap-2">
      ${scoreOptions
        .map(
          ({ score, scoreOption }) =>
            `<button
              class="${
                score === 0 ? "bg-gray-500" : "bg-cyan-500"
              } text-white rounded-md px-2 py-1"
              hx-put="/score/${scoreOption}"
              hx-target="#dice"
            >
              ${scoreOption} (${score})
            </button>`
        )
        .join("")}
    </div>
  `);
});

app.put("/score/:scoreOption", (req, res) => {
  const { game, gameUuid } = getGameFromReq(req);
  if (game === undefined) {
    return res.status(400).send("Bad request: game not found");
  }
  if (!isGameWithDice(game)) {
    return res.status(400).send("Bad request: dice not thrown");
  }
  const { scoreOption } = req.params;
  if (!isScoreOptions(scoreOption)) {
    return res
      .status(400)
      .send("Bad request: given scoreOption is not a valid one");
  }
  if (game.score[scoreOption] !== null) {
    return res.status(400).send("Bad request: score already set");
  }
  games[gameUuid] = {
    dice: null,
    round: 0,
    score: addScore({ dice: game.dice, scoreOption })(game.score),
  };
  res.header("hx-trigger", "score-updated").send("");
});

app.get("/score", (req, res) => {
  const { game } = getGameFromReq(req);
  if (game === undefined) {
    return res.status(400).send("Bad request: game not found");
  }
  res.send(`
    <div class="grid grid-cols-4">
      <div class="p-1 border border-solid border-black">Ones</div>
      <div class="p-1 border border-solid border-black border-l-0">${
        game?.score.ones ?? ""
      }</div>
      <div class="p-1 border border-solid border-black border-l-0">Three of a kind</div>
      <div class="p-1 border border-solid border-black border-l-0">${
        game?.score.threeOfAKind ?? ""
      }</div>
      <div class="p-1 border border-solid border-black border-t-0">Twos</div>
      <div class="p-1 border border-solid border-black border-l-0 border-t-0">${
        game?.score.twos ?? ""
      }</div>
      <div class="p-1 border border-solid border-black border-l-0 border-t-0">Four of a kind</div>
      <div class="p-1 border border-solid border-black border-l-0 border-t-0">${
        game?.score.fourOfAKind ?? ""
      }</div>
      <div class="p-1 border border-solid border-black border-t-0">Threes</div>
      <div class="p-1 border border-solid border-black border-l-0 border-t-0">${
        game?.score.threes ?? ""
      }</div>
      <div class="p-1 border border-solid border-black border-l-0 border-t-0">Full house</div>
      <div class="p-1 border border-solid border-black border-l-0 border-t-0">${
        game?.score.fullHouse ?? ""
      }</div>
      <div class="p-1 border border-solid border-black border-t-0">Fours</div>
      <div class="p-1 border border-solid border-black border-l-0 border-t-0">${
        game?.score.fours ?? ""
      }</div>
      <div class="p-1 border border-solid border-black border-l-0 border-t-0">Small straight</div>
      <div class="p-1 border border-solid border-black border-l-0 border-t-0">${
        game?.score.smallStraight ?? ""
      }</div>
      <div class="p-1 border border-solid border-black border-t-0">Fives</div>
      <div class="p-1 border border-solid border-black border-l-0 border-t-0">${
        game?.score.fives ?? ""
      }</div>
      <div class="p-1 border border-solid border-black border-l-0 border-t-0">Large straight</div>
      <div class="p-1 border border-solid border-black border-l-0 border-t-0">${
        game?.score.largeStraight ?? ""
      }</div>
      <div class="p-1 border border-solid border-black border-t-0">Sixes</div>
      <div class="p-1 border border-solid border-black border-l-0 border-t-0">${
        game?.score.sixes ?? ""
      }</div>
      <div class="p-1 border border-solid border-black border-l-0 border-t-0">Yams</div>
      <div class="p-1 border border-solid border-black border-l-0 border-t-0">${
        game?.score.yams ?? ""
      }</div>
      <div class="p-1 border border-solid border-black border-t-0">Bonus (if more than 62)</div>
      <div class="p-1 border border-solid border-black border-l-0 border-t-0">${
        game?.score.bonus ?? ""
      }</div>
      <div class="p-1 border border-solid border-black border-l-0 border-t-0">Chance</div>
      <div class="p-1 border border-solid border-black border-l-0 border-t-0">${
        game?.score.chance ?? ""
      }</div>
    </div>
  `);
});

app.put("/throw", (req, res) => {
  const { game, gameUuid } = getGameFromReq(req);
  if (game === undefined) {
    return res.status(400).send("Bad request: game not found");
  }
  if (!isGameWithDice(game)) {
    games[gameUuid] = startRound1(game);
  } else {
    const newRound = game.round + 1;
    if (!isGameRound(newRound)) {
      return res.status(400).send("Bad request");
    }

    game.dice = throwDice(game.dice);
    game.round = newRound as GameWithDice["round"];
  }
  res
    .header("hx-trigger", "dice-thrown")
    .send(generateDiceHtml(games[gameUuid] as GameWithDice));
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
  if (!isGameWithDice(game)) {
    return res.status(400).send("Bad request: dice not thrown");
  }

  const { number, selected } = game.dice[index];
  game.dice[index] = { ...game.dice[index], selected: !selected };
  res.send(generateDieHtml({ number, index, selected: !selected }));
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
