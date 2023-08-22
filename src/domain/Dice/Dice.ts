import { Die } from "../Die";

export type Dice = [Die.Die, Die.Die, Die.Die, Die.Die, Die.Die];

export const isDiceIndex = (index: number): index is 0 | 1 | 2 | 3 | 4 =>
  [0, 1, 2, 3, 4].includes(index);

export const initializeDice = (): Dice => [
  Die.initializeDie(),
  Die.initializeDie(),
  Die.initializeDie(),
  Die.initializeDie(),
  Die.initializeDie(),
];

export const sumSameNumber = ({
  dice,
  number,
}: {
  number: Die.DieNumber;
  dice: Dice;
}) => Die.sumAll(dice.filter((die) => die.number === number));

export const getNumberOfEachNumber = (dice: Dice) =>
  dice.reduce(
    (acc, die) => {
      acc[die.number - 1]++;
      return acc;
    },
    [0, 0, 0, 0, 0, 0] as [number, number, number, number, number, number]
  );

export const throwDice = (dice: Dice) =>
  dice.map((die) =>
    die.selected
      ? die
      : {
          number: Die.getRandomDieNumber(),
          selected: false,
        }
  ) as Dice;
