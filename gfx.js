const createVisual = require('./plumbing/visual')
const sphere = require('sphere-mesh')(20, 1)
const sc = require('simplicial-complex')
const mat4 = require('gl-mat4')

module.exports = function ({regl, keyboard}) {
  const NUM_KEYS = keyboard.keys.length

  const drawLine = regl({
    vert: `
    precision highp float;
    attribute float x, key;
    varying float shift;
    void main () {
      shift = x;
      gl_Position = vec4(x, key - 0.5, 0, 1);
      gl_PointSize = 16.0;
    }
    `,

    frag: `
    precision highp float;
    varying float shift;
    void main () {
      gl_FragColor = vec4(0.2 * (1.0 - shift), shift, 1, 1);
    }
    `,

    attributes: {
      x: Array(NUM_KEYS).fill().map((_, i) => 2.0 * i / (NUM_KEYS - 1) - 1.0),
      key: regl.context('keys')
    },
    count: NUM_KEYS,
    primitive: 'line strip'
  })

  const perspectiveMatrix = new Float32Array(16)
  const viewMatrix = new Float32Array(16)

  const drawSphere = regl({
    vert: `
    precision highp float;
    attribute vec3 position;

    uniform mat4 projection, view;
    uniform float keys[${NUM_KEYS}];

    varying vec3 fragPos;

    vec4 quatExp (vec4 q) {
      float theta = length(q.xyz);
      return exp(q.w) * vec4(sin(theta) * q.xyz / theta, cos(theta));
    }

    vec4 weights (vec3 w) {
      return quatExp(vec4(w * position, 0));
    }

    void main () {
      vec4 coeffs[6];
      coeffs[0] = weights(vec3(3, 11, 7));
      coeffs[1] = weights(vec3(22, 3, 9));
      coeffs[2] = weights(vec3(9, 33, 1));
      coeffs[3] = weights(vec3(3, 2, 13));
      coeffs[4] = weights(vec3(50, 3, 2));
      coeffs[5] = weights(vec3(2, 19, 15));

      float d = 1.0;
      for (int i = 0; i < 6; ++i) {
        vec4 w = coeffs[i];
        d += w.x * keys[4 * i] +
             w.y * keys[4 * i + 1] +
             w.z * keys[4 * i + 2] +
             w.w * keys[4 * i + 3];
      }

      fragPos = position;

      gl_Position = projection * view * vec4(d * position, 1);
    }
    `,

    frag: `
    precision highp float;
    varying vec3 fragPos;
    void main () {
      vec3 color = fragPos;
      color.b += 1.5;
      float minP = min(min(color.x, color.y), color.z);
      float maxP = max(max(color.x, color.y), color.z);
      gl_FragColor = vec4((color - minP) / (maxP - minP), 1);
    }
    `,

    attributes: {
      position: sphere.positions
    },

    uniforms: {
      projection: ({viewportWidth, viewportHeight}) =>
        mat4.perspective(
          perspectiveMatrix,
          Math.PI / 4.0,
          viewportWidth / viewportHeight,
          0.01,
          1000.0),

      view: ({tick}) => {
        const t = 0.01 * tick
        return mat4.lookAt(
          viewMatrix,
          [5.0 * Math.cos(t), 5.0 * Math.sin(t), 5.0 * Math.cos(t)],
          [0, 0, 0],
          [0, Math.cos(0.1 * t), Math.sin(0.1 * t)])
      }

    },

    elements: sphere.cells // sc.skeleton(sphere.cells, 1)
  })

  const visual = createVisual({
    regl,
    keyboard,
    feedback: `
  vec4 feedback(vec2 uv, float t, float keys[NUM_KEYS], sampler2D image[2]) {
    vec4 result = texture2D(image[1], uv);
    vec2 d = uv - 0.5;
    float w = 1.0;
    for (int i = 0; i < NUM_KEYS; ++i) {
      float sx = 2.0 * cos(float(i) * 0.5);
      float sy = 2.0 * cos(float(i) * 0.5);
      float skew = pow(2.0 * cos(0.9 * float(i)), 10.0) / 1024.0;
      w += keys[i];
      result += keys[i] * texture2D(image[0], uv +
        0.1 * mat2(
          sx * skew, (1.0 - skew) * sy,
          (skew - 1.0) * sx, sy) * d);
    }
    return 0.8 * vec4(result.rgb / w, 0.5);
  }
  `,
    draw: () => {
      regl.clear({
        color: [0, 0, 0, 1],
        depth: 1
      })
      drawLine()
      drawSphere()
    }
  })

  regl.frame(() => {
    visual()
  })
}
