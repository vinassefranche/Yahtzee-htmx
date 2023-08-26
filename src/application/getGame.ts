import { Game } from "../domain";

export const getGame =
  (gameId: Game.Id) =>
  ({ gameRepository }: { gameRepository: Game.GameRepository }) =>
    gameRepository.getById(gameId);
