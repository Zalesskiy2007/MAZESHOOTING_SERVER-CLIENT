import { Timer } from "./timer.js";
import { Render } from "./rnd/render.js";
import { camera } from "../mth/camera.js";
import { canvas } from "../gl.js";
import { control } from "./input.js";

export class Anim {
  constructor() {
    this.timer = new Timer();
    this.render = new Render();
    this.camera = camera();
    this.control = control();
  }
  response() {
    this.timer.response();
    this.control.response();
  }
  draw() {
    this.camera.setSize(canvas.clientWidth, canvas.clientHeight);
    this.render.render();
  }
}
