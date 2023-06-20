#version 300 es

precision highp float;

layout(location = 0) in vec3 InPosition;
layout(location = 1) in vec2 InTexCoord;
layout(location = 2) in vec3 InNormal;
layout(location = 3) in vec4 InColor;

out vec3 DrawPos;
out vec3 DrawNormal;

uniform mat4 MatrWVP;
uniform mat4 MatrWInv;
uniform mat4 MatrW;

void main() {
    gl_Position = MatrWVP * vec4(InPosition, 1);
    DrawPos = (MatrW * vec4(InPosition, 1)).xyz;
    DrawNormal = (MatrWInv * vec4(InNormal, 1)).xyz;
}
