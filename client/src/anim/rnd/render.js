// Render implementatio file
// import { mtl, tex, shd } from "./res/resource.js";
import * as mtl from "./res/material.js";
import * as tex from "./res/texture.js";
import * as shd from "./res/shader.js";
import { prim } from "./primitive.js";
import { mat4 } from "../../mth/mth.js";
import { gl } from "../../gl.js"

// export const canvas = document.getElementById("glCanvas");
// export const gl = canvas.getContext("webgl2");

export class Render {
  constructor() {
    gl.clearColor(0.3, 0.47, 0.8, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    this.shaderDefault = shd.shader("default");
  }

  resInit() {
    this.material = mtl.material();
    this.texture = tex.texture();
    this.primitive = prim(
      gl.TRIANGLES,
      null,
      null,
      this.material.mtlNo
    ).createTorus(3, 1, 102, 102);
  }

  render() {
    gl.clearColor(0.3, 0.47, 0.8, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    this.primitive.draw(mat4().rotateX(window.anim.timer.globalTime * 100));
  }
}

// export function Render(...args) {
//   return new _Render(...args);
// }
