const regl = require('regl')({
  extensions: ['OES_texture_float', 'OES_element_index_uint'],
  optionalExtensions: 'OES_texture_float_linear',
  pixelRatio: 1
})
const keyboard = require('./plumbing/keyboard')()
const audioContext = new window.AudioContext()

require('./gfx')({
  regl,
  keyboard
})

require('./sfx')({
  regl,
  audioContext,
  keyboard
})
