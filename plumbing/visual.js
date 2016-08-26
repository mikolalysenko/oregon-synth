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
    commonUniforms['keys[' + i + ']'] = ((i) => () => keyboard.keys[i])(i)
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
      keys: keyboard.keys
    },
    count: 3
  })

  let drawFeedback, feedbackTextures
  if (feedback) {
    feedbackTextures = Array(2).fill().map(() =>
      regl.texture({ copy: true }))
    drawFeedback = regl({
      frag: `
      precision highp float;

      #define NUM_KEYS ${NUM_KEYS}

      uniform sampler2D feedbackTexture[2];
      uniform float keys[NUM_KEYS];
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
