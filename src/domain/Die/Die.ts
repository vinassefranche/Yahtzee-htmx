export const dieNumbers = [1, 2, 3, 4, 5, 6] as const;
export type DieNumber = (typeof dieNumbers)[number];
export type Die = { number: DieNumber; selected: boolean };

export const sumAll = (dice: ReadonlyArray<Die>) =>
  dice.reduce((acc, die) => acc + die.number, 0);

export const getRandomDieNumber = (): DieNumber =>
  dieNumbers[Math.floor(Math.random() * dieNumbers.length)]!;

export const initializeDie = (): Die => ({
  number: getRandomDieNumber(),
  selected: false,
});

export const toggleSelection = (die: Die): Die => ({
  ...die,
  selected: !die.selected,
});
