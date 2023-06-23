// Primitives handle module
import { mat4, vec3, vec2, vec4 } from "../../mth/mth.js";
import * as mtl from "./res/material.js";
import { gl } from "../../gl.js";
import { vertex, toArray, getVertexArray, autoNormals } from "./vertex.js";

// Primitive class
class _prim {
  constructor(type, vertexArray, indexArray, mtlNo, socketId) {
    if (vertexArray != null) {
      // Generate and bind vertex buffer
      this.vBuf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vBuf);
      // Generate and bind vertex array
      this.vA = gl.createVertexArray();
      gl.bindVertexArray(this.vA);

      // Upload data
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array(vertexArray),
        gl.STATIC_DRAW
      );
      gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 4 * 12, 0);
      gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 4 * 12, 4 * 3);
      gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 4 * 12, 4 * 5);
      gl.vertexAttribPointer(3, 4, gl.FLOAT, false, 4 * 12, 4 * 8);
      gl.enableVertexAttribArray(0);
      gl.enableVertexAttribArray(1);
      gl.enableVertexAttribArray(2);
      gl.enableVertexAttribArray(3);
      gl.bindVertexArray(null);
    }
    if (indexArray != null) {
      // Generate and bind index buffer
      this.iBuf = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iBuf);

      // Upload data
      gl.bufferData(
        gl.ELEMENT_ARRAY_BUFFER,
        new Int32Array(indexArray),
        gl.STATIC_DRAW
      );
      this.numOfElements = indexArray.length;
    } else if (indexArray == null && vertexArray != null) {
      this.numOfElements = vertexArray.length;
    } else this.numOfElements = 0;
    this.transMatrix = mat4();
    if (type != null) {
      this.mtlNo = mtlNo;
      this.type = type;
      this.id = socketId;
    }
  }

  // Primitive drawing function
  draw(worldMatrix) {
    if (worldMatrix == undefined) worldMatrix = mat4();
    const w = mat4().mul2(this.transMatrix, worldMatrix);
    const winv = mat4(w).inverse().transpose();
    const wvp = mat4(w).mul(window.anim.camera.matrVP);

    const progId = mtl.materials[this.mtlNo].apply(this.mtlNo);

    let loc;
    // Pass matrices
    if ((loc = gl.getUniformLocation(progId, "MatrW")) != -1)
      gl.uniformMatrix4fv(loc, false, new Float32Array(w.toArray()));
    if ((loc = gl.getUniformLocation(progId, "MatrWInv")) != -1)
      gl.uniformMatrix4fv(loc, false, new Float32Array(winv.toArray()));
    if ((loc = gl.getUniformLocation(progId, "MatrWVP")) != -1)
      gl.uniformMatrix4fv(loc, false, new Float32Array(wvp.toArray()));

    // Pass material data
    if ((loc = gl.getUniformLocation(progId, "Ka")) != -1) {
      let ka = mtl.materials[this.mtlNo].ka;
      gl.uniform3f(loc, ka.x, ka.y, ka.z);
    }
    if ((loc = gl.getUniformLocation(progId, "Kd")) != -1) {
      let kd = mtl.materials[this.mtlNo].kd;
      gl.uniform3f(loc, kd.x, kd.y, kd.z);
    }
    if ((loc = gl.getUniformLocation(progId, "Ks")) != -1) {
      let ks = mtl.materials[this.mtlNo].ks;
      gl.uniform3f(loc, ks.x, ks.y, ks.z);
    }
    if ((loc = gl.getUniformLocation(progId, "Ph")) != -1)
      gl.uniform1f(loc, mtl.materials[this.mtlNo].ph);

    // Pass time
    if ((loc = gl.getUniformLocation(progId, "Time")) != -1)
      gl.uniform1f(loc, window.anim.timer.globalTime);

    // Pass camera data
    if ((loc = gl.getUniformLocation(progId, "CamLoc")) != -1)
      gl.uniform3f(
        loc,
        window.anim.camera.loc.x,
        window.anim.camera.loc.y,
        window.anim.camera.loc.z
      );
    if ((loc = gl.getUniformLocation(progId, "CamDir")) != -1)
      gl.uniform3f(
        loc,
        window.anim.camera.dir.x,
        window.anim.camera.dir.y,
        window.anim.camera.dir.z
      );

    gl.bindVertexArray(this.vA);
    if (this.iBuf != undefined) {
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.iBuf);
      gl.drawElements(this.type, this.numOfElements, gl.UNSIGNED_INT, 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    } else gl.drawArrays(this.type, 0, this.numOfElements);

    gl.bindVertexArray(null);
  }

  // Sphere creation function
  createSphere(radius, width, height) {
    let vertexArray = [],
      indexArray = [];

    // Create vertex array for sphere
    for (
      let i = 0, k = 0, theta = 0;
      i < height;
      i++, theta += Math.PI / (height - 1)
    )
      for (
        let j = 0, phi = 0;
        j < width;
        j++, phi += (2 * Math.PI) / (width - 1)
      ) {
        vertexArray[k++] = vertex(
          vec3(
            radius * Math.sin(theta) * Math.sin(phi),
            radius * Math.cos(theta),
            radius * Math.sin(theta) * Math.cos(phi)
          ),
          vec2(0),
          vec3(
            Math.sin(theta) * Math.sin(phi),
            Math.cos(theta),
            Math.sin(theta) * Math.cos(phi)
          ),
          vec4(1, 1, 0, 1)
        );
      }

    // Create index array for sphere
    for (let k = 0, ind = 0, i = 0; i < height - 1; i++, ind++)
      for (let j = 0; j < width - 1; j++, ind++) {
        indexArray[k++] = ind;
        indexArray[k++] = ind + 1;
        indexArray[k++] = ind + width;

        indexArray[k++] = ind + width + 1;
        indexArray[k++] = ind + 1;
        indexArray[k++] = ind + width;
      }

    // Create new sphere primitive
    return new prim(
      gl.TRIANGLES,
      toArray(vertexArray),
      indexArray,
      this.mtlNo,
      this.id
    );
  }

  // Torus creation function
  createTorus(radiusInner, radiusOuther, width, height) {
    let vertexArray = [],
      indexArray = [];

    // Create vertex array for torus
    for (
      let i = 0, k = 0, alpha = 0;
      i < height;
      i++, alpha += (2 * Math.PI) / (height - 1)
    )
      for (
        let j = 0, phi = 0;
        j < width;
        j++, phi += (2 * Math.PI) / (width - 1)
      ) {
        vertexArray[k++] = vertex(
          vec3(
            (radiusInner + radiusOuther * Math.cos(alpha)) * Math.sin(phi),
            radiusOuther * Math.sin(alpha),
            (radiusInner + radiusOuther * Math.cos(alpha)) * Math.cos(phi)
          ),
          vec2(0),
          vec3(
            Math.cos(alpha) * Math.sin(phi),
            Math.sin(alpha),
            Math.cos(alpha) * Math.cos(phi)
          ),
          vec4(1, 1, 0, 1)
        );
      }

    // Create index array for torus
    for (let i = 0, k = 0, ind = 0; i < height - 1; ind++, i++)
      for (let j = 0; j < width - 1; j++, ind++) {
        indexArray[k++] = ind;
        indexArray[k++] = ind + 1;
        indexArray[k++] = ind + width;

        indexArray[k++] = ind + width + 1;
        indexArray[k++] = ind + 1;
        indexArray[k++] = ind + width;
      }

    // Create new torus primitive
    return new prim(
      gl.TRIANGLES,
      toArray(vertexArray),
      indexArray,
      this.mtlNo,
      this.id
    );
  }

  box(bMin, bMax) {
    const positions = [
      bMax.x, bMax.y, bMin.z, 
      bMax.x, bMax.y, bMax.z, 
      bMax.x, bMin.y, bMax.z, 
      bMax.x, bMin.y, bMin.z, 
      bMin.x, bMax.y, bMax.z, 
      bMin.x, bMax.y, bMin.z, 
      bMin.x, bMin.y, bMin.z, 
      bMin.x, bMin.y, bMax.z, 
      bMin.x, bMax.y, bMax.z, 
      bMax.x, bMax.y, bMax.z, 
      bMax.x, bMax.y, bMin.z, 
      bMin.x, bMax.y, bMin.z,
      bMin.x, bMin.y, bMin.z,
      bMax.x, bMin.y, bMin.z, 
      bMax.x, bMin.y, bMax.z, 
      bMin.x, bMin.y, bMax.z, 
      bMax.x, bMax.y, bMax.z, 
      bMin.x, bMax.y, bMax.z, 
      bMin.x, bMin.y, bMax.z, 
      bMax.x, bMin.y, bMax.z, 
      bMin.x, bMax.y, bMin.z,
      bMax.x, bMax.y, bMin.z, 
      bMax.x, bMin.y, bMin.z, 
      bMin.x, bMin.y, bMin.z,
    ]
    const indices = [
      0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7, 8, 9, 10, 8, 10, 11, 12, 13, 14,
      12, 14, 15, 16, 17, 18, 16, 18, 19, 20, 21, 22, 20, 22, 23,
    ]

    let boxVertexArray = getVertexArray(positions, null, null, null);
    autoNormals(boxVertexArray, indices);

    console.log(boxVertexArray);

    return new prim(gl.TRIANGLES,
      toArray(boxVertexArray),
      indices,
      this.mtlNo,
      this.id);
  }  
}

export function prim(...args) {
  return new _prim(...args);
}
