import { Effect, pipe } from "effect";
import { Dice, Game } from "../domain";

export const toggleDieSelection = ({
  gameId,
  diceIndex,
}: {
  gameId: Game.Id;
  diceIndex: Dice.DiceIndex;
}) =>
  pipe(
    gameId,
    Game.getGameById,
    Effect.flatMap(Game.toggleDieSelection(diceIndex)),
    Effect.flatMap(Game.storeGame)
  );
