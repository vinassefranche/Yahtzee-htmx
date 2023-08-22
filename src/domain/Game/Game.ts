import { Dice } from "../Dice";
import { Die } from "../Die";
import { Score } from "../Score";

const gameRounds = [0, 1, 2, 3] as const;
type GameRound = (typeof gameRounds)[number];

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

export const isGameWithDice = (game: Game): game is GameWithDice => game.dice !== null;

export const isGameRound = (round: number): round is GameRound =>
  gameRounds.includes(round as GameRound);

export const create = (): Game => ({
  dice: null,
  round: 0,
  score: Score.scoreTypes.reduce(
    (acc, scoreType) => {
      acc[scoreType] = null;
      return acc;
    },
    { bonus: null } as Score.Score
  ),
});

export const startRound1 = (game: Game): GameWithDice => ({
  dice: [
    Die.initializeDie(),
    Die.initializeDie(),
    Die.initializeDie(),
    Die.initializeDie(),
    Die.initializeDie(),
  ],
  round: 1,
  score: game.score,
});

export const getScoreOptions = (game: GameWithDice) =>
  Score.scoreTypes
    .map((scoreType) => ({
      scoreType,
      score: Score.getScoreForScoreType({ dice: game.dice, scoreType }),
    }))
    .filter(({ scoreType }) => game.score[scoreType] === null);