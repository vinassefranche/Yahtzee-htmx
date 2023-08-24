import { Game } from "../domain";

export const getGame =
  (gameId: Game.Id) =>
  ({ gameRepository }: { gameRepository: Game.Repository }) =>
    gameRepository.getById(gameId);
