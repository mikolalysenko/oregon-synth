const regl = require('regl')()
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
    float k, x, m = 0.0;
    float tt = ${2.0 * Math.PI} * t;
    for (int i = 0; i < NUM_KEYS; ++i) {
      k = keys[i] > 0.0 ? 1.0 : 0.0;
      m += k;
      x = pow(2.0, float(i + 48) / 12.0);
      result += k * clamp(0.0,1.0,0.0
        + sin(tt*50.0*x) * 0.3
        + sin(tt*50.0*3.0*x) * 0.2
        + sin(tt*50.0*5.0*x) * 0.1
        + sin(0.5 + sin((mod(tt,0.25)+10.0) * 20.0)) * 0.3
      );
    }
    return result / sqrt(m);
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
    vec4 feedback(vec2 uv, float t, float keys[NUM_KEYS],
    sampler2D image[2]) {
      float result = 0.0;
      for (int i = 0; i < 40; i++) {
        result += texture2D(image[i+1], uv);
      }
      return result / 40.0;
    }
  `,
  draw: () => {
    simpleDraw()
  }
})

regl.frame(() => {
  visual()
})
