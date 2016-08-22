const regl = require('regl')({
  extensions: ['OES_texture_float', 'OES_element_index_uint'],
  optionalExtensions: 'OES_texture_float_linear',
  pixelRatio: 1
})
const keyboard = require('./plumbing/keyboard')()
const audioContext = new window.AudioContext()

require('./gfx')({
  regl,
  audioContext,
  keyboard,
  shader: `
  float pcm(float t, float keys[NUM_KEYS]) {
    float result = 0.0;
    float k, x, m = 0.0;
    float tt = ${2.0 * Math.PI} * t;
    for (int i = 0; i < NUM_KEYS; ++i) {
      k = step(0.1, keys[i]);
      m += k;
      x = pow(2.0, float(i+60) / 12.0);
      result += 0.0
        + k * sin(tt*x*1.0) * 0.3
        + k * sin(tt*x*2.0) * 0.3
        + k * sin(sin(tt*x*5.0)*(10.0+sin(mod(tt,1.0)+2.0))) * 0.3
      ;
    }
    return result / (m+1.0);
  }`,
  filter: `
    float filter(float keys[NUM_KEYS]) {
      float result = 0.0;
      for (int i = 0; i < 10; i++) {
        result += sample(float(i)) / 10.0;
      }
      return result;
    }
  `
})

require('./sfx')({
  regl,
  audioContext,
  keyboard
})
