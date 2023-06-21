// Render implementatio file
// import { mtl, tex, shd } from "./res/resource.js";
import * as mtl from "./res/material.js";
import * as tex from "./res/texture.js";
import * as shd from "./res/shader.js";
import { prim } from "./primitive.js";
import { mat4 } from "../../mth/mth.js";
import { vec3 } from "../../mth/mth.js";
import { gl } from "../../gl.js"
// import { player, otherPlayers } from "../../../client.js";

export class Render {
  constructor() {
    gl.clearColor(0.3, 0.47, 0.8, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    this.shaderDefault = shd.shader("default");
  }

  resInit() {
    this.material = mtl.material();
    this.texture = tex.texture();
    this.otherPrimitives = [];

    if (window.otherPlayers !== null) {
      for (let i = 0; i < window.otherPlayers.length; i++) {
        let tmpPrim = prim(gl.TRIANGLES, null, null, this.material.mtlNo, window.otherPlayers[i].id).createSphere(3, 102, 102);
        this.otherPrimitives.push(tmpPrim);
      }
    }
  }

  createSelfIfNotExists() {
    if (window.player !== null && this.playerPrimitive === undefined) {
      this.playerPrimitive = prim(gl.TRIANGLES, null, null, this.material.mtlNo, window.player.id).createSphere(3, 102, 102);
    }
  }

  getById(obj) {
    for (let i = 0; i < this.otherPrimitives.length; i++) {
      if (this.otherPrimitives[i].id === obj) {
        return i;
      }
    }
    return -1;
  }

  updatePlayers() {
    if (window.otherPlayers !== null) {
      //add
      if (this.otherPrimitives.length < window.otherPlayers.length) {
        let names = [];

        for (let i = 0; i < window.otherPlayers.length; i++) {
          let flag = 0;
          for (let j = 0; j < this.otherPrimitives.length; j++) {
             if (this.otherPrimitives[j].id === window.otherPlayers[i].id) {
              flag = 1;
             }
          }
          if (flag === 0) {
            names.push(window.otherPlayers[i].id);
          }
        }

        for (let g = 0; g < names.length; g++) {
          let tmpPr = prim(gl.TRIANGLES, null, null, this.material.mtlNo, names[g]).createSphere(3, 102, 102);
          this.otherPrimitives.push(tmpPr);
        }
      }

      //delete
      if (this.otherPrimitives.length > window.otherPlayers.length) {
        let buf = [];
        for (let x = 0; x < this.otherPrimitives.length; x++) {
          let flg = 0;
          for (let y = 0; y < window.otherPlayers.length; y++) {
            if (this.otherPrimitives[x].id === window.otherPlayers[y].id) {
              flg = 1;
            }
          }
          if (flg === 0) {
            buf.push(x);
          }
        }

        for (let z = 0; z < buf.length; z++) {
          this.otherPrimitives.splice(buf[z], 1);
        }
      }
    }
  }

  drawSelf() {
    // Draw player ptimitive
    if (window.player !== null) {
      this.playerPrimitive.draw(mat4().setTranslate(window.player.x, window.player.y, window.player.z));
    }
  }

  drawOther() {
    // Draw other primitives
    if (window.otherPlayers !== null) {
      for (let i = 0; i < window.otherPlayers.length; i++) {
        this.otherPrimitives[this.getById(window.otherPlayers[i].id)].draw(mat4().setTranslate(window.otherPlayers[i].x, window.otherPlayers[i].y, window.otherPlayers[i].z));
      }
    }
  }

  latentCamera() {
    if (window.player != null) {
      let pos = vec3(window.player.x, window.player.y, window.player.z);
      let dir = vec3(0, 0, -1).normalize();
      let norm = vec3(0, 1, 0);
      let camOld = vec3(window.anim.camera.loc);
      let camNew = pos.add(dir.mul(-18).add(norm.mul(8)));
      window.anim.camera.set(
        camOld.add(
          camNew.sub(camOld).mul(Math.sqrt(window.anim.timer.globalDeltaTime))
        ),
        pos.add(dir.mul(18)).add(norm.mul(-8)),
        norm
      );
    }
  }

  render() {
    gl.clearColor(0.3, 0.47, 0.8, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);

    this.createSelfIfNotExists();

    this.latentCamera();

    this.updatePlayers();
    this.drawSelf();
    this.drawOther();
  }
}
