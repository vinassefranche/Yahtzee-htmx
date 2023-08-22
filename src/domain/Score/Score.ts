import { Dice } from "../Dice";
import { Die } from "../Die";

const scoreTypes = [
  "ones",
  "twos",
  "threes",
  "fours",
  "fives",
  "sixes",
  "bonus",
  "threeOfAKind",
  "fourOfAKind",
  "fullHouse",
  "smallStraight",
  "largeStraight",
  "yams",
  "chance",
] as const;
export type ScoreType = (typeof scoreTypes)[number];
type ScorableScoreType = Exclude<ScoreType, "bonus">;
export type Score = Record<ScoreType, number | null>;

export const isScoreType = (string: string): string is ScoreType =>
  scoreTypes.includes(string as ScoreType);

export const isScorableScoreType = (
  string: string
): string is ScorableScoreType => isScoreType(string) && string !== "bonus";

export const initializeScore = () =>
  scoreTypes.reduce(
    (acc, scoreType) => {
      acc[scoreType] = null;
      return acc;
    },
    { bonus: null } as Score
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

export const addScoreForScoreType =
  ({ dice, scoreType }: { dice: Dice.Dice; scoreType: ScorableScoreType }) =>
  (score: Score): Score => {
    const newScore = {
      ...score,
      [scoreType]: getScoreForDiceAndScoreType(dice)(scoreType),
    };
    if (
      isScoreTypeAvailable("bonus")(newScore) && isEligibleForBonus(newScore)
        ? 35
        : null
    ) {
      newScore.bonus = 35;
    }
    return newScore;
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

export const getScoreOptionsForDice = (dice: Dice.Dice) => {
  const getScoreForScoreType = getScoreForDiceAndScoreType(dice);
  return scoreTypes.filter(isScorableScoreType).map((scoreType) => ({
    scoreType,
    score: getScoreForScoreType(scoreType),
  }));
};

export const isScoreTypeAvailable = (scoreType: ScoreType) => (score: Score) =>
  score[scoreType] === null;
