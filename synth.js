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
    shape: [bufferSize, 1, 4],
    format: 'rgba',
    depthStencil: false
  })

  const generateSound = regl({
    vert: `
    precision highp float;
    attribute vec2 position;
    uniform float timeOffsetBase, timeOffsetScale;
    varying float offsetTime_;

    void main () {
      offsetTime_ = timeOffsetBase + timeOffsetScale * 0.5 * (position.x + 1.0);
      gl_Position = vec4(position, 0, 1);
    }
    `,

    frag: `
    precision highp float;
    varying float offsetTime_;

    ${shaderData}

    #define FLOAT_MAX  1.70141184e38
    #define FLOAT_MIN  1.17549435e-38

    lowp vec4 encode_float(highp float v) {
      highp float av = abs(v);

      //Handle special cases
      if(av < FLOAT_MIN) {
        return vec4(0.0, 0.0, 0.0, 0.0);
      } else if(v > FLOAT_MAX) {
        return vec4(127.0, 128.0, 0.0, 0.0) / 255.0;
      } else if(v < -FLOAT_MAX) {
        return vec4(255.0, 128.0, 0.0, 0.0) / 255.0;
      }

      highp vec4 c = vec4(0,0,0,0);

      //Compute exponent and mantissa
      highp float e = floor(log2(av));
      highp float m = av * pow(2.0, -e) - 1.0;

      //Unpack mantissa
      c[1] = floor(128.0 * m);
      m -= c[1] / 128.0;
      c[2] = floor(32768.0 * m);
      m -= c[2] / 32768.0;
      c[3] = floor(8388608.0 * m);

      //Unpack exponent
      highp float ebias = e + 127.0;
      c[0] = floor(ebias / 2.0);
      ebias -= c[0] * 2.0;
      c[1] += floor(ebias) * 128.0;

      //Unpack sign bit
      c[0] += 128.0 * step(0.0, -v);

      //Scale back to range
      return c.abgr / 255.0;
    }

    void main () {
      gl_FragColor = encode_float(pcm(offsetTime_));
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
      timeOffsetScale: regl.prop('timeOffsetScale')
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
    const outputBuffer = event.outputBuffer.getChannelData(0)
    setFBO(() => {
      generateSound({
        timeOffsetBase: clockTime,
        timeOffsetScale: outputBuffer.length / sampleRate
      })

      regl.read({
        data: new Uint8Array(outputBuffer.buffer)
      })
    })
    clockTime += outputBuffer.length / sampleRate
  }

  return scriptNode
}
