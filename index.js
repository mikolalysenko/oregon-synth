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

//----------------------------
var wsock = require('websocket-stream')
var to = require('to2')
var split = require('split2')
var onend = require('end-of-stream')

var kmin = 48, kmax = 72
var state = { time: 0, keys: [] }

for (var i = kmin; i < kmax; i++) {
  state.keys.push(0)
}

;(function recon () {
  var stream = wsock('ws://localhost:5000')
  onend(stream, recon)
  stream.pipe(split(JSON.parse))
    .pipe(to.obj(write))
  return recon

  function write (row, enc, next) {
    state.time += row.dt
    var keydown = (row.values[0]>>4)&1
    var k = row.values[1] - kmin
    state.keys[k] = keydown * row.values[2]/128
    console.log(state.keys.join(','))
    next()
  }
})()
