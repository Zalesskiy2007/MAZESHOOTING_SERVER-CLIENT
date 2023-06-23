// Collision detection implementation file
import { vec3 } from "./vec3.js";

// Ray class module
class _ray {
  constructor(org, dir) {
    this.org = vec3(org);
    this.dir = vec3(dir).normalize();
  }
}

export function ray(...args) {
  return new _ray(...args);
}

// Sphere class module
class _sphere {
  constructor(center, radius) {
    this.c = center;
    this.r = radius;
  }
}

export function sphere(...args) {
  return new _sphere(...args);
}

export function rayIntersectSphere(ray, sphere) {
  const orgCenter = sphere.c.sub(ray.org);
  const t = orgCenter.dot(ray.dir);
  const d2 = orgCenter.length2() - t * t;

  if (orgCenter.dot(ray.dir) <= 0) return false;
  if (d2 >= sphere.r * sphere.r) return false;

  return true;
}

export function checkCollisionSphereAndSphere(pos1, rad1, pos2, rad2) {
  if (Math.pow(pos2.x - pos1.x, 2) + Math.pow(pos2.y - pos1.y, 2) + Math.pow(pos2.z - pos1.z, 2) <= Math.pow(rad1 + rad2, 2)) {
    return true;
  }

  return false;
}

export function checkCollisionSphereAndBox(bmin, bmax, c, r) {
  let r2 = r * r;
  let dmin = 0;

  c = [c.x, c.y, c.z];
  bmin = [bmin.x, bmin.y, bmin.z];
  bmax = [bmax.x, bmax.y, bmax.z];

  for (let i = 0; i < 3; i++) {
    if (c[i] < bmin[i]) {
      dmin += Math.pow(c[i] - bmin[i], 2);
    } else if (c[i] > bmax[i]) {
      dmin += Math.pow(c[i] - bmax[i], 2);
    }
  }

  if (dmin <= r2) {
    return true;
  }
  return false;
}
