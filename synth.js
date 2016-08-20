module.exports = function createSynth (options) {
  const regl = options.regl
  const context = options.audioContext

  const shaderData = options.shader
  const uniforms = options.uniforms || {}
  const contextVars = options.context || {}

  const bufferSize = options.size || 1024
  const inputChannels = 0
  const outputChannels = 1
  const sampleRate = context.sampleRate

  const scriptNode = context.createScriptProcessor(
    bufferSize,
    inputChannels,
    outputChannels)

  const outputFBO = regl.framebuffer({
    shape: [bufferSize / 4, 1, 4],
    format: 'rgba',
    depthStencil: false
  })

  const generateSound = regl({
    vert: `
    precision highp float;
    attribute vec2 position;
    uniform float timeOffsetBase;
    varying float offsetTime_;

    void main () {
      offsetTime_ = timeOffsetBase;
      gl_Position = vec4(position, 0, 1);
    }
    `,

    frag: `
    precision highp float;
    uniform float deltaTime_;
    varying float offsetTime_;

    ${shaderData}

    void main () {
      gl_FragColor = vec4(
        pcm(offsetTime_),
        pcm(offsetTime_ + deltaTime_),
        pcm(offsetTime_ + 2.0 * deltaTime_),
        pcm(offsetTime_ + 3.0 * deltaTime_));
    }
    `,

    context: contextVars,
    depth: {
      enable: false,
      mask: false
    },
    attributes: {
      position: [
        -4, 0,
        4, 4,
        4, -4
      ]
    },
    uniforms: Object.assign({
      timeOffsetBase: regl.prop('timeOffsetBase'),
      deltaTime: regl.prop('deltaTime')
    }, uniforms),
    count: 3,
    primitive: 'triangles',
    elements: null
  })

  const setFBO = regl({
    framebuffer: outputFBO
  })

  let clockTime = 0
  scriptNode.onaudioprocess = function (event) {
    const outputBuffer = event.outputBuffer
    setFBO(() => {
      generateSound()
      regl.read({
        data: outputBuffer,
        timeOffsetBase: clockTime,
        deltaTime: sampleRate
      })
    })
    clockTime += sampleRate * outputBuffer.length
  }

  return scriptNode
}
