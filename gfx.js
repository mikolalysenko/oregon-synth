const MOVIE_TIME = 30e4

module.exports = function (args) {
  const regl = args.regl
  const visuals = [
    require('./visuals/sph.js')(args)
  ]

  let activeVisual = 0
  let visualTime = MOVIE_TIME
  regl.frame(({tick}) => {
    if (--visualTime < 0) {
      visualTime = MOVIE_TIME
      activeVisual = visuals[(Math.random() * visuals.length) | 0]
    }
    (visuals[activeVisual])()
  })
}
