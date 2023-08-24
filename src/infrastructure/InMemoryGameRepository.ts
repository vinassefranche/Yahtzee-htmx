import { readonlyArray, taskEither } from "fp-ts";
import { Game } from "../domain";
import { pipe } from "fp-ts/lib/function";

export const buildInMemoryGameRepository = (): Game.Repository => {
  let games: ReadonlyArray<Game.Game> = [];
  return {
    getById: (id) => {
      return pipe(
        games,
        readonlyArray.findFirst((game) => game.id === id),
        taskEither.fromOption(() => new Error("game not found"))
      );
    },
    store: (game) => {
      games = games.filter(({ id }) => id !== game.id).concat(game);
      return taskEither.right(game);
    },
  };
};
