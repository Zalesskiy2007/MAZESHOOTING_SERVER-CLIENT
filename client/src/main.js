// Main module
import { Anim } from "./anim/animation.js";
// import { Render } from "./anim/rnd/render.js";

export function main() {
  window.anim = new Anim();
  Promise.all([
    window.anim.render.shaderDefault.vertText,
    window.anim.render.shaderDefault.fragText,
    window.anim.render.shaderScope.vertText,
    window.anim.render.shaderScope.fragText,
  ]).then((res) => {
    const vsd = res[0];
    const fsd = res[1];
    const vss = res[2];
    const fss = res[3];

    window.anim.render.shaderDefault.add(vsd, fsd);
    window.anim.render.shaderScope.add(vss, fss);
    window.anim.render.resInit();

    const draw = () => {
      window.anim.response();
      window.anim.draw();
      window.requestAnimationFrame(draw);
    };
    draw();
  });
}
