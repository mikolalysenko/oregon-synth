const regl = require('regl')()
const createSynth = require('./synth.js')

const audioContext = new window.AudioContext()

createSynth({
  regl,
  audioContext,
  shader: `
  float pcm(float t) {
    return sin(t * 440.0 * ${2.0 * Math.PI});
  }
  `
}).connect(audioContext.destination)
