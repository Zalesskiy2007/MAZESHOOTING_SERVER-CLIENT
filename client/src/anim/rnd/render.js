// Render implementatio file
// import { mtl, tex, shd } from "./res/resource.js";
import * as mtl from "./res/material.js";
import * as tex from "./res/texture.js";
import * as shd from "./res/shader.js";
import { prim } from "./primitive.js";
import { mat4 } from "../../mth/mth.js";
import { vec3 } from "../../mth/mth.js";
import { canvas, gl } from "../../gl.js";

export let walls = [];
let mazeH = 10;
let mazeFloor = 0;
export let mazePos = [
  [vec3(-9, mazeFloor, -7), vec3(-5, mazeH, -6)],
  [vec3(-6, mazeFloor, -9), vec3(-5, mazeH, -7)],
 // [vec3(-4, mazeFloor, -2), vec3(1, mazeH, 2)],
  [vec3(3, mazeFloor, -11), vec3(4, mazeH, -2)],
  [vec3(4, mazeFloor, -3), vec3(9, mazeH, -2)],
  [vec3(8, mazeFloor, -8), vec3(9, mazeH, -3)],
  [vec3(9, mazeFloor, -8), vec3(11, mazeH, -7)],
  [vec3(4, mazeFloor, -11), vec3(11, mazeH, -10)],
  [vec3(6, mazeFloor, 5), vec3(7, mazeH, 10)],
  [vec3(4, mazeFloor, 7), vec3(6, mazeH, 8)],
  [vec3(7, mazeFloor, 7), vec3(9, mazeH, 8)],
  [vec3(-5, mazeFloor, 7), vec3(-3, mazeH, 8)],
  [vec3(-6, mazeFloor, 6), vec3(-5, mazeH, 9)],
  [vec3(-8, mazeFloor, 8), vec3(-6, mazeH, 10)],
  [vec3(-11, mazeFloor, 10), vec3(-6, mazeH, 12)],
  [vec3(-12, mazeFloor, 10), vec3(-11, mazeH, 11)],

  [vec3(-60, mazeFloor, -60), vec3(-60, mazeH, 60)],
  [vec3(-60, mazeFloor, -60), vec3(60, mazeH, -60)],
  [vec3(60, mazeFloor, -60), vec3(60, mazeH, 60)],
  [vec3(-60, mazeFloor, 60), vec3(60, mazeH, 60)],
];

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

    mtl.loadMtlLib();
    for (let x = 0; x < mazePos.length; x++) {
      mazePos[x][0] = mazePos[x][0].mul(5);
      mazePos[x][0].y -= 3;
      mazePos[x][1] = mazePos[x][1].mul(5);
      walls.push(prim(gl.TRIANGLES, null, null, mtl.findMtlByName("Obsidian").mtlNo, x).box(mazePos[x][0], mazePos[x][1]));
    }
    this.floor = prim(gl.TRIANGLES, null, null, mtl.findMtlByName("Obsidian").mtlNo, x).box(vec3(-300, -6, -300), vec3(300, -3, 300));

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

  drawWalls() {
    for (let x = 0; x < walls.length; x++) {
      walls[x].draw();
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


    this.floor.draw();
    this.drawWalls();
    this.createSelfIfNotExists();

    // Draw players
    this.updatePlayers();
    this.drawSelf();
    this.drawOther();

    // Draw scope
    this.scopePrim.draw();
  }
}
