import express, { Request, Response } from "express";
import { taskEither } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import { Dice, Die, Game, Score } from "../domain";

const scoreLabels: Record<Score.ScoreType, string> = {
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

const errorToBadRequest = (response: Response) => (error: Error) => {
  response.status(400).send(`Bad request: ${error.message}`);
};

const errorToInternalError = (response: Response) => (_: Error) => {
  response.status(500);
};

export const buildGameRouter = ({
  gameRepository,
}: {
  gameRepository: Game.Repository;
}) => {
  const router = express.Router();

  const getGameFromReq = (req: Request) =>
    pipe(
      req.headers["game-uuid"],
      Game.parseGameId,
      taskEither.fromEither,
      taskEither.flatMap(gameRepository.getById)
    );

  router.get("/", (_, res) => {
    pipe(
      Game.create(),
      gameRepository.store,
      taskEither.match(errorToInternalError(res), (game) => {
        res.render("index", {
          gameUuid: game.id,
          scoreTable: generateScoreTable(game),
          throwDiceButtonLabel: "Throw dice",
        });
      })
    )();
  });

  router.get("/main-button", (req, res) => {
    pipe(
      req,
      getGameFromReq,
      taskEither.match(errorToBadRequest(res), (game) => {
        if (!Game.canThrowDice(game)) {
          return res.send("");
        }
        return res.render("throwDiceButton", {
          label: Game.isGameWithDice(game) ? "Throw not selected dice" : "Throw dice",
        });
      })
    )();
  });

  router.post("/reset", (req, res) => {
    pipe(
      req,
      getGameFromReq,
      taskEither.map(Game.reset),
      taskEither.flatMap(gameRepository.store),
      taskEither.match(errorToBadRequest(res), () => {
        res.header("hx-trigger", "game-reset").send("");
      })
    )();
  });

  router.get("/score-options", (req, res) => {
    pipe(
      req,
      getGameFromReq,
      taskEither.match(errorToBadRequest(res), (game) => {
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
    )();
  });

  router.put("/score/:scoreType", (req, res) => {
    pipe(
      req,
      getGameFromReq,
      taskEither.bindTo("game"),
      taskEither.bind("scoreType", () =>
        pipe(
          req.params.scoreType,
          taskEither.fromPredicate(
            Score.isScorableScoreType,
            () => new Error("Bad request: given scoreType is not a valid one")
          )
        )
      ),
      taskEither.flatMapEither(({ game, scoreType }) =>
        Game.addScoreForScoreType(scoreType)(game)
      ),
      taskEither.flatMap(gameRepository.store),
      taskEither.match(errorToBadRequest(res), () => {
        res.header("hx-trigger", "score-updated").send("");
      })
    )();
  });

  router.get("/score", (req, res) => {
    pipe(
      req,
      getGameFromReq,
      taskEither.match(errorToBadRequest(res), (game) => {
        res.render("score", {
          scoreTable: generateScoreTable(game),
        });
      })
    )();
  });

  router.put("/throw", (req, res) => {
    pipe(
      req,
      getGameFromReq,
      taskEither.flatMapEither(Game.throwDice),
      taskEither.flatMap(gameRepository.store),
      taskEither.match(errorToBadRequest(res), (game) => {
        res.header("hx-trigger-after-settle", "dice-thrown").render("dice", {
          dice: game.dice.map((die, index) => ({
            class: dieNumberToClass[die.number],
            selected: die.selected,
            index,
          })),
        });
      })
    )();
  });

  router.put("/select/:diceIndex", (req, res) => {
    pipe(
      req,
      getGameFromReq,
      taskEither.bindTo("game"),
      taskEither.bind("diceIndex", () =>
        pipe(
          parseInt(req.params.diceIndex),
          taskEither.fromPredicate(
            Dice.isDiceIndex,
            () => new Error("Bad request: given diceIndex is not a valid one")
          )
        )
      ),
      taskEither.bind("updatedGame", ({ game, diceIndex }) =>
        pipe(
          game,
          Game.toggleDieSelection(diceIndex),
          taskEither.fromEither,
          taskEither.flatMap(gameRepository.store)
        )
      ),
      taskEither.match(errorToBadRequest(res), ({ updatedGame, diceIndex }) => {
        const die = updatedGame.dice[diceIndex];
        res.render("die", {
          class: dieNumberToClass[die.number],
          selected: die.selected,
          index: diceIndex,
        });
      })
    )();
  });
  return router;
};
