import express from "express";

const app = express();
const port = 3000;

app.use(express.static("build"));

type DotColor = "white" | "black";
const diceNumbers = [1, 2, 3, 4, 5, 6] as const;
type DiceNumber = 0 | (typeof diceNumbers)[number];

const dot = (color: DotColor = "black") =>
  `<div class='w-1 h-1 rounded-full ${
    color === "white" ? "bg-white" : "bg-black"
  }'></div>`;
const twoDotsInRow = (color?: DotColor) => `<div class="flex justify-around">
  ${dot(color)}${dot(color)}
</div>`;
const oneCenteredDot = (color?: DotColor) => `<div class="flex justify-center">
  ${dot(color)}
</div>`;
const oneDotInRight = (color?: DotColor) => `<div class="flex justify-end">
  ${dot(color)}
</div>`;

const dice = ({
  number,
  index,
  selected,
}: {
  number: DiceNumber;
  index: number;
  selected: boolean;
}) => {
  const dotColor: DotColor = selected ? "white" : "black";
  return `
    <div
      class="${
        selected ? "bg-black" : "bg-white"
      } w-7 h-7 border border-black border-solid rounded-md p-[4px] flex flex-col justify-around"
      ${number === 0 ? "" : `hx-put="/select/${index}"`}
      hx-swap="outerHTML"
    >
      ${(() => {
        switch (number) {
          case 0:
            return "";
          case 1:
            return oneCenteredDot(dotColor);
          case 2:
            return `${dot(dotColor)}${oneDotInRight(dotColor)}`;
          case 3:
            return `${dot(dotColor)}${oneCenteredDot(dotColor)}${oneDotInRight(
              dotColor
            )}`;
          case 4:
            return `${twoDotsInRow(dotColor)}${twoDotsInRow(dotColor)}`;
          case 5:
            return `${twoDotsInRow(dotColor)}${oneCenteredDot(
              dotColor
            )}${twoDotsInRow(dotColor)}`;
          case 6:
            return `${twoDotsInRow(dotColor)}${twoDotsInRow(
              dotColor
            )}${twoDotsInRow(dotColor)}`;
        }
      })()}
    </div>
  `;
};

type Dice = { number: DiceNumber; selected: boolean };
type Game = { dices: [Dice, Dice, Dice, Dice, Dice]; round: 1 | 2 | 3 };
const game: Game = {
  dices: [
    { number: 0, selected: false },
    { number: 0, selected: false },
    { number: 0, selected: false },
    { number: 0, selected: false },
    { number: 0, selected: false },
  ],
  round: 1,
};

const generateDicesHtml = (game: Game) =>
  `${game.dices
    .map(({ number, selected }, index) => dice({ number, index, selected }))
    .join("")}`;

app.get("/", (_, res) => {
  res.header("Content-Type", "text/html").send(`
    <!DOCTYPE html>
    <html>
      <head>
      <meta charset="utf-8">
        <title>Welcome to htmx</title>
        <script src="https://unpkg.com/htmx.org/dist/htmx.js" ></script>
        <link rel="stylesheet" href="/style.css" />
      </head>
      <body class="p-6">
        <div id="game" class="flex flex-col gap-4 items-baseline">
          <div class="flex gap-2">
            ${generateDicesHtml(game)}
          </div>
          <button hx-post="/start" hx-target="#game" class="bg-lime-600 text-white rounded-sm px-2 py-1">Start</button>
        </div>
        <button hx-post="/reset" hx-target="#game" class="bg-red-400 text-white rounded-sm px-2 py-1 mt-5">Reset</button>
      </body>
    </html>
  `);
});

app.post("/reset", (_, res) => {
  game.dices = [
    { number: 0, selected: false },
    { number: 0, selected: false },
    { number: 0, selected: false },
    { number: 0, selected: false },
    { number: 0, selected: false },
  ];
  res.header("Content-Type", "text/html").send(`
    <div class="flex gap-2">
      ${generateDicesHtml(game)}
    </div>
    <button hx-post="/start" hx-target="#game" class="bg-lime-600 text-white rounded-sm px-2 py-1">Start</button>`);
});

app.post("/start", (_, res) => {
  game.dices = game.dices.map(({ selected }) => ({
    number: diceNumbers[Math.floor(Math.random() * diceNumbers.length)]!,
    selected,
  })) as [Dice, Dice, Dice, Dice, Dice];
  game.round = 1;
  res.header("Content-Type", "text/html").send(`
    <div class="flex gap-2">
      ${generateDicesHtml(game)}
    </div>
    <button hx-put="/throw" hx-target="#game" class="bg-lime-600 text-white rounded-sm px-2 py-1">Throw not selected dices</button>`);
});

const throwDices = () => {
  game.dices = game.dices.map((dice) =>
    dice.selected
      ? dice
      : {
          number: diceNumbers[Math.floor(Math.random() * diceNumbers.length)]!,
          selected: false,
        }
  ) as [Dice, Dice, Dice, Dice, Dice];
};

app.put("/throw", (_, res) => {
  const newRound = game.round + 1;
  if (!isGameRound(newRound)) {
    return res.status(400).send("Bad request");
  }

  throwDices();
  game.round = newRound;
  res.header("Content-Type", "text/html").send(`
    <div class="flex gap-2">
      ${generateDicesHtml(game)}
    </div>
    ${
      game.round === 2
        ? `<button hx-put="/throw" hx-target="#game" class="bg-lime-600 text-white rounded-sm px-2 py-1">Throw not selected dices</button>`
        : ""
    }
  `);
});

app.put("/select/:index", (req, res) => {
  const index = parseInt(req.params.index);
  if (isNaN(index) || !isIndex(index))
    return res.status(400).send("Bad request");

  const { number, selected } = game.dices[index];
  if (number === 0) return res.status(400).send("Bad request");
  game.dices[index] = { ...game.dices[index], selected: !selected };
  res
    .header("Content-Type", "text/html")
    .send(dice({ number, index, selected: !selected }));
});

const isIndex = (index: number): index is 0 | 1 | 2 | 3 | 4 =>
  [0, 1, 2, 3, 4].includes(index);

const isGameRound = (round: number): round is 1 | 2 | 3 =>
  [1, 2, 3].includes(round);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
