import { either, taskEither } from "fp-ts";
import { Game } from "../domain";
import sqlite3 from "sqlite3";
import { flow, pipe } from "fp-ts/lib/function";
import * as Decoder from "io-ts/Decoder";
import path from "path";

sqlite3.verbose();
export const buildFileSqliteGameRepository = (): Game.Repository => {
  const db = new sqlite3.Database(path.join(__dirname, "games.db"));
  db.serialize(() => {
    db.run(
      "CREATE TABLE IF NOT EXISTS games (id TEXT PRIMARY KEY, data TEXT NOT NULL)"
    );
  });
  return {
    getById: (id) => {
      return pipe(
        taskEither.tryCatch(
          () =>
            new Promise((resolve, reject) => {
              db.get(
                "SELECT id, data FROM games WHERE id = ?",
                [id],
                (err, row) => {
                  if (err) {
                    return reject(err);
                  }
                  if (!row) {
                    return reject(new Error("game not found"));
                  }
                  if (
                    typeof row !== "object" ||
                    !('id' in row) ||
                    !("data" in row) ||
                    typeof row.data !== "string"
                  ) {
                    return reject(
                      new Error("an issue occurred while retrieving the game")
                    );
                  }
                  resolve({...JSON.parse(row.data), id: row.id});
                }
              );
            }),
          (error) => (error instanceof Error ? error : new Error(String(error)))
        ),
        taskEither.flatMapEither(
          flow(
            Game.codec.decode,
            either.mapLeft((errors) => new Error(Decoder.draw(errors)))
          )
        )
      );
    },
    store: (game) => {
      return pipe(
        taskEither.tryCatch(
          () =>
            new Promise((resolve, reject) => {
              const { id, ...data } = Game.codec.encode(game);
              db.run(
                `INSERT INTO games (id, data) VALUES (?, ?)
                  ON CONFLICT(id) DO UPDATE SET
                  data=excluded.data`,
                [game.id, JSON.stringify(data)],
                (err) => {
                  if (err) {
                    return reject(err);
                  }
                  resolve(game);
                }
              );
            }),
          (error) => (error instanceof Error ? error : new Error(String(error)))
        )
      );
    },
  };
};
