import { Dice } from "../Dice";
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

export const isGameWithDice = (game: Game): game is GameWithDice =>
  game.dice !== null;

export const isGameRound = (round: number): round is GameRound =>
  gameRounds.includes(round as GameRound);

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
  Score.getScoreOptionsForDice(game.dice).filter(({ scoreType }) =>
    Score.isScoreTypeAvailable(scoreType)(game.score)
  );

export const getScoreForScoreType =
  (scoreType: Score.ScoreType) => (game: Game) =>
    game.score[scoreType];
