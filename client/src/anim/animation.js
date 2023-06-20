import { Timer } from "./timer.js";
import { Render } from "./rnd/render.js";
import { camera } from "../mth/camera.js";
import { canvas } from "../gl.js";
import { vec3 } from "../mth/vec3.js";

export class Anim {
  constructor() {
    this.timer = new Timer();
    this.render = new Render();
    this.camera = camera();
  }
  response() {
    this.timer.response();
    let speed = 30.0;
    // Player control
    if (window.player !== null) {
      if (window.activeButtons.includes("KeyW")) {
        window.player.z -= window.anim.timer.globalDeltaTime * speed;
        window.socket.emit(
          "MTS:Change_Player_State",
          JSON.stringify(window.player)
        );
      }
      if (window.activeButtons.includes("KeyS")) {
        window.player.z += window.anim.timer.globalDeltaTime * speed;
        window.socket.emit(
          "MTS:Change_Player_State",
          JSON.stringify(window.player)
        );
      }
      if (window.activeButtons.includes("KeyD")) {
        window.player.x += window.anim.timer.globalDeltaTime * speed;
        window.socket.emit(
          "MTS:Change_Player_State",
          JSON.stringify(window.player)
        );
      }
      if (window.activeButtons.includes("KeyA")) {
        window.player.x -= window.anim.timer.globalDeltaTime * speed;
        window.socket.emit(
          "MTS:Change_Player_State",
          JSON.stringify(window.player)
        );
      }
    }
  }
  draw() {
    this.camera.setSize(canvas.clientWidth, canvas.clientHeight);
    this.render.render();
  }
}
