import * as Schema from "@effect/schema/Schema";
import { randomUUID } from "crypto";
import { Context, Effect, pipe } from "effect";
import { Dice } from "../Dice";
import { Score } from "../Score";

const uuidRegex =
  /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000)$/i;
const idSchema = pipe(
  Schema.string,
  Schema.pattern(uuidRegex),
  Schema.brand("GameId")
);
export type Id = Schema.To<typeof idSchema>;
const generateGameId = () => randomUUID() as Id;

export const parseGameId = (uuid: unknown): Effect.Effect<never, Error, Id> =>
  typeof uuid === "string" && uuidRegex.test(uuid)
    ? Effect.succeed(uuid as Id)
    : Effect.fail(new Error("given uuid is not a valid uuid"));

const gameRounds = [0, 1, 2, 3] as const;
type GameRound = (typeof gameRounds)[number];
type GameRoundThatCanBeIncreased = Exclude<GameRound, 3>;

export const isGameRound = (round: number): round is GameRound =>
  gameRounds.includes(round as GameRound);
export const isGameRoundThatCanBeIncreased = (
  round: GameRound
): round is GameRoundThatCanBeIncreased => round !== 3;

const baseSchemaProps = {
  score: Score.schema,
  id: idSchema,
} as const;

const gameWithoutDiceSchema = Schema.struct({
  ...baseSchemaProps,
  round: Schema.literal(0),
  dice: Schema.null,
});

const gameWithDiceSchema = Schema.struct({
  ...baseSchemaProps,
  round: Schema.literal(1, 2, 3),
  dice: Dice.schema,
});

export const schema = Schema.union(gameWithoutDiceSchema, gameWithDiceSchema);

type GameWithoutDice = Schema.To<typeof gameWithoutDiceSchema>;
export type GameWithDice = Schema.To<typeof gameWithDiceSchema>;
export type Game = Schema.To<typeof schema>;

export const isGameWithDice = (game: Game): game is GameWithDice =>
  game.dice !== null;

export const isOver = (game: Game) => Score.isCompleted(game.score);

export const canThrowDice = (game: Game) => game.round !== 3 && !isOver(game);

export const create = (): Game => ({
  dice: null,
  round: 0,
  score: Score.initializeScore(),
  id: generateGameId(),
});

export const startRound1 = (game: Game) => {
  if (isOver(game)) {
    return Effect.fail(new Error("Game is over"));
  }
  return Effect.succeed<GameWithDice>({
    dice: Dice.initializeDice(),
    round: 1,
    score: game.score,
    id: game.id,
  });
};

export const reset = (game: Game): Game => ({
  dice: null,
  round: 0,
  score: Score.initializeScore(),
  id: game.id,
});

export const getScoreOptions = (game: GameWithDice) =>
  Score.getScoreOptionsForDice(game.dice)(game.score);

export const getScoreForScoreType =
  (scoreType: Score.ScoreType) => (game: Game) =>
    game.score[scoreType];

export const addScoreForScoreType =
  (scoreType: Score.ScorableScoreType) => (game: Game) => {
    if (!isGameWithDice(game)) {
      return Effect.fail(new Error("Dice not thrown"));
    }
    return pipe(
      game.score,
      Score.addScoreForScoreType({ dice: game.dice, scoreType }),
      Effect.map(
        (updatedScore): GameWithoutDice => ({
          dice: null,
          round: 0,
          score: updatedScore,
          id: game.id,
        })
      )
    );
  };

export const toggleDieSelection =
  (dieIndex: Dice.DiceIndex) => (game: Game) => {
    if (!isGameWithDice(game)) {
      return Effect.fail(new Error("Dice not thrown"));
    }
    return Effect.succeed<GameWithDice>({
      ...game,
      dice: Dice.toggleDieSelection(dieIndex)(game.dice),
    });
  };

export const throwDice = (
  game: Game
): Effect.Effect<never, Error, GameWithDice> => {
  if (!isGameWithDice(game)) {
    return startRound1(game);
  }
  if (!isGameRoundThatCanBeIncreased(game.round)) {
    return Effect.fail(
      new Error(`Dice cannot be thrown in round ${game.round}`)
    );
  }
  return Effect.succeed({
    ...game,
    dice: Dice.throwDice(game.dice),
    round: increaseRound(game.round),
  });
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

export const totalScore = (game: Game) => Score.total(game.score);

export type GameRepository = {
  getById: (id: Id) => Effect.Effect<never, Error, Game>;
  store: <T extends Game>(game: T) => Effect.Effect<never, Error, T>;
};

export const GameRepository = Context.Tag<GameRepository>();

export const storeGame = <T extends Game>(game: T) =>
  GameRepository.pipe(
    Effect.flatMap((gameRepository) => gameRepository.store(game))
  );

export const getGameById = (id: Id) =>
  GameRepository.pipe(
    Effect.flatMap((gameRepository) => gameRepository.getById(id))
  );
