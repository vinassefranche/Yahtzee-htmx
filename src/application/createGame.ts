import { pipe } from "fp-ts/lib/function";
import { Game } from "../domain";

export const createGame =
() =>
  ({ gameRepository }: { gameRepository: Game.Repository }) =>
    pipe(Game.create(), gameRepository.store);
