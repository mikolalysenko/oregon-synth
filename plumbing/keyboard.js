const wsock = require('websocket-stream')
const to = require('to2')
const split = require('split2')
const onend = require('end-of-stream')

const kmin = 24
const kmax = 144
const NUM_KEYS = kmax - kmin

module.exports = function (clock) {
  const state = {
    time: 0,
    keys: Array(NUM_KEYS).fill(0),
    times: Array(NUM_KEYS * 2).fill(0),
    onChange: null
  }

  ;(function recon () {
    let stream = wsock('ws:///10.0.213.215:5000')
    onend(stream, recon)
    stream.pipe(split(JSON.parse))
      .pipe(to.obj(write))
    return recon

    function write (row, enc, next) {
      const keydown = (row.values[0] >> 4) & 1
      const k = row.values[1] - kmin
      state.time = clock.time
      state.keys[k] = keydown * row.values[2] / 128
      state.times[k * 2 + keydown] = state.time
      if (state.onChange) {
        state.onChange(state.keys)
      }
      next()
    }
  })()

  return state
}
