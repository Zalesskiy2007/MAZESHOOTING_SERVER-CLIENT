// Render implementatio file
// import { mtl, tex, shd } from "./res/resource.js";
import * as mtl from "./res/material.js";
import * as tex from "./res/texture.js";
import * as shd from "./res/shader.js";
import { prim } from "./primitive.js";
import { mat4 } from "../../mth/mth.js";
import { vec3 } from "../../mth/mth.js";
import { canvas, gl } from "../../gl.js";
import * as col from "../../mth/collision.js";


export class Render {
  constructor() {
    gl.clearColor(0.3, 0.47, 0.8, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    this.shaderDefault = shd.shader("default");
    this.shaderScope = shd.shader("scope");
  }

  resInit() {
    this.material = mtl.material();
    this.materialScope = mtl.material(
      "Scope material",
      vec3(1, 0, 0),
      vec3(1, 0, 0),
      vec3(1, 0, 0),
      30.0,
      1,
      null,
      shd.shaders[1]
    );
    this.texture = tex.texture();
    const x = 0.01 * canvas.clientHeight / canvas.clientWidth;
    const y = 0.01;
    this.scopePrim = prim(
      gl.TRIANGLE_STRIP,
      new Float32Array([
        -x,
        y,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        -x,
        -y,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        x,
        y,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        x,
        -y,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
      ]),
      null,
      this.materialScope.mtlNo
    );
    this.otherPrimitives = [];
    //[bmin, bmax]
    this.mazeH = 10;
    this.mazeFloor = 0;
    this.mazePos = [
      [vec3(-9, this.mazeFloor, -7), vec3(-5, this.mazeH, -6)],
      [vec3(-6, this.mazeFloor, -9), vec3(-5, this.mazeH, -7)],
      [vec3(-4, this.mazeFloor, -2), vec3(1, this.mazeH, -2)],
      [vec3(3, this.mazeFloor, -11), vec3(4, this.mazeH, -2)],
      [vec3(4, this.mazeFloor, -3), vec3(9, this.mazeH, -2)],
      [vec3(8, this.mazeFloor, -8), vec3(9, this.mazeH, -3)],
      [vec3(9, this.mazeFloor, -8), vec3(11, this.mazeH, -7)],
      [vec3(4, this.mazeFloor, -11), vec3(11, this.mazeH, -10)],
      [vec3(6, this.mazeFloor, 5), vec3(7, this.mazeH, 10)],
      [vec3(4, this.mazeFloor, 7), vec3(6, this.mazeH, 8)],
      [vec3(7, this.mazeFloor, 7), vec3(9, this.mazeH, 8)],
      [vec3(-5, this.mazeFloor, 7), vec3(-3, this.mazeH, 8)],
      [vec3(-6, this.mazeFloor, 6), vec3(-5, this.mazeH, 9)],
      [vec3(-8, this.mazeFloor, 8), vec3(-6, this.mazeH, 10)],
      [vec3(-11, this.mazeFloor, 10), vec3(-6, this.mazeH, 12)],
      [vec3(-12, this.mazeFloor, 10), vec3(-11, this.mazeH, 11)],
    ];

    mtl.loadMtlLib();

    if (window.otherPlayers !== null) {
      for (let i = 0; i < window.otherPlayers.length; i++) {
        let tmpPrim = prim(gl.TRIANGLES, null, null, mtl.findMtlByName(window.otherPlayers[i].color).mtlNo, window.otherPlayers[i].id).createSphere(3, 102, 102);
        this.otherPrimitives.push(tmpPrim);
      }
    }
  }

  createSelfIfNotExists() {
    if (window.player !== null && this.playerPrimitive === undefined) {
      this.playerPrimitive = prim(gl.TRIANGLES, null, null, mtl.findMtlByName(window.player.color).mtlNo, window.player.id).createSphere(3, 102, 102);
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
            names.push(window.otherPlayers[i]);
          }
        }

        for (let g = 0; g < names.length; g++) {
          let tmpPr = prim(gl.TRIANGLES, null, null, mtl.findMtlByName(names[g].color).mtlNo, names[g].id).createSphere(3, 102, 102);
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

  checkCollisionWithOther() {
    if (window.player !== null && this.playerPrimitive !== undefined && window.otherPlayers !== null) {
      /**/
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

    // Draw players
    this.updatePlayers();
    //this.checkCollisionWithOther();
    this.drawSelf();
    this.drawOther();

    // Draw scope
    this.scopePrim.draw();
  }
}
