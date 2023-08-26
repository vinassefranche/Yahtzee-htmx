import * as Schema from "@effect/schema/Schema";
import { Effect } from "effect";
import { Die } from "../Die";

type TupleIndices<T extends readonly any[]> = Extract<
  keyof T,
  `${number}`
> extends `${infer N extends number}`
  ? N
  : never;

const tupleSchemaProps = [
  Die.schema,
  Die.schema,
  Die.schema,
  Die.schema,
  Die.schema,
] as const;

export const schema = Schema.tuple(...tupleSchemaProps);

export type Dice = Schema.To<typeof schema>;
export type DiceIndex = TupleIndices<typeof tupleSchemaProps>;
const diceIndexes = Array.from(tupleSchemaProps.keys()) as DiceIndex[];
export const isDiceIndex = (index: number): index is DiceIndex =>
  diceIndexes.includes(index as DiceIndex);

export const parseDiceIndex = (diceIndex: unknown) =>
  typeof diceIndex === "number" && isDiceIndex(diceIndex)
    ? Effect.succeed<DiceIndex>(diceIndex)
    : Effect.fail(new Error("given diceIndex is not a valid one"));

const map =
  (fn: (die: Die.Die, index: DiceIndex) => Die.Die) =>
  (dice: Dice): Dice =>
    dice.map(fn as (die: Die.Die, index: number) => Die.Die) as any as Dice;

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
