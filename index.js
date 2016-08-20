const regl = require('regl')()
const createSynth = require('./synth.js')

const audioContext = new window.AudioContext()

createSynth({
  regl,
  audioContext,
  shader: `
  float pcm(float t, float keys[NUM_KEYS]) {
    float result = 0.0;
    for (int i = 0; i < NUM_KEYS; ++i) {
      result += 10.0 * keys[i] *
      sin(t * ${2.0 * Math.PI * 100.0} * pow(2.0, float(i + 48) / 12.0));
    }
    return result;
  }
  `
}).connect(audioContext.destination)
