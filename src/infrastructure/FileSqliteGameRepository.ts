import { Effect, pipe } from "effect";
import { either } from "fp-ts";
import * as Decoder from "io-ts/Decoder";
import path from "path";
import sqlite3 from "sqlite3";
import { Game } from "../domain";

sqlite3.verbose();

export const buildFileSqliteGameRepository
 =
  (): Game.GameRepository => {
    const db = new sqlite3.Database(path.join(__dirname, "games.db"));
    db.serialize(() => {
      db.run(
        "CREATE TABLE IF NOT EXISTS games (id TEXT PRIMARY KEY, data TEXT NOT NULL)"
      );
    });
    return {
      getById: (id) => {
        return Effect.async<never, Error, any>((resume) => {
          db.get(
            "SELECT id, data FROM games WHERE id = ?",
            [id],
            (err, row) => {
              if (err) {
                return resume(Effect.fail(err));
              }
              if (!row) {
                return resume(Effect.fail(new Error("game not found")));
              }
              if (
                typeof row !== "object" ||
                !("id" in row) ||
                !("data" in row) ||
                typeof row.data !== "string"
              ) {
                return resume(
                  Effect.fail(
                    new Error("an issue occurred while retrieving the game")
                  )
                );
              }
              resume(Effect.succeed({ ...JSON.parse(row.data), id: row.id }));
            }
          );
        }).pipe(
          Effect.flatMap((result) =>
            pipe(
              result,
              Game.codec.decode,
              either.matchW(
                (errors) => Effect.fail(Error(Decoder.draw(errors))),
                (game) => Effect.succeed(game)
              )
            )
          )
        );
      },
      store: <T extends Game.Game>(game: T) => {
        return Effect.async<never, Error, T>((resume) => {
          const { id, ...data } = Game.codec.encode(game);
          db.run(
            `INSERT INTO games (id, data) VALUES (?, ?)
                  ON CONFLICT(id) DO UPDATE SET
                  data=excluded.data`,
            [game.id, JSON.stringify(data)],
            (err) => {
              if (err) {
                return resume(Effect.fail(err));
              }
              resume(Effect.succeed(game));
            }
          );
        });
      },
    };
  };
