import { taskEither } from "fp-ts";
import { Game } from "../domain";
import { pipe } from "fp-ts/lib/function";

export const resetGame =
  (gameId: Game.Id) =>
  ({ gameRepository }: { gameRepository: Game.GameRepository }) =>
    pipe(
      gameId,
      gameRepository.getById,
      taskEither.map(Game.reset),
      taskEither.flatMap(gameRepository.store)
    );
