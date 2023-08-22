import { Die } from "../Die";

export type Dice = [Die.Die, Die.Die, Die.Die, Die.Die, Die.Die];
const diceIndexes = [0, 1, 2, 3, 4] as const;
export type DiceIndex = (typeof diceIndexes)[number];
export const isDiceIndex = (index: number): index is DiceIndex =>
  diceIndexes.includes(index as DiceIndex);

const map =
  (fn: (die: Die.Die, index: DiceIndex) => Die.Die) =>
  (dice: Dice): Dice =>
    dice.map(fn as (die: Die.Die, index: number) => Die.Die) as Dice;

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

export const throwDice = map((die) =>
  die.selected
    ? die
    : {
        number: Die.getRandomDieNumber(),
        selected: false,
      }
);

export const toggleDieSelection = (dieIndex: DiceIndex) =>
  map((die, index) => (index === dieIndex ? Die.toggleSelection(die) : die));
