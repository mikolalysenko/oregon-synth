const createSynth = require('./plumbing/synth')

module.exports = function ({regl, audioContext, keyboard}) {
  createSynth({
    regl,
    audioContext,
    keyboard,
    shader: `
    float pcm(float t, vec3 keys[NUM_KEYS]) {
      float result = 0.0;
      float k, x, m = 0.0;
      float tt = ${2.0 * Math.PI} * t;
      for (int i = 0; i < NUM_KEYS; ++i) {
        vec3 v = keys[i];
        k = step(0.01, v.x);
        m += k;
        x = pow(2.0, float(i) / 12.0);
        result += k * (
          sin(sin((t-v.y)*1.0*x/8.0+sin(t*4.0)*10.0))
        ) * sin(tt*88.0*x+sin(t*2.0)/4.0) * 0.25;
      }
      return sqrt(abs(result)) * (result>0.0?1.0:-1.0);
    }`,
    filter: `
    float filter(vec3 keys[NUM_KEYS]) {
      float result = sample(0.0);
      for (int i = 1; i < 40; i++) {
        result += sample(float(i)) * (exp(-0.25 * float(i * i)) / 4.0);
      }
      for (int i = 50; i < 80; ++i) {
        result += sample(float(i)) * 0.8 * exp(-0.1 * pow(float(i) - 65.0, 2.0));
      }
      return result;
    }
    `
  }).connect(audioContext.destination)
}
