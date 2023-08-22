import { flow, pipe } from "fp-ts/lib/function";
import { Dice } from "../Dice";
import { Score } from "../Score";
import { either } from "fp-ts";
import { Either } from "fp-ts/lib/Either";

const gameRounds = [0, 1, 2, 3] as const;
type GameRound = (typeof gameRounds)[number];
type GameRoundThatCanBeIncreased = Exclude<GameRound, 3>;

export const isGameRound = (round: number): round is GameRound =>
  gameRounds.includes(round as GameRound);
export const isGameRoundThatCanBeIncreased = (
  round: GameRound
): round is GameRoundThatCanBeIncreased => round !== 3;

type GameWithoutDice = {
  dice: null;
  round: Extract<GameRound, 0>;
  score: Score.Score;
};
export type GameWithDice = {
  dice: Dice.Dice;
  round: Exclude<GameRound, 0>;
  score: Score.Score;
};
export type Game = GameWithDice | GameWithoutDice;

export const isGameWithDice = (game: Game): game is GameWithDice =>
  game.dice !== null;

export const create = (): Game => ({
  dice: null,
  round: 0,
  score: Score.initializeScore(),
});

export const startRound1 = (game: Game): GameWithDice => ({
  dice: Dice.initializeDice(),
  round: 1,
  score: game.score,
});

export const getScoreOptions = (game: GameWithDice) =>
  Score.getScoreOptionsForDice(game.dice)(game.score);

export const getScoreForScoreType =
  (scoreType: Score.ScoreType) => (game: Game) =>
    game.score[scoreType];

export const addScoreForScoreType = (scoreType: Score.ScorableScoreType) =>
  flow(
    either.fromPredicate(isGameWithDice, () => new Error("Dice not thrown")),
    either.flatMap((game) =>
      Score.addScoreForScoreType({ dice: game.dice, scoreType })(game.score)
    ),
    either.map((score): GameWithoutDice => ({ dice: null, round: 0, score }))
  );

export const toggleDieSelection = (dieIndex: Dice.DiceIndex) =>
  flow(
    either.fromPredicate(isGameWithDice, () => new Error("Dice not thrown")),
    either.map(
      (game): GameWithDice => ({
        ...game,
        dice: Dice.toggleDieSelection(dieIndex)(game.dice),
      })
    )
  );

export const throwDice = (game: Game): Either<Error, GameWithDice> => {
  if (!isGameWithDice(game)) {
    return either.right(startRound1(game));
  } else {
    return pipe(
      game.round,
      either.fromPredicate(
        isGameRoundThatCanBeIncreased,
        () => new Error(`Dice cannot be thrown in round ${game.round}`)
      ),
      either.map(increaseRound),
      either.map((round) => ({
        ...game,
        round,
        dice: Dice.throwDice(game.dice),
      }))
    );
  }
};

type IncreasedRound<Round extends GameRoundThatCanBeIncreased> = Round extends 0
  ? 1
  : Round extends 1
  ? 2
  : Round extends 2
  ? 3
  : never;
const increaseRound = <Round extends GameRoundThatCanBeIncreased>(
  gameRound: Round
): IncreasedRound<Round> => {
  return (gameRound + 1) as any;
};
