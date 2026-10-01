export const FRAGMENT_SHADER_SOURCE = `#version 300 es
precision mediump float;

in vec2 vShapeUV;
in vec4 vColor;

uniform sampler2D uAtlas;
uniform bool uHasAtlas;

out vec4 fragColor;

void main() {
  if (uHasAtlas) {
    // Atlas alpha is treated as a silhouette mask; per-cell color is the tint.
    float maskAlpha = texture(uAtlas, vShapeUV).a;
    fragColor = vec4(vColor.rgb, vColor.a * maskAlpha);
  } else {
    fragColor = vColor;
  }
}
`
