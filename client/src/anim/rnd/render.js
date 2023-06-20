// Render implementatio file
// import { mtl, tex, shd } from "./res/resource.js";
import * as mtl from "./res/material.js";
import * as tex from "./res/texture.js";
import * as shd from "./res/shader.js";
import { prim } from "./primitive.js";
import { mat4 } from "../../mth/mth.js";
import { gl } from "../../gl.js"
// import { player, otherPlayers } from "../../../client.js";

export class Render {
  constructor() {
    gl.clearColor(0.3, 0.47, 0.8, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    this.shaderDefault = shd.shader("default");
    this.playersCnt = 0;
  }

  resInit() {
    this.material = mtl.material();
    this.texture = tex.texture();
    this.otherPrimitives = [];
    this.otherPrimId = [];
    this.otherObjId = [];

    if (window.otherPlayers !== null) {
      this.otherCnt = window.otherPlayers.length;
    } else {
      this.otherCnt = 0;
    }

    for (let i = 0; i < this.otherCnt; i++) {
      let tmpPrim = prim(gl.TRIANGLES, null, null, this.material.mtlNo, window.otherPlayers[i].socketId).createSphere(3, 102, 102);
      this.otherPrimitives.push(tmpPrim);
      this.otherPrimId.push(tmpPrim.id);
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

  createSelfIfNotExists() {
    if (window.player !== null && this.playerPrimitive === undefined) {
      this.playerPrimitive = prim(gl.TRIANGLES, null, null, this.material.mtlNo, window.player.id).createSphere(3, 102, 102);
    }
  }

  updatePlayers() {
    this.otherObjId = [];
    if (window.otherPlayers !== null) {
      for (let i = 0; i < window.otherPlayers.length; i++) {
        this.otherObjId.push(window.otherPlayers[i].id);
      }
        
      //add
      if (this.otherCnt < window.otherPlayers.length) {
        let difference = this.otherObjId.filter(x => !this.otherPrimId.includes(x));

        this.otherCnt += difference.length;
        for (let g = 0; g < difference.length; g++) {
          let tmpPr = prim(gl.TRIANGLES, null, null, this.material.mtlNo, difference[g]).createSphere(3, 102, 102);
          this.otherPrimitives.push(tmpPr);
          this.otherPrimId.push(difference[g]);
        }
      }

      //delete
      if (this.otherCnt > window.otherPlayers.length) {
        let difference = this.otherPrimId.filter(x => !this.otherObjId.includes(x));
        console.log(difference);

        this.otherCnt -= difference.length;
        for (let g = 0; g < difference.length; g++) {
          console.log(this.getById(difference[g]));
          let posPrim = this.otherPrimitives.indexOf(this.otherPrimitives[this.getById(difference[g])]);
          let posId = this.otherPrimId.indexOf(difference[g]);
          console.log("PosPrim:" + posPrim)

          if (posPrim > -1) {
            this.otherPrimitives.splice(posPrim, 1);
            console.log("Hello");
          }
          if (posId > -1) {
            this.otherPrimId.splice(posId, 1);
            console.log("Anyone");
          }
        }

        console.log(this.otherPrimitives);
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
    for (let i = 0; i < this.otherCnt; i++) {
      this.otherPrimitives[this.getById(window.otherPlayers[i].id)].draw(mat4().setTranslate(window.otherPlayers[i].x, window.otherPlayers[i].y, window.otherPlayers[i].z))
    }
  }

  render() {
    gl.clearColor(0.3, 0.47, 0.8, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);

    this.createSelfIfNotExists();
    this.updatePlayers();
    this.drawSelf();
    this.drawOther();
  }
}
