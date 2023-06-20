import { vec3, vec2, vec4 } from "../../mth/mth.js";

class _vertex {
  constructor(p, t, n, c) {
    if (p == undefined) {
      this.p = vec3(0);
      this.t = vec2(0);
      this.n = vec3(0);
      this.c = vec4(0);
    } else {
      this.p = vec3(p);
      this.t = vec2(t);
      this.n = vec3(n);
      this.c = vec4(c);
    }
  }
}

export function vertex(...args) {
  return new _vertex(...args);
}

export function getVertexArray(posArray, tcArray, normArray, colArray) {
  let vertexArray = [];
  for (let i = 0; i < posArray.length; i += 3) {
    vertexArray.push(
      vertex(
        posArray != null
          ? vec3(posArray[i], posArray[i + 1], posArray[i + 2])
          : vec3(0),
        tcArray != null ? vec2(tcArray[i], tcArray[i + 1]) : vec2(0),
        normArray != null
          ? vec3(normArray[i], normArray[i + 1], normArray[i + 2])
          : vec3(0),
        colArray != null
          ? vec4(colArray[i], colArray[i + 1], colArray[i + 2], colArray[i + 3])
          : vec4(0)
      )
    );
  }
  return vertexArray;
}

export function toArray(vertexArray) {
  let a = [];

  for (let i = 0; i < vertexArray.length; i++) {
    a.push(vertexArray[i].p.x);
    a.push(vertexArray[i].p.y);
    a.push(vertexArray[i].p.z);
    a.push(vertexArray[i].t.x);
    a.push(vertexArray[i].t.y);
    a.push(vertexArray[i].n.x);
    a.push(vertexArray[i].n.y);
    a.push(vertexArray[i].n.z);
    a.push(vertexArray[i].c.x);
    a.push(vertexArray[i].c.y);
    a.push(vertexArray[i].c.z);
    a.push(vertexArray[i].c.w);
  }
  return a;
}

export function autoNormals(vertexArray, indexArray) {
  for (let i = 0; i < indexArray.length; i += 3) {
    let p0 = vertexArray[indexArray[i]],
      p1 = vertexArray[indexArray[i + 1]],
      p2 = vertexArray[indexArray[i + 2]];
    const normal = p1.p.sub(p0.p).cross(p2.p.sub(p0.p)).normalize();

    p0.n = normal;
    p1.n = normal;
    p2.n = normal;
    vertexArray[indexArray[i]] = p0;
    vertexArray[indexArray[i + 1]] = p1;
    vertexArray[indexArray[i + 2]] = p2;
  }
  // return vertexArray;
}
