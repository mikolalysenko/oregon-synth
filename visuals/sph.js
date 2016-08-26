const createVisual = require('../plumbing/visual')
const sphere = require('sphere-mesh')(20, 1)
const mat4 = require('gl-mat4')
const vectorizeText = require('vectorize-text')

const text = require('./text.json')

module.exports = function ({regl, keyboard}) {
  const NUM_KEYS = keyboard.keys.length

  const perspectiveMatrix = new Float32Array(16)
  const viewMatrix = new Float32Array(16)

  const textBuffers = text.map((str) => {
    const mesh = vectorizeText(str, {
      triangles: true
    })
    return {
      elements: regl.elements(mesh.cells),
      positions: regl.buffer(mesh.positions)
    }
  })

  const drawText = regl({
    vert: `
    precision highp float;
    attribute vec2 position;
    uniform vec3 offset;
    uniform float angle, scale;
    uniform mat4 projection;
    vec2 rotate (vec2 p) {
      float c = cos(angle);
      float s = sin(angle);
      return vec2(
        c * p.x - s * p.y,
        s * p.x + c * p.y);
    }
    void main () {
      gl_Position = projection * vec4(
        scale * rotate(vec2(position.x, -position.y)) + offset.xy,
        offset.z,
        1);
    }
    `,

    frag: `
    void main () {
      gl_FragColor = vec4(1, 1, 1, 1);
    }
    `,

    attributes: {
      position: (context, {symbol}) =>
        textBuffers[symbol % textBuffers.length].positions
    },
    uniforms: {
      offset: regl.prop('offset'),
      angle: regl.prop('angle'),
      scale: regl.prop('scale'),
      projection: ({viewportWidth, viewportHeight}) =>
        mat4.perspective(
          perspectiveMatrix,
          Math.PI / 4.0,
          viewportWidth / viewportHeight,
          0.01,
          1000.0)
    },
    elements: (context, {symbol}) =>
      textBuffers[symbol % textBuffers.length].elements
  })

  const drawLine = regl({
    vert: `
    precision highp float;
    attribute float x, key;
    varying float shift;
    void main () {
      shift = x;
      gl_Position = vec4(x, key - 0.5, 0, 1);
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
      key: regl.context('keyboard.keys')
    },
    lineWidth: Math.min(8, regl.limits.lineWidthDims[1]),
    count: NUM_KEYS,
    primitive: 'line strip'
  })

  const drawSphere = regl({
    vert: `
    precision highp float;
    attribute vec3 position;

    uniform mat4 projection, view;
    uniform vec3 keys[${NUM_KEYS}];

    varying vec3 fragPos;

    void main () {
      float d = 1.0;
      for (int i = 0; i < ${NUM_KEYS}; ++i) {
        vec3 s = vec3(
          mod(float(37 * i), 53.0),
          mod(float(13 * i), 91.0),
          mod(float(23 * i), 89.0)) * position;
        float theta = length(s);
        vec3 V = normalize(vec3(
          sin(float(8 * i)),
          sin(float(11 * i) + 3.0),
          sin(float(5 * i) + 1.3)));
        d += keys[i].x * sin(theta) * dot(V, s) / theta;
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

  function generateText (text) {
    const angle = 2.0 * Math.PI * ((Math.random() * 4) | 0) / 4.0
    const velocity = [Math.cos(angle), Math.sin(angle)]
    const distance = 100.0 * Math.random() + 1.0
    const scale = 40.0 * Math.random() + 5.0
    const s = distance * scale
    const offset = [
      -velocity[0] * s,
      -velocity[1] * s,
      -distance
    ]
    return {
      offset,
      velocity,
      lifetime: s * (4.0 + 4.0 * Math.random()),
      scale,
      angle,
      symbol: (Math.random() * textBuffers.length) | 0
    }
  }

  const textElements = Array(40).fill().map(() => generateText({}))

  return createVisual({
    regl,
    keyboard,
    feedback: `
  vec4 feedback(vec2 uv, float t, vec3 keys[NUM_KEYS], sampler2D image[2]) {
    vec4 result = texture2D(image[1], uv);
    vec2 d = uv - 0.5;
    float w = 1.0;
    for (int i = 0; i < NUM_KEYS; ++i) {
      float sx = 2.0 * cos(float(i) * 0.5);
      float sy = 2.0 * cos(float(i) * 0.5);
      float skew = pow(2.0 * cos(0.9 * float(i)), 10.0) / 1024.0;
      w += keys[i].x;
      result += keys[i].x * texture2D(image[0], uv +
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
      drawText(textElements)

      for (let i = 0; i < textElements.length; ++i) {
        const text = textElements[i]
        for (let j = 0; j < 2; ++j) {
          text.offset[j] += text.velocity[j]
        }
        text.lifetime -= 1
        if (text.lifetime < 0) {
          textElements[i] = generateText()
        }
      }
    }
  })
}
