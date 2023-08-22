import { Die } from "../Die";

export type Dice = [Die.Die, Die.Die, Die.Die, Die.Die, Die.Die];

export const isDiceIndex = (index: number): index is 0 | 1 | 2 | 3 | 4 =>
  [0, 1, 2, 3, 4].includes(index);

export const sumSameNumber = ({
  dice,
  number,
}: {
  number: Die.DieNumber;
  dice: Dice;
}) => Die.sumAll(dice.filter((die) => die.number === number));

export const getNumberOfEachNumber = (dice: Dice) => {
  const numberOfEachNumber = [0, 0, 0, 0, 0, 0];
  dice.forEach((die) => {
    numberOfEachNumber[die.number - 1]++;
  });
  return numberOfEachNumber;
};

export const throwDice = (currentDice: Dice) =>
  currentDice.map((dice) =>
    dice.selected
      ? dice
      : {
          number: Die.getRandomDieNumber(),
          selected: false,
        }
  ) as Dice;
