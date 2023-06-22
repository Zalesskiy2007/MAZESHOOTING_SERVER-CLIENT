// Shaders implementation file
import { gl } from "../../../gl.js";

export let shaders = [];
export let shadersSize = 0;

export class _shader {
  constructor(shaderFileNamePrefix) {
    this.name = shaderFileNamePrefix;
    this.vertText = fetchShader(
      "../../../../bin/shaders/" + shaderFileNamePrefix + "/vert.glsl"
    );
    this.fragText = fetchShader(
      "../../../../bin/shaders/" + shaderFileNamePrefix + "/frag.glsl"
    );
  }

  add(vs, fs) {
    const vertexSh = load(gl.VERTEX_SHADER, vs);
    const fragmentSh = load(gl.FRAGMENT_SHADER, fs);

    this.program = gl.createProgram();
    gl.attachShader(this.program, vertexSh);
    gl.attachShader(this.program, fragmentSh);
    gl.linkProgram(this.program);

    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      alert("Error link program!");
    }

    shaders[shadersSize] = {
      name: 0,
      program: -1,
    };
    shaders[shadersSize].name = this.name;
    shaders[shadersSize].program = this.program;
    shadersSize++;
  }
}

export function load(type, source) {
  const shader = gl.createShader(type);

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(
      "Error load " +
        (type === gl.VERTEX_SHADER ? "vertex" : "fragment") +
        " shader: " +
        gl.getShaderInfoLog(shader)
    );
  }

  return shader;
}

export async function fetchShader(shaderURL) {
  try {
    const response = await fetch(shaderURL);
    const text = await response.text();

    return text;
  } catch (err) {
    console.error(err);
  }
}

// eslint-disable-next-line no-unused-vars
export function shader(...args) {
  // eslint-disable-next-line no-undef
  return new _shader(...args);
}
