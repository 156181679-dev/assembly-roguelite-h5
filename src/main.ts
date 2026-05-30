import "./style.css";
import { GameApp } from "./game/GameApp";

const canvas = document.querySelector<HTMLCanvasElement>("#game");

if (!canvas) {
  throw new Error("Missing #game canvas");
}

const app = new GameApp(canvas);
app.start();
