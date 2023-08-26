import { Effect, pipe } from "effect";
import { Game, Score } from "../domain";

export const addScoreForScoreType = ({
  gameId,
  scoreType,
}: {
  gameId: Game.Id;
  scoreType: Score.ScorableScoreType;
}) =>
  pipe(
    gameId,
    Game.getGameById,
    Effect.flatMap(Game.addScoreForScoreType(scoreType)),
    Effect.flatMap(Game.storeGame)
  );
