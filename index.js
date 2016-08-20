const regl = require('regl')()
const createSynth = require('./synth.js')

const audioContext = new window.AudioContext()

createSynth({
  regl,
  audioContext,
  shader: `
  float pcm(float t) {
    return sin(t * ${2.0 * Math.PI * 400.0});
  }
  `
}).connect(audioContext.destination)
