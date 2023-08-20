import express from "express";

const app = express();
const port = 3000;

app.use(express.static("build"));

const dieNumbers = [1, 2, 3, 4, 5, 6] as const;
type DieNumber = (typeof dieNumbers)[number];

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

const die = ({
  number,
  index,
  selected,
}: {
  number: DieNumber;
  index: number;
  selected: boolean;
}) => `
    <div
      class="die ${dieNumberToClass(number)} text-4xl leading-6 w-6 flex justify-center ${selected ? "bg-black text-white" : "not-selected"}"
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

type Die = { number: DieNumber; selected: boolean };
type Game = { dice: [Die, Die, Die, Die, Die]; round: 1 | 2 | 3 };
let game: Game | undefined;

const generateDicesHtml = (game: Game) =>
  `${game.dice
    .map(({ number, selected }, index) => die({ number, index, selected }))
    .join("")}`;

app.get("/", (_, res) => {
  res.header("Content-Type", "text/html").send(`
    <!DOCTYPE html>
    <html>
      <head>
      <meta charset="utf-8">
        <title>Yams</title>
        <script src="https://unpkg.com/htmx.org/dist/htmx.js" ></script>
        <link rel="stylesheet" href="/style.css" />
      </head>
      <body class="flex flex-col justify-center items-center h-screen">
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

app.get("/main-button", (_, res) => {
  if (!game) {
    return res.send(throwDiceButton());
  }

  const { round } = game;
  if (round === 3) {
    return res.send("");
  }
  return res.send(throwDiceButton("Throw not selected dice"));
});

app.post("/reset", (_, res) => {
  game = undefined;
  res.header("hx-trigger", "event-after-reset").send("");
});

const generateRandomDieNumber = (): DieNumber =>
  dieNumbers[Math.floor(Math.random() * dieNumbers.length)]!;

const initiateDie = (): Die => ({
  number: generateRandomDieNumber(),
  selected: false,
});

const throwDice = (currentDice: Game["dice"]) =>
  currentDice.map((dice) =>
    dice.selected
      ? dice
      : {
          number: dieNumbers[Math.floor(Math.random() * dieNumbers.length)]!,
          selected: false,
        }
  ) as Game["dice"];

app.put("/throw", (_, res) => {
  if (!game) {
    game = {
      dice: [
        initiateDie(),
        initiateDie(),
        initiateDie(),
        initiateDie(),
        initiateDie(),
      ],
      round: 1,
    };
  } else {
    const newRound = game.round + 1;
    if (!isGameRound(newRound)) {
      return res.status(400).send("Bad request");
    }

    game.dice = throwDice(game.dice);
    game.round = newRound;
  }
  res.header("hx-trigger", "event-after-throw").send(generateDicesHtml(game));
});

app.put("/select/:index", (req, res) => {
  const index = parseInt(req.params.index);
  if (isNaN(index) || !isIndex(index)) {
    return res.status(400).send("Bad request");
  }
  if (!game) {
    return res.status(400).send("Game not started");
  }

  const { number, selected } = game.dice[index];
  game.dice[index] = { ...game.dice[index], selected: !selected };
  res.send(die({ number, index, selected: !selected }));
});

const isIndex = (index: number): index is 0 | 1 | 2 | 3 | 4 =>
  [0, 1, 2, 3, 4].includes(index);

const isGameRound = (round: number): round is 1 | 2 | 3 =>
  [1, 2, 3].includes(round);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
