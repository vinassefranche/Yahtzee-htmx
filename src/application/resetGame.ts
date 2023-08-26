import { Effect } from "effect";
import { Game } from "../domain";
import { flow } from "effect/Function";

export const resetGame = flow(
  Game.getGameById,
  Effect.map(Game.reset),
  Effect.flatMap(Game.storeGame)
);
