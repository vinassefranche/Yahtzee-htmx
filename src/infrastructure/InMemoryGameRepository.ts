import { Effect } from "effect";
import { Game } from "../domain";

export const buildInMemoryGameRepository = (): Game.GameRepository => {
  let games: ReadonlyArray<Game.Game> = [];
  return {
    getById: (id) => {
      const game = games.find((game) => game.id === id)
      if(!game) {
        return Effect.fail(new Error("game not found"))
      }
      return Effect.succeed(game)
    },
    store: (game) => {
      games = games.filter(({ id }) => id !== game.id).concat(game);
      return Effect.succeed(game);
    },
  };
};
