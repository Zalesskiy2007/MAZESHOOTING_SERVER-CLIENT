// Input system implementation file
import { vec3 } from "../mth/vec3.js";
import { mat4 } from "../mth/mat4.js";
import { rayIntersectSphere, ray, sphere } from "../mth/collision.js";
import * as col from "../mth/collision.js";
import {walls, mazePos} from "../anim/rnd/render.js";

class _control {
  constructor() {
    this.dir = vec3(0, 0, -1);
    this.pos = vec3(0);
    this.posOld = vec3(0);
    this.deltaPos = vec3(0);
    this.norm = vec3(0, 1, 0);
    this.right = vec3(1, 0, 0);
    this.speed = 53.0;
  }
  response() {
    this.dir = this.dir
      .mulMatr(
        mat4()
          .rotateY(window.anim.timer.globalDeltaTime * -18 * window.mouseDx)
          .rotate(
            window.anim.timer.globalDeltaTime * -0.1 * window.mouseDy,
            this.right
          )
      )
      .normalize();

    if (window.player !== null) {
      this.deltaPos = vec3(0);
      if (window.activeButtons.includes("KeyW")) {
        this.deltaPos = this.dir.mul(
          window.anim.timer.globalDeltaTime * this.speed
        );
        this.deltaPos.y = 0;
      }
      if (window.activeButtons.includes("KeyS")) {
        this.deltaPos = this.dir.mul(
          -window.anim.timer.globalDeltaTime * this.speed
        );
        this.deltaPos.y = 0;
      }
      if (window.activeButtons.includes("KeyD")) {
        this.deltaPos = this.dir
          .cross(this.norm)
          .mul(window.anim.timer.globalDeltaTime * this.speed / 3.0);
        this.deltaPos.y = 0;
      }
      if (window.activeButtons.includes("KeyA")) {
        this.deltaPos = this.dir
          .cross(this.norm)
          .mul(-window.anim.timer.globalDeltaTime * this.speed / 3.0);
        this.deltaPos.y = 0;
      }
      if (window.isClicked) {
        let r = ray(window.anim.camera.loc, window.anim.camera.dir);
        for (let i = 0; i < window.otherPlayers.length; i++) {
          let sph = sphere(
            vec3(
              window.otherPlayers[i].x,
              window.otherPlayers[i].y,
              window.otherPlayers[i].z
            ),
            3.0
          );
          if (rayIntersectSphere(r, sph)) {
            window.socket.emit(
              "MTS:Player_Shoot_Player",
              [
                JSON.stringify(window.player),
                JSON.stringify(window.otherPlayers[i]),
              ].join("|")
            );
            break;
          }
        }
      }
      this.pos = this.posOld.add(this.deltaPos);
      this.right = this.dir.cross(this.norm).normalize();

      let flag = 0;

      //check collision player-other players
      if (window.otherPlayers !== null) {
        for (let i = 0; i < window.otherPlayers.length; i++) {
          if (col.checkCollisionSphereAndSphere(vec3(this.pos.x, this.pos.y, this.pos.z), 3, vec3(window.otherPlayers[i].x, window.otherPlayers[i].y, window.otherPlayers[i].z), 3)) {
            while(col.checkCollisionSphereAndSphere(vec3(this.pos.x, this.pos.y, this.pos.z), 3, vec3(window.otherPlayers[i].x, window.otherPlayers[i].y, window.otherPlayers[i].z), 3)) {
              if (Math.abs(this.deltaPos.x) === 0 && Math.abs(this.deltaPos.y) === 0 && Math.abs(this.deltaPos.z) === 0) {
                this.deltaPos.x = 1;
              } else {
                this.pos = this.pos.sub(this.deltaPos);
              }
            }
          }
        }
      }

      //check collision player-walls
      for (let i = 0; i < walls.length; i++) {
        if (col.checkCollisionSphereAndBox(mazePos[i][0], mazePos[i][1], vec3(this.pos.x, this.pos.y, this.pos.z), 3)) {
          while(col.checkCollisionSphereAndBox(mazePos[i][0], mazePos[i][1], vec3(this.pos.x, this.pos.y, this.pos.z), 3)) {
            if (Math.abs(this.deltaPos.x) === 0 && Math.abs(this.deltaPos.y) === 0 && Math.abs(this.deltaPos.z) === 0) {
              this.deltaPos.x = 1;
            } else {
              this.pos = this.pos.sub(this.deltaPos);
            }
          }
        }
      }

      this.posOld = this.pos;
      if (flag === 0) {
        window.player.x = this.pos.x;
        window.player.y = this.pos.y;
        window.player.z = this.pos.z;

        //   console.log(this.dir);
        let camOld = vec3(window.anim.camera.loc);
        let camNew = this.pos.add(this.dir.mul(-18).add(this.norm.mul(8)));
        window.anim.camera.set(
          camOld.add(
            camNew
              .sub(camOld)
              .mul(
                Math.sqrt(
                  window.mouseDx + window.mouseDy != null
                    ? window.anim.timer.globalDeltaTime * 0.5
                    : 1
                )
              )
          ),
          this.pos
            .add(this.dir.mul(18))
            .add(this.norm.mul(0.53))
            .add(this.dir.cross(this.norm).mul(-10)),
          this.norm
        );
      }
      window.socket.emit(
        "MTS:Change_Player_State",
        JSON.stringify(window.player)
      );
    }
    window.mouseDx = 0;
    window.mouseDy = 0;
  }
}

export function control(...args) {
  return new _control(...args);
}
