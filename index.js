const regl = require('regl')({
  extensions: 'OES_texture_float',
  optionalExtensions: 'OES_texture_float_linear'
})
const keyboard = require('./plumbing/keyboard')()
const createSynth = require('./plumbing/synth')
const createVisual = require('./plumbing/visual')

const NUM_KEYS = keyboard.keys.length

const audioContext = new window.AudioContext()

createSynth({
  regl,
  audioContext,
  keyboard,
  shader: `
  float pcm(float t, float keys[NUM_KEYS]) {
    float result = 0.0;
    for (int i = 0; i < NUM_KEYS; ++i) {
      result += 0.5 * keys[i] *
      sin(t * ${2.0 * Math.PI * 100.0} * pow(2.0, float(i + 48) / 12.0));
    }
    return result;
  }
  `,
  filter: `
  float filter (float keys[NUM_KEYS]) {
    float result = 0.0;
    for (int i = 0; i < 20; ++i) {
      result += sample(float(i));
    }
    return result;
  }
  `
}).connect(audioContext.destination)

const simpleDraw = regl({
  vert: `
  precision highp float;
  attribute float x, key;
  void main () {
    gl_Position = vec4(x, key, 0, 1);
    gl_PointSize = 16.0;
  }
  `,

  frag: `
  precision highp float;
  void main () {
    gl_FragColor = vec4(1, 0, 0, 1);
  }
  `,

  attributes: {
    x: Array(NUM_KEYS).fill().map((_, i) => 2.0 * i / NUM_KEYS - 1.0),
    key: regl.context('keys')
  },
  count: NUM_KEYS,
  primitive: 'points'
})

const visual = createVisual({
  regl,
  keyboard,
  feedback: `
vec4 feedback(vec2 uv, float t, float keys[NUM_KEYS], sampler2D image[2]) {
  return mix(texture2D(image[1], uv), texture2D(image[0], uv), 0.8);
}
`,
  draw: () => {
    simpleDraw()
  }
})

regl.frame(() => {
  visual()
})
