import express from "express";

const app = express();
const port = 3000;

app.use(express.static("build"));

type DotColor = "white" | "black";
const dieNumbers = [1, 2, 3, 4, 5, 6] as const;
type DieNumber = typeof dieNumbers[number];

const dot = (color: DotColor = "black", visible: boolean) =>
  `<div class="w-1 h-1 rounded-full ${
    color === "white" ? "bg-white" : "bg-black"
  } ${
    visible ? "opacity-100" : "opacity-0"
  }"></div>`;

const buttonClass = "bg-lime-600 text-white rounded-md px-2 py-1";

const die = ({
  number,
  index,
  selected,
}: {
  number: DieNumber;
  index: number;
  selected: boolean;
}) => {
  const dotColor: DotColor = selected ? "white" : "black";
  return `
    <div
      class="${
        selected ? "bg-black" : "bg-white"
      } w-7 h-7 border border-black border-solid rounded-md p-[5px] flex flex-col justify-around"
      hx-put="/select/${index}"
      hx-swap="outerHTML"
    >
      <div class="flex justify-between">
        ${dot(dotColor, number !== 1)}${dot(dotColor, [4, 5, 6].includes(number))}
      </div>
      <div class="flex justify-between">
        ${dot(dotColor, number === 6)}${dot(dotColor, number % 2 === 1)}${dot(dotColor, number === 6)}
      </div>
      <div class="flex justify-between">
        ${dot(dotColor, [4, 5, 6].includes(number))}${dot(dotColor, number !== 1)}
      </div>
    </div>
  `;
};

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
        <title>Welcome to htmx</title>
        <script src="https://unpkg.com/htmx.org/dist/htmx.js" ></script>
        <link rel="stylesheet" href="/style.css" />
      </head>
      <body class="p-6">
        <div id="game" class="flex flex-col gap-4 items-baseline">
          <button hx-put="/throw" hx-target="#game" class="${buttonClass}">Throw dice</button>
        </div>
        <button hx-post="/reset" hx-target="#game" class="bg-red-400 text-white rounded-md px-2 py-1 mt-5">Reset</button>
      </body>
    </html>
  `);
});

app.post("/reset", (_, res) => {
  game = undefined;
  res.header("Content-Type", "text/html").send(`
    <button hx-put="/throw" hx-target="#game" class="${buttonClass}">Throw dice</button>
  `);
});

const generateRandomDieNumber = (): DieNumber =>
  dieNumbers[Math.floor(Math.random() * dieNumbers.length)]!;

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
        {
          number: generateRandomDieNumber(),
          selected: false,
        },
        {
          number: generateRandomDieNumber(),
          selected: false,
        },
        {
          number: generateRandomDieNumber(),
          selected: false,
        },
        {
          number: generateRandomDieNumber(),
          selected: false,
        },
        {
          number: generateRandomDieNumber(),
          selected: false,
        },
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
  res.header("Content-Type", "text/html").send(`
    <div class="flex gap-2">
      ${generateDicesHtml(game)}
    </div>
    ${
      game.round !== 3
        ? `<button hx-put="/throw" hx-target="#game" class="${buttonClass}">Throw not selected dices</button>`
        : ""
    }
  `);
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
  res
    .header("Content-Type", "text/html")
    .send(die({ number, index, selected: !selected }));
});

const isIndex = (index: number): index is 0 | 1 | 2 | 3 | 4 =>
  [0, 1, 2, 3, 4].includes(index);

const isGameRound = (round: number): round is 1 | 2 | 3 =>
  [1, 2, 3].includes(round);

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
