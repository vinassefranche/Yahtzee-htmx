import { taskEither } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import { Game } from "../domain";

export const throwDice =
  (gameId: Game.Id) =>
  ({ gameRepository }: { gameRepository: Game.Repository }) =>
    pipe(
      gameId,
      gameRepository.getById,
      taskEither.flatMapEither(Game.throwDice),
      taskEither.flatMap(gameRepository.store)
    );
