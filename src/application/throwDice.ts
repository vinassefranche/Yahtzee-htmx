import { Effect } from "effect";
import { flow } from "effect/Function";
import { Game } from "../domain";

export const throwDice = flow(
  Game.getGameById,
  Effect.flatMap(Game.throwDice),
  Effect.flatMap(Game.storeGame)
);
