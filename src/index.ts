import { randomUUID } from "crypto";
import express, { Response } from "express";
import { Dice, Die, Game, Score } from "./domain";
import { pipe } from "fp-ts/lib/function";
import { either } from "fp-ts";
import { engine } from "express-handlebars";
import path from "path";

const app = express();
app.engine("handlebars", engine({ defaultLayout: false }));
app.set("view engine", "handlebars");
app.set("views", path.join(__dirname, "views"));

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
  const gameUuid = randomUUID();
  const game = Game.create();
  games[gameUuid] = game;
  res.render("index", {
    gameUuid,
    score: generateScoreHtml(game),
    throwDiceButtonLabel: "Throw dice",
  });
});

const getGameFromReq = (req: express.Request) => {
  const gameUuid = req.headers["game-uuid"];
  if (typeof gameUuid !== "string") {
    return either.left(new Error("game-uuid header not found"));
  }
  const game = games[gameUuid];
  if (!game) {
    return either.left(new Error("game not found"));
  }
  return either.right({ game, gameUuid });
};

const errorToBadRequest = (response: Response) => (error: Error) => {
  response.status(400).send(`Bad request: ${error.message}`);
};

app.get("/main-button", (req, res) => {
  pipe(
    req,
    getGameFromReq,
    either.match(errorToBadRequest(res), ({ game }) => {
      if (!Game.isGameWithDice(game)) {
        return res.render("throwDiceButton", { label: "Throw dice" });
      }

      const { round } = game;
      if (round === 3) {
        return res.send("");
      }
      return res.render("throwDiceButton", {
        label: "Throw not selected dice",
      });
    })
  );
});

app.post("/reset", (req, res) => {
  pipe(
    req,
    getGameFromReq,
    either.match(errorToBadRequest(res), ({ gameUuid }) => {
      games[gameUuid] = Game.create();
      res.header("hx-trigger", "game-reset").send("");
    })
  );
});

app.get("/score-options", (req, res) => {
  pipe(
    req,
    getGameFromReq,
    either.match(errorToBadRequest(res), ({ game }) => {
      if (!Game.isGameWithDice(game)) {
        res.send("");
        return;
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
    })
  );
});

app.put("/score/:scoreType", (req, res) => {
  pipe(
    req,
    getGameFromReq,
    either.bind("scoreType", () =>
      pipe(
        req.params.scoreType,
        either.fromPredicate(
          Score.isScorableScoreType,
          () => new Error("Bad request: given scoreType is not a valid one")
        )
      )
    ),
    either.bind("updatedGame", ({ game, scoreType }) =>
      Game.addScoreForScoreType(scoreType)(game)
    ),
    either.match(errorToBadRequest(res), ({ gameUuid, updatedGame }) => {
      games[gameUuid] = updatedGame;
      res.header("hx-trigger", "score-updated").send("");
    })
  );
});

app.get("/score", (req, res) => {
  pipe(
    req,
    getGameFromReq,
    either.match(errorToBadRequest(res), ({ game }) => {
      res.send(generateScoreHtml(game));
    })
  );
});

app.put("/throw", (req, res) => {
  pipe(
    req,
    getGameFromReq,
    either.bind("updatedGame", ({ game }) => Game.throwDice(game)),
    either.match(errorToBadRequest(res), ({ gameUuid, updatedGame }) => {
      games[gameUuid] = updatedGame;
      res
        .header("hx-trigger-after-settle", "dice-thrown")
        .send(generateDiceHtml(updatedGame.dice));
    })
  );
});

app.put("/select/:diceIndex", (req, res) => {
  pipe(
    req,
    getGameFromReq,
    either.bind("diceIndex", () =>
      pipe(
        parseInt(req.params.diceIndex),
        either.fromPredicate(
          Dice.isDiceIndex,
          () => new Error("Bad request: given diceIndex is not a valid one")
        )
      )
    ),
    either.bind("updatedGame", ({ game, diceIndex }) =>
      Game.toggleDieSelection(diceIndex)(game)
    ),
    either.match(
      errorToBadRequest(res),
      ({ gameUuid, updatedGame, diceIndex }) => {
        games[gameUuid] = updatedGame;
        res.send(
          generateDieHtml({
            die: updatedGame.dice[diceIndex],
            index: diceIndex,
          })
        );
      }
    )
  );
});

const port = 3000;
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
