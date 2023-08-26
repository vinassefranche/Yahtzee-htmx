import { taskEither } from "fp-ts";
import { pipe } from "fp-ts/lib/function";
import { Game, Score } from "../domain";

export const addScoreForScoreType =
  ({
    gameId,
    scoreType,
  }: {
    gameId: Game.Id;
    scoreType: Score.ScorableScoreType;
  }) =>
  ({ gameRepository }: { gameRepository: Game.GameRepository }) =>
    pipe(
      gameId,
      gameRepository.getById,
      taskEither.flatMapEither(Game.addScoreForScoreType(scoreType)),
      taskEither.flatMap(gameRepository.store)
    );
