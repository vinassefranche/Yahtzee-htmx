import { taskEither } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import { Dice, Game } from "../domain";

export const toggleDieSelection =
  ({ gameId, diceIndex }: { gameId: Game.Id; diceIndex: Dice.DiceIndex }) =>
  ({ gameRepository }: { gameRepository: Game.GameRepository }) =>
    pipe(
      gameId,
      gameRepository.getById,
      taskEither.flatMapEither(Game.toggleDieSelection(diceIndex)),
      taskEither.flatMap(gameRepository.store)
    );
