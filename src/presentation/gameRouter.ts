import { Effect } from "effect";
import express, { Request, Response } from "express";
import { readonlyArray } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import {
  addScoreForScoreType,
  createGame,
  getGame,
  resetGame,
  throwDice,
  toggleDieSelection,
} from "../application";
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

const getScoreOptionsForTemplate = (game: Game.Game) =>
  Game.isGameWithDice(game)
    ? Game.getScoreOptions(game).map((scoreOption) => ({
        score: scoreOption.score,
        scoreType: scoreOption.scoreType,
        label: scoreLabels[scoreOption.scoreType],
      }))
    : [];

const dieNumberToClass: Record<Die.DieNumber, string> = {
  1: "one",
  2: "two",
  3: "three",
  4: "four",
  5: "five",
  6: "six",
};

const getDiceForTemplate = readonlyArray.mapWithIndex(
  (index, die: Die.Die) => ({
    class: dieNumberToClass[die.number],
    selected: die.selected,
    index,
  })
);

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

const errorToInternalError = (response: Response) => (error: Error) => {
  console.log(error.message);
  response.sendStatus(500);
};

const getGameIdFromReq = (req: Request) =>
  Game.parseGameIdEffect(req.headers["game-id"]);

export const buildGameRouter = ({
  gameRepository,
}: {
  gameRepository: Game.GameRepositoryEffect;
}) => {
  const router = express.Router();

  const runProgramWithDependencies = <A>(
    program: Effect.Effect<Game.GameRepositoryEffect, Error, A>
  ) =>
    pipe(
      program,
      Effect.provideService(
        Game.GameRepository,
        Game.GameRepository.of(gameRepository)
      ),
      Effect.runPromise
    );

  router.get("/", (_, res) => {
    pipe(
      createGame(),
      Effect.match({
        onFailure: errorToInternalError(res),
        onSuccess: (game) => {
          res.redirect(`/game/${game.id}`);
        },
      }),
      runProgramWithDependencies
    );
  });

  router.get("/game/:uuid", (req, res) => {
    pipe(
      req.params.uuid,
      Game.parseGameIdEffect,
      Effect.flatMap(getGame),
      Effect.match({
        onFailure: (error) => {
          if (error.message === "game not found") {
            res.redirect("/");
            return;
          }
          errorToBadRequest(res)(error);
        },
        onSuccess: (game) => {
          res.render("index", {
            gameId: game.id,
            scoreTable: generateScoreTable(game),
            dice: Game.isGameWithDice(game)
              ? getDiceForTemplate(game.dice)
              : [],
            throwDiceButtonLabel: Game.isGameWithDice(game)
              ? "Throw not selected dice"
              : "Throw dice",
            scoreOptions: getScoreOptionsForTemplate(game),
          });
        },
      }),
      runProgramWithDependencies
    );
  });

  router.get("/main-button", (req, res) => {
    pipe(
      req,
      getGameIdFromReq,
      Effect.flatMap(getGame),
      Effect.match({
        onFailure: errorToBadRequest(res),
        onSuccess: (game) => {
          if (!Game.canThrowDice(game)) {
            return res.send("");
          }
          return res.render("throwDiceButton", {
            label: Game.isGameWithDice(game)
              ? "Throw not selected dice"
              : "Throw dice",
          });
        },
      }),
      runProgramWithDependencies
    );
  });

  router.post("/reset", (req, res) => {
    pipe(
      req,
      getGameIdFromReq,
      Effect.flatMap(resetGame),
      Effect.match({
        onFailure: errorToBadRequest(res),
        onSuccess: () => {
          res.header("hx-trigger", "game-reset").render("dice", {
            dice: [],
          });
        },
      }),
      runProgramWithDependencies
    );
  });

  router.get("/score-options", (req, res) => {
    pipe(
      req,
      getGameIdFromReq,
      Effect.flatMap(getGame),
      Effect.match({
        onFailure: errorToBadRequest(res),
        onSuccess: (game) => {
          res.render("scoreOptions", {
            scoreOptions: getScoreOptionsForTemplate(game),
          });
        },
      }),
      runProgramWithDependencies
    );
  });

  router.put("/score/:scoreType", (req, res) => {
    pipe(
      req,
      getGameIdFromReq,
      Effect.bindTo("gameId"),
      Effect.bind("scoreType", () =>
        Score.parseScorableScoreType(req.params.scoreType)
      ),
      Effect.flatMap(addScoreForScoreType),
      Effect.match({
        onFailure: errorToBadRequest(res),
        onSuccess: (game) => {
          res.header("hx-trigger", "score-updated");
          if (Game.isOver(game)) {
            res.send("");
            return;
          }
          res.render("dice", {
            dice: [],
          });
        },
      }),
      runProgramWithDependencies
    );
  });

  router.get("/score", (req, res) => {
    pipe(
      req,
      getGameIdFromReq,
      Effect.flatMap(getGame),
      Effect.match({
        onFailure: errorToBadRequest(res),
        onSuccess: (game) => {
          res.render("score", {
            scoreTable: generateScoreTable(game),
            isGameOver: Game.isOver(game),
            totalScore: Game.totalScore(game),
          });
        },
      }),
      runProgramWithDependencies
    );
  });

  router.put("/throw-dice", (req, res) => {
    pipe(
      req,
      getGameIdFromReq,
      Effect.flatMap(throwDice),
      Effect.match({
        onFailure: errorToBadRequest(res),
        onSuccess: (game) => {
          res.header("hx-trigger-after-settle", "dice-thrown").render("dice", {
            dice: getDiceForTemplate(game.dice),
          });
        },
      }),
      runProgramWithDependencies
    );
  });

  router.put("/select/:diceIndex", (req, res) => {
    pipe(
      req,
      getGameIdFromReq,
      Effect.bindTo("gameId"),
      Effect.bind("diceIndex", () =>
        Dice.parseDiceIndex(parseInt(req.params.diceIndex))
      ),
      Effect.bind("updatedGame", toggleDieSelection),
      Effect.match({
        onFailure: errorToBadRequest(res),
        onSuccess: ({ updatedGame, diceIndex }) => {
          const die = updatedGame.dice[diceIndex];
          res.render("die", {
            class: dieNumberToClass[die.number],
            selected: die.selected,
            index: diceIndex,
          });
        },
      }),
      runProgramWithDependencies
    );
  });
  return router;
};
