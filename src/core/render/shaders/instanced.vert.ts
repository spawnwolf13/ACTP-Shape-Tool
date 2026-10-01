export const VERTEX_SHADER_SOURCE = `#version 300 es
layout(location = 0) in vec2 aQuadPos;
layout(location = 1) in vec2 aInstancePos;
layout(location = 2) in float aInstanceSize;
layout(location = 3) in float aInstanceRotation;
layout(location = 4) in vec4 aInstanceColor;
layout(location = 5) in float aInstanceShapeIndex;

uniform vec2 uViewportSize;
uniform float uShapeCount;

out vec2 vShapeUV;
out vec4 vColor;

void main() {
  float c = cos(aInstanceRotation);
  float s = sin(aInstanceRotation);
  vec2 rotated = vec2(
    aQuadPos.x * c - aQuadPos.y * s,
    aQuadPos.x * s + aQuadPos.y * c
  );
  vec2 worldPx = aInstancePos + rotated * aInstanceSize;

  vec2 clip = (worldPx / uViewportSize) * 2.0 - 1.0;
  clip.y = -clip.y; // canvas pixel space is Y-down; clip space is Y-up
  gl_Position = vec4(clip, 0.0, 1.0);

  vec2 localUV = aQuadPos + 0.5;
  vShapeUV = vec2((localUV.x + aInstanceShapeIndex) / uShapeCount, localUV.y);
  vColor = aInstanceColor;
}
`
