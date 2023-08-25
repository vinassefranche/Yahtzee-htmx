import express from "express";
import { engine } from "express-handlebars";
import path from "path";
import { buildFileSqliteGameRepository } from "./infrastructure";
import { buildGameRouter } from "./presentation";

const app = express();
app.engine("handlebars", engine({ defaultLayout: false }));
app.set("view engine", "handlebars");
app.set("views", path.join(__dirname, "presentation", "views"));

app.use(express.static("build"));

const gameRepository = buildFileSqliteGameRepository();
app.use(buildGameRouter({ gameRepository }));

const port = 3000;
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
