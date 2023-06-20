// Textures implementation file
// import * as rnd from "../render.js";
import { gl } from "../../../gl.js";

class _texture {
  constructor(fileName) {
    this.id = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.id);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array([255, 255, 255, 0])
    );

    const img = new Image();
    img.src = fileName;
    img.onload = () => {
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        img
      );
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(
        gl.TEXTURE_2D,
        gl.TEXTURE_WRAP_S,
        gl.REPEAT
      );
      gl.texParameteri(
        gl.TEXTURE_2D,
        gl.TEXTURE_WRAP_T,
        gl.REPEAT
      );
      gl.texParameteri(
        gl.TEXTURE_2D,
        gl.TEXTURE_MIN_FILTER,
        gl.LINEAR_MIPMAP_LINEAR
      );
      gl.texParameteri(
        gl.TEXTURE_2D,
        gl.TEXTURE_MAG_FILTER,
        gl.LINEAR
      );
    };
  }
  apply(shd, texUnit) {
    if (shd == undefined || shd.id == undefined || shd.id == null) return;

    let loc = gl.getUniformLocation(shd.id, "Texture0");
    gl.activeTexture(gl.TEXTURE0 + texUnit);
    gl.bindTexture(this.type, this.id);
    gl.uniform1i(loc, texUnit);
  }
}

export function texture(...args) {
  return new _texture(...args);
}
