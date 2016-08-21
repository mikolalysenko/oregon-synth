const wsock = require('websocket-stream')
const to = require('to2')
const split = require('split2')
const onend = require('end-of-stream')

const kmin = 24
const kmax = 144
const NUM_KEYS = kmax - kmin

module.exports = function () {
  const state = {
    time: 0,
    keys: Array(NUM_KEYS).fill(0),
    onChange: null
  }

  ;(function recon () {
    let stream = wsock('ws://192.168.1.54:5000')
    onend(stream, recon)
    stream.pipe(split(JSON.parse))
      .pipe(to.obj(write))
    return recon

    function write (row, enc, next) {
      const keydown = (row.values[0] >> 4) & 1
      const k = row.values[1] - kmin
      state.time += row.dt
      state.keys[k] = keydown * row.values[2] / 128
      if (state.onChange) {
        state.onChange(state.keys)
      }
      next()
    }
  })()

  return state
}
