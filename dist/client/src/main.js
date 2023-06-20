// Main module
import { Anim } from "./anim/animation.js";
// import { Render } from "./anim/rnd/render.js";

export function main() {
  window.anim = new Anim();
  Promise.all([
    window.anim.render.shaderDefault.vertText,
    window.anim.render.shaderDefault.fragText,
  ]).then((res) => {
    const vs = res[0];
    const fs = res[1];

    window.anim.render.shaderDefault.add(vs, fs);
    window.anim.render.resInit();

    const draw = () => {
      window.anim.response();
      window.anim.draw();
      window.requestAnimationFrame(draw);
    };
    draw();
  });
}
