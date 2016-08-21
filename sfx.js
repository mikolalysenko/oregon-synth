const createSynth = require('./plumbing/synth')

module.exports = function ({regl, audioContext, keyboard}) {
  createSynth({
    regl,
    audioContext,
    keyboard,
    shader: `
    float pcm(float t, float keys[NUM_KEYS]) {
      float result = 0.0;
      float k, x, m = 0.0;
      float tt = ${2.0 * Math.PI} * t;
      for (int i = 0; i < NUM_KEYS; ++i) {
        k = step(0.01, keys[i]);
        m += k;
        x = pow(2.0, float(i) / 12.0);
        result += k * sin(tt * 200.0 * x) * 0.3;
      }
      return result / sqrt(m);
    }`,
    filter: `
      float filter(float keys[NUM_KEYS]) {
        float result = 0.0;
        for (int i = 0; i < 10; i++) {
          result += sample(float(i)) / 10.0;
        }
        return result;
      }
    `
  }).connect(audioContext.destination)
}
