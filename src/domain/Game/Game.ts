import { flow, identity, pipe } from "fp-ts/lib/function";
import { randomUUID } from "crypto";
import { Dice } from "../Dice";
import { Score } from "../Score";
import { either } from "fp-ts";
import { Either } from "fp-ts/lib/Either";
import { TaskEither } from "fp-ts/lib/TaskEither";
import * as Codec from "io-ts/Codec";
import * as Decoder from "io-ts/Decoder";

export const codecTypeGuard: <A = never>() => <I, O>(
  codec: Codec.Codec<I, O, A>
) => Codec.Codec<I, O, A> = () => identity;

export type Id = string & { __TYPE__: "GameId" };
const generateGameId = () => randomUUID() as Id;
const uuidRegex =
  /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000)$/i;
export const parseGameId = either.fromPredicate(
  (uuid: unknown): uuid is Id =>
    typeof uuid === "string" && uuidRegex.test(uuid),
  () => new Error("given uuid is not a valid uuid")
);
const idCodec = Codec.make(
  {
    decode: (v: unknown) =>
      pipe(
        parseGameId(v),
        either.mapLeft((error) => Decoder.error(v, error.message))
      ),
  },
  {
    encode: (id) => id as string,
  }
);

const gameRounds = [0, 1, 2, 3] as const;
type GameRound = (typeof gameRounds)[number];
type GameRoundThatCanBeIncreased = Exclude<GameRound, 3>;

export const isGameRound = (round: number): round is GameRound =>
  gameRounds.includes(round as GameRound);
export const isGameRoundThatCanBeIncreased = (
  round: GameRound
): round is GameRoundThatCanBeIncreased => round !== 3;

const gameSumCodec = {
  0: Codec.struct({
    round: Codec.literal(0),
    dice: Codec.literal(null),
  }),
  "1": Codec.struct({
    round: Codec.literal(1),
    dice: Dice.codec,
  }),
  "2": Codec.struct({
    round: Codec.literal(2),
    dice: Dice.codec,
  }),
  "3": Codec.struct({
    round: Codec.literal(3),
    dice: Dice.codec,
  }),
} satisfies Record<GameRound, Codec.Codec<unknown, any, any>>;

export const codec = pipe(
  Codec.struct({
    score: Score.codec,
    id: idCodec,
  }),
  Codec.intersect(Codec.sum("round")(gameSumCodec)),
  codecTypeGuard<Game>()
);

type BaseGame = {
  id: Id;
  score: Score.Score;
};

type GameWithoutDice = BaseGame & {
  dice: null;
  round: Extract<GameRound, 0>;
};
export type GameWithDice = BaseGame & {
  dice: Dice.Dice;
  round: Exclude<GameRound, 0>;
};
export type Game = GameWithDice | GameWithoutDice;

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

export const startRound1 = (game: Game) =>
  pipe(
    game,
    either.fromPredicate(
      (game) => !isOver(game),
      () => new Error("Game is over")
    ),
    either.map(
      (game): GameWithDice => ({
        dice: Dice.initializeDice(),
        round: 1,
        score: game.score,
        id: game.id,
      })
    )
  );

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

export const addScoreForScoreType = (scoreType: Score.ScorableScoreType) =>
  flow(
    either.fromPredicate(isGameWithDice, () => new Error("Dice not thrown")),
    either.bindTo("game"),
    either.bind("updatedScore", ({ game }) =>
      Score.addScoreForScoreType({ dice: game.dice, scoreType })(game.score)
    ),
    either.map(
      ({ updatedScore, game }): GameWithoutDice => ({
        dice: null,
        round: 0,
        score: updatedScore,
        id: game.id,
      })
    )
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
    return startRound1(game);
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

export const totalScore = (game: Game) => Score.total(game.score);

export type Repository = {
  getById: (id: Id) => TaskEither<Error, Game>;
  store: <T extends Game>(game: T) => TaskEither<Error, T>;
};
