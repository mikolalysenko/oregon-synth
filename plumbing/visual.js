let feedbackTextures

module.exports = function ({
  regl,
  keyboard,
  feedback,
  draw
}) {
  const NUM_KEYS = keyboard.keys.length

  const commonUniforms = {
    'time': ({tick}) => tick / 60.0
  }

  for (let i = 0; i < NUM_KEYS; ++i) {
    commonUniforms['keys[' + i + ']'] = (function (i) {
      var result = [0, 0, 0]
      return function () {
        result[0] = keyboard.keys[i]
        result[1] = keyboard.times[2 * i]
        result[2] = keyboard.times[2 * i + 1]
        return result
      }
    })(i)
  }

  const setupShaders = regl({
    vert: `
    precision highp float;

    attribute vec2 position;
    varying vec2 uv;

    void main () {
      uv = 0.5 * (position + 1.0);
      gl_Position = vec4(position, 0, 1);
    }
    `,
    attributes: {
      position: [
        -4, 0,
        4, 4,
        4, -4
      ]
    },
    uniforms: commonUniforms,
    context: {
      keyboard: keyboard
    },
    count: 3
  })

  if (!feedbackTextures) {
    feedbackTextures = Array(2).fill().map(() =>
      regl.texture({ copy: true }))
  }

  let drawFeedback
  if (feedback) {
    drawFeedback = regl({
      frag: `
      precision highp float;

      #define NUM_KEYS ${NUM_KEYS}

      uniform sampler2D feedbackTexture[2];
      uniform vec3 keys[NUM_KEYS];
      uniform float time;
      uniform vec2 screenSize;
      varying vec2 uv;

      ${feedback}

      void main () {
        gl_FragColor = feedback(uv, time, keys, feedbackTexture);
      }
      `,

      uniforms: {
        'feedbackTexture[0]': ({tick}) => feedbackTextures[tick % 2],
        'feedbackTexture[1]': ({tick}) => feedbackTextures[(tick + 1) % 2],
        screenSize: ({viewportWidth, viewportHeight}) => [viewportWidth, viewportHeight]
      },

      depth: {
        enable: false,
        mask: false
      },

      blend: {
        enable: true,
        func: {
          srcRGB: 1,
          srcAlpha: 1,
          dst: 'one minus src alpha',
          dstAlpha: 1
        },
        equation: 'add'
      }
    })
  }

  return function () {
    setupShaders((context) => {
      if (draw) {
        draw(context)
      }
      if (feedback) {
        drawFeedback()
        feedbackTextures[context.tick % 2]({
          copy: true
        })
      }
    })
  }
}
