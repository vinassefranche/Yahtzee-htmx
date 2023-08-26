import { pipe } from "effect";
import { Game } from "../domain";

export const createGame = () => pipe(Game.create(), Game.storeGame);
