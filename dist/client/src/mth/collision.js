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
  if (d2 >= sphere.r) return false;

  return true;
}
