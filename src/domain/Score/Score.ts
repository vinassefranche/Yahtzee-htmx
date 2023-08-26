import * as Schema from "@effect/schema/Schema";
import { Effect } from "effect";
import { Dice } from "../Dice";
import { Die } from "../Die";

const schemaProps = {
  ones: Schema.nullable(Schema.number),
  twos: Schema.nullable(Schema.number),
  threes: Schema.nullable(Schema.number),
  fours: Schema.nullable(Schema.number),
  fives: Schema.nullable(Schema.number),
  sixes: Schema.nullable(Schema.number),
  bonus: Schema.nullable(Schema.number),
  threeOfAKind: Schema.nullable(Schema.number),
  fourOfAKind: Schema.nullable(Schema.number),
  fullHouse: Schema.nullable(Schema.number),
  smallStraight: Schema.nullable(Schema.number),
  largeStraight: Schema.nullable(Schema.number),
  yams: Schema.nullable(Schema.number),
  chance: Schema.nullable(Schema.number),
} as const;
export const schema = Schema.struct(schemaProps);

export type Score = Schema.To<typeof schema>;

export type ScoreType = keyof typeof schemaProps;
const scoreTypes = Object.keys(schemaProps) as ReadonlyArray<ScoreType>;
export type ScorableScoreType = Exclude<ScoreType, "bonus">;

export const isScoreType = (string: string): string is ScoreType =>
  scoreTypes.includes(string as ScoreType);

export const isScorableScoreType = (
  string: string
): string is ScorableScoreType => isScoreType(string) && string !== "bonus";

export const parseScorableScoreType = (scorableScoreType: unknown) =>
  typeof scorableScoreType === "string" &&
  isScorableScoreType(scorableScoreType)
    ? Effect.succeed<ScorableScoreType>(scorableScoreType)
    : Effect.fail(new Error("given scoreType is not a valid one"));

export const initializeScore = () =>
  scoreTypes.reduce(
    (acc, scoreType) => ({ ...acc, [scoreType]: null }),
    {} as Score
  );

const isEligibleForBonus = (score: Score) => {
  const sumOfNumbers =
    (score.ones ?? 0) +
    (score.twos ?? 0) +
    (score.threes ?? 0) +
    (score.fours ?? 0) +
    (score.fives ?? 0) +
    (score.sixes ?? 0);
  return sumOfNumbers >= 62;
};

export const isCompleted = (score: Score) =>
  scoreTypes.every((scoreType) => score[scoreType] !== null);

export const total = (score: Score) =>
  scoreTypes.reduce((acc, scoreType) => acc + (score[scoreType] ?? 0), 0);

export const addScoreForScoreType =
  ({ dice, scoreType }: { dice: Dice.Dice; scoreType: ScorableScoreType }) =>
  (score: Score): Effect.Effect<never, Error, Score> => {
    if (!isScoreTypeAvailable(scoreType)(score)) {
      return Effect.fail(new Error(`score for ${scoreType} already set`));
    }
    const newScore = {
      ...score,
      [scoreType]: getScoreForDiceAndScoreType(dice)(scoreType),
    };
    if (
      isScoreTypeAvailable("bonus")(newScore) &&
      isEligibleForBonus(newScore)
    ) {
      return Effect.succeed({ ...newScore, bonus: 35 });
    }
    return Effect.succeed(newScore);
  };

export const getScoreForDiceAndScoreType =
  (dice: Dice.Dice) => (scoreType: ScorableScoreType) => {
    const numberOfEachNumber = Dice.getNumberOfEachNumber(dice);
    switch (scoreType) {
      case "ones":
        return Dice.sumSameNumber({ dice, number: 1 });
      case "twos":
        return Dice.sumSameNumber({ dice, number: 2 });
      case "threes":
        return Dice.sumSameNumber({ dice, number: 3 });
      case "fours":
        return Dice.sumSameNumber({ dice, number: 4 });
      case "fives":
        return Dice.sumSameNumber({ dice, number: 5 });
      case "sixes":
        return Dice.sumSameNumber({ dice, number: 6 });
      case "threeOfAKind":
        return numberOfEachNumber.some((number) => number >= 3)
          ? Die.sumAll(dice)
          : 0;
      case "fourOfAKind":
        return numberOfEachNumber.some((number) => number >= 4)
          ? Die.sumAll(dice)
          : 0;
      case "fullHouse":
        return numberOfEachNumber.some((number) => number === 3) &&
          numberOfEachNumber.some((number) => number === 2)
          ? 25
          : 0;
      case "smallStraight":
        return dice.some((die) => die.number === 3) &&
          dice.some((die) => die.number === 4) &&
          ((dice.some((die) => die.number === 1) &&
            dice.some((die) => die.number === 2)) ||
            (dice.some((die) => die.number === 2) &&
              dice.some((die) => die.number === 5)) ||
            (dice.some((die) => die.number === 5) &&
              dice.some((die) => die.number === 6)))
          ? 30
          : 0;
      case "largeStraight":
        return dice.some((die) => die.number === 2) &&
          dice.some((die) => die.number === 3) &&
          dice.some((die) => die.number === 4) &&
          dice.some((die) => die.number === 5) &&
          (dice.some((die) => die.number === 1) ||
            dice.some((die) => die.number === 6))
          ? 40
          : 0;
      case "yams":
        return numberOfEachNumber.some((number) => number === 5) ? 50 : 0;
      case "chance":
        return Die.sumAll(dice);
    }
  };

export const getScoreOptionsForDice = (dice: Dice.Dice) => (score: Score) => {
  const getScoreForScoreType = getScoreForDiceAndScoreType(dice);
  return scoreTypes
    .filter(isScorableScoreType)
    .map((scoreType) => ({
      scoreType,
      score: getScoreForScoreType(scoreType),
    }))
    .filter(({ scoreType }) => isScoreTypeAvailable(scoreType)(score));
};

const isScoreTypeAvailable = (scoreType: ScoreType) => (score: Score) =>
  score[scoreType] === null;
