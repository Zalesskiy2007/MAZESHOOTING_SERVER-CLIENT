// Material implementation file
import { vec3 } from "../../../mth/mth.js";
// import { rnd, shd, tex } from "./resource.js";
import * as shd from "./shader.js"
import { gl } from "../../../gl.js";

export let materials = [];
export let materialsSize = 0;

class _material {
  constructor(name, ka, kd, ks, ph, trans, textures, shader) {
    // Create material
    if (name == undefined) {
      this.name = "Default material";
      this.ka = vec3(0.1);
      this.kd = vec3(0.9);
      this.ks = vec3(0.3);
      this.ph = 30.0;
      this.trans = 1.0;
      this.textures = [
        null, // tex.texture("../../../../bin/textures/CGSG-Logo.png"),
        null,
        null,
        null,
        null,
        null,
        null,
        null,
      ];
      this.shader = shd.shaders[0];
    } else {
      this.name = name;
      this.ka = vec3(ka);
      this.kd = vec3(kd);
      this.ks = vec3(ks);
      this.ph = ph;
      this.trans = trans;
      this.textures = textures;
      this.shader = shader;
    }
    materials[materialsSize] = this;
    this.mtlNo = materialsSize++;
  }

  apply(mtlNo) {
    let prg = materials[mtlNo].shader.program;
    if (prg == null || prg == undefined) {
      prg = shd.shaders[0].program;
    } else {
      prg = shd.shaders[0].program; // TODO
    }
    if (prg == 0) return 0;
    gl.useProgram(prg);

    for (let t in this.textures)
      if (this.textures[t] != null)
        this.textures[t].apply(this.shader, Number(t));

    return prg;
  }
}

export function material(...args) {
  return new _material(...args);
}
