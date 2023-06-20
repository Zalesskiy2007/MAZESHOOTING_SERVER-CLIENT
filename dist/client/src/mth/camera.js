import { mat4 } from "./mat4.js";
import { vec3 } from "./vec3.js";

class _camera {
  constructor() {
    // Projection properties
    this.projSize = 0.1; // Project plane fit square
    this.projDist = 0.1; // Distance to project plane from viewer (near)
    this.projFarClip = 2000; // Distance to project far clip plane (far)

    // Local size data
    this.frameW = 30; // Frame width
    this.frameH = 30; // Frame height

    // Matrices
    this.matrView = mat4(); // View coordinate system matrix
    this.matrProj = mat4(); // Projection coordinate system matrix
    this.matrVP = mat4(); // View and projection matrix precalculate value

    // Set camera default settings
    this.loc = vec3(); // Camera location
    this.at = vec3(); // Camera destination
    this.dir = vec3(); // Camera Direction
    this.up = vec3(); // Camera UP direction
    this.right = vec3(); // Camera RIGHT direction
    this.setDef();
  } // End of 'constructor' function

  // Camera parmeters setting function
  set(loc, at, up) {
    this.matrView.setView(loc, at, up);
    this.loc = vec3(loc);
    this.at = vec3(at);
    this.dir.set(
      -this.matrView.m[0][2],
      -this.matrView.m[1][2],
      -this.matrView.m[2][2]
    );
    this.up.set(
      this.matrView.m[0][1],
      this.matrView.m[1][1],
      this.matrView.m[2][1]
    );
    this.right.set(
      this.matrView.m[0][0],
      this.matrView.m[1][0],
      this.matrView.m[2][0]
    );
    this.matrVP = mat4(this.matrView).mul(this.matrProj);
  } // End of 'set' function

  // Projection parameters setting function.
  setProj(projSize, projDist, projFarClip) {
    let rx = projSize,
      ry = projSize;

    this.projDist = projDist;
    this.projSize = projSize;
    this.projFarClip = projFarClip;

    // Correct aspect ratio
    if (this.frameW > this.frameH) rx *= this.frameW / this.frameH;
    else ry *= this.frameH / this.frameW;
    this.matrProj.setFrustum(
      -rx / 2.0,
      rx / 2.0,
      -ry / 2.0,
      ry / 2.0,
      projDist,
      projFarClip
    );

    // pre-calculate view * proj matrix
    this.matrVP = mat4(this.matrView).mul(this.matrProj);
  } // End of 'setProj' function

  // Resize camera and projection function.
  setSize(frameW, frameH) {
    if (frameW < 1) frameW = 1;
    if (frameH < 1) frameH = 1;
    this.frameW = frameW;
    this.frameH = frameH;
    // Reset projection with new render window size
    this.setProj(this.projSize, this.projDist, this.projFarClip);
  } // End of 'setSize' function

  // Camera set default values function.
  setDef() {
    this.loc.set(0, 15.3, 15.3);
    this.at.set(0, 0, 0);
    this.dir.set(0, 0, -1);
    this.up.set(0, 1, 0);
    this.right.set(1, 0, 0);

    this.projDist = 0.1;
    this.projSize = 0.1;
    this.projFarClip = 6000;

    this.frameW = 47;
    this.frameH = 47;

    this.set(this.loc, this.at, this.up);
    this.setProj(this.projSize, this.projDist, this.projFarClip);
    this.setSize(this.frameW, this.frameH);
  } // End of 'setDef' function
} // End of 'camera' class

export function camera(...args) {
  return new _camera(args);
} // End of 'mat4' function

/* END OF 'camera.js' FILE */
