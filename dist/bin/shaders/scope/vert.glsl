#version 300 es

precision highp float;

layout(location = 0) in vec3 InPosition;

void main() {
    gl_Position = vec4(InPosition, 1.0);
}
