import express, { Response } from "express";
import { engine } from "express-handlebars";
import { either, option } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import path from "path";
import { Dice, Die, Game, Score } from "./domain";

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

const dieNumberToClass: Record<Die.DieNumber, string> = {
  1: "one",
  2: "two",
  3: "three",
  4: "four",
  5: "five",
  6: "six",
};

const generateScoreTable = (game: Game.Game) =>
  (
    [
      ["ones", "threeOfAKind"],
      ["twos", "fourOfAKind"],
      ["threes", "fullHouse"],
      ["fours", "smallStraight"],
      ["fives", "largeStraight"],
      ["sixes", "yams"],
      ["bonus", "chance"],
    ] as const satisfies ReadonlyArray<
      readonly [Score.ScoreType, Score.ScoreType]
    >
  ).map(([scoreType1, scoreType2]) => ({
    first: {
      scoreType: scoreType1,
      score: Game.getScoreForScoreType(scoreType1)(game) ?? "",
      label: scoreLabels[scoreType1],
    },
    second: {
      scoreType: scoreType2,
      score: game.score[scoreType2] ?? "",
      label: scoreLabels[scoreType2],
    },
  }));

type Games = ReadonlyArray<Game.Game>;
let games: Games = [];
const upsertGame = (game: Game.Game) => {
  games = games.filter(({ id }) => id !== game.id).concat(game);
};

const getGameFromReq = (req: express.Request) =>
  pipe(
    req.headers["game-uuid"],
    Game.parseGameId,
    either.map((gameUuid) =>
      option.fromNullable(games.find((game) => game.id === gameUuid))
    ),
    either.flatMap(either.fromOption(() => new Error("game not found")))
  );

const errorToBadRequest = (response: Response) => (error: Error) => {
  response.status(400).send(`Bad request: ${error.message}`);
};

app.get("/", (_, res) => {
  const game = Game.create();
  upsertGame(game);
  res.render("index", {
    gameUuid: game.id,
    scoreTable: generateScoreTable(game),
    throwDiceButtonLabel: "Throw dice",
  });
});

app.get("/main-button", (req, res) => {
  pipe(
    req,
    getGameFromReq,
    either.match(errorToBadRequest(res), (game) => {
      const { round } = game;
      if (round === 3) {
        return res.send("");
      }
      return res.render("throwDiceButton", {
        label: round === 0 ? "Throw dice" : "Throw not selected dice",
      });
    })
  );
});

app.post("/reset", (req, res) => {
  pipe(
    req,
    getGameFromReq,
    either.match(errorToBadRequest(res), (game) => {
      upsertGame(Game.reset(game));
      res.header("hx-trigger", "game-reset").send("");
    })
  );
});

app.get("/score-options", (req, res) => {
  pipe(
    req,
    getGameFromReq,
    either.match(errorToBadRequest(res), (game) => {
      if (!Game.isGameWithDice(game)) {
        res.send("");
        return;
      }

      res.render("scoreOptions", {
        scoreOptions: Game.getScoreOptions(game).map((scoreOption) => ({
          score: scoreOption.score,
          scoreType: scoreOption.scoreType,
          label: scoreLabels[scoreOption.scoreType],
        })),
      });
    })
  );
});

app.put("/score/:scoreType", (req, res) => {
  pipe(
    req,
    getGameFromReq,
    either.bindTo("game"),
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
    either.match(errorToBadRequest(res), ({ updatedGame }) => {
      upsertGame(updatedGame);
      res.header("hx-trigger", "score-updated").send("");
    })
  );
});

app.get("/score", (req, res) => {
  pipe(
    req,
    getGameFromReq,
    either.match(errorToBadRequest(res), (game) => {
      res.render("score", {
        scoreTable: generateScoreTable(game),
      });
    })
  );
});

app.put("/throw", (req, res) => {
  pipe(
    req,
    getGameFromReq,
    either.flatMap(Game.throwDice),
    either.match(errorToBadRequest(res), (updatedGame) => {
      upsertGame(updatedGame);
      res.header("hx-trigger-after-settle", "dice-thrown").render("dice", {
        dice: updatedGame.dice.map((die, index) => ({
          class: dieNumberToClass[die.number],
          selected: die.selected,
          index,
        })),
      });
    })
  );
});

app.put("/select/:diceIndex", (req, res) => {
  pipe(
    req,
    getGameFromReq,
    either.bindTo("game"),
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
    either.match(errorToBadRequest(res), ({ updatedGame, diceIndex }) => {
      upsertGame(updatedGame);
      const die = updatedGame.dice[diceIndex];
      res.render("die", {
        class: dieNumberToClass[die.number],
        selected: die.selected,
        index: diceIndex,
      });
    })
  );
});

const port = 3000;
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
