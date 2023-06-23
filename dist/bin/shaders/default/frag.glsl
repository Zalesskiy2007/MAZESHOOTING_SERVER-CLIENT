#version 300 es
precision highp float;
out vec4 o_color;
in vec3 DrawPos;
in vec3 DrawNormal;

uniform vec3 Ka, Kd, Ks;
uniform float Ph;
uniform float Time;
uniform vec3 CamLoc;
uniform vec3 CamDir;

// vec3 Ka = vec3(0.24725, 0.2245, 0.0645);
// vec3 Kd = vec3(0.34615, 0.3143, 0.0903);
// vec3 Ks = vec3(0.797357, 0.723991, 0.208006);
// float Ph = 83.2;

vec3 Shade(vec3 P, vec3 N) {
  vec3 L;
  if (Ka == vec3(0.05375, 0.05, 0.06625))
    L = normalize(vec3(2, 8, 4)); // Light direction
  else
    L = normalize(vec3(-CamDir)); // Light direction
  vec3 LC = vec3(1, 1, 1);
  vec3 color;
  vec3 V = normalize(P - CamLoc);

  N = faceforward(N, V, N);
  vec3 R = reflect(V, N);

  // Ambient
  color = min(vec3(0.1), Ka);
  // Diffuse
  color += max(0.0, dot(N, L)) * Kd * LC;
  // Specular
  color += pow(max(0.0, dot(R, L)), Ph) * Ks * LC;

  return color;
}

void main(void) {
  float gamma = 2.2;
  o_color = vec4(pow(Shade(DrawPos, normalize(DrawNormal)), vec3(1.0 / gamma)), 1);
  // o_color = vec4(DrawNormal, 1);
}