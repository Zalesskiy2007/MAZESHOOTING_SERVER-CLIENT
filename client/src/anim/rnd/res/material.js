// Material implementation file
import { vec3 } from "../../../mth/mth.js";
// import { rnd, shd, tex } from "./resource.js";
import * as shd from "./shader.js"
import { gl } from "../../../gl.js";

export let materials = [];
export let materialsSize = 0;

let mtlLib = [["black", [0.0, 0.0, 0.0],             [0.01, 0.01, 0.01],           [0.5, 0.5, 0.5],               32],
  ["Brass",         [0.329412,0.223529,0.027451], [0.780392,0.568627,0.113725], [0.992157,0.941176,0.807843], 27.8974],
  ["orange",        [1,0.5,0],       [1,0.5,0],       [0.393548,0.271906,0.166721],  25.6],
  ["Chrome",        [0.25, 0.25, 0.25],          [0.4, 0.4, 0.4],              [0.774597, 0.774597, 0.774597], 76.8],
  ["Copper",        [0.19125,0.0735,0.0225],     [0.7038,0.27048,0.0828],      [0.256777,0.137622,0.086014],  12.8],
  ["yellow",          [1,1,0],     [1,1,0],    [0.628281,0.555802,0.366065],  51.2],
  ["Peweter",       [0.10588,0.058824,0.113725], [0.427451,0.470588,0.541176], [0.3333,0.3333,0.521569],      9.84615],
  ["Silver",        [0.19225,0.19225,0.19225],   [0.50754,0.50754,0.50754],    [0.508273,0.508273,0.508273],  51.2],
  ["Polished Silver", [0.23125,0.23125,0.23125], [0.2775,0.2775,0.2775],       [0.773911,0.773911,0.773911],  89.6],
  ["blue",     [0, 0, 1],      [0, 0, 1],    [0.297254, 0.30829, 0.306678], 12.8],
  ["red",          [1, 0, 0],  [1, 0, 0],  [0.727811, 0.626959, 0.626959], 76.8],
  ["Polished Gold", [0.24725, 0.2245, 0.0645],   [0.34615, 0.3143, 0.0903],    [0.797357, 0.723991, 0.208006], 83.2],
  ["Polished Bronze", [0.25, 0.148, 0.06475],    [0.4, 0.2368, 0.1036],        [0.774597, 0.458561, 0.200621], 76.8],
  ["Polished Copper", [0.2295, 0.08825, 0.0275], [0.5508, 0.2118, 0.066],      [0.580594, 0.223257, 0.0695701], 51.2],
  ["Jade",          [0.135, 0.2225, 0.1575],     [0.135, 0.2225, 0.1575],      [0.316228, 0.316228, 0.316228], 12.8],
  ["Obsidian",      [0.05375, 0.05, 0.06625],    [0.18275, 0.17, 0.22525],     [0.332741, 0.328634, 0.346435], 38.4],
  ["Pearl",         [0.25, 0.20725, 0.20725],    [1.0, 0.829, 0.829],          [0.296648, 0.296648, 0.296648], 11.264],
  ["green",       [0, 1, 0],    [0, 1, 0],  [0.633, 0.727811, 0.633],       76.8],
  ["Black Rubber",  [0.02, 0.02, 0.02],          [0.01, 0.01, 0.01],           [0.4, 0.4, 0.4],                10.0]];

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
      prg = shd.shaders[mtlNo].program; // TODO
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

export function loadMtlLib() {
  for (let i = 0; i < mtlLib.length; i++){
    material(mtlLib[i][0], vec3(mtlLib[i][1]), vec3(mtlLib[i][2]), vec3(mtlLib[i][3]), mtlLib[i][4], 1, null, shd.shader("default"));
  }
}

export function findMtlByName(name) {
  for (let i = 0; i < materials.length; i++) {
    if (materials[i].name === name) {
      return materials[i];
    }
  }

  return materials[0];
}
