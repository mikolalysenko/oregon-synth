const MOVIE_TIME = 10e4

module.exports = function (args) {
  const regl = args.regl
  const visuals = [
    require('./visuals/columns')(args),
    require('./visuals/sph')(args)
  ]

  let activeVisual = visuals[1]
  let visualTime = MOVIE_TIME
  regl.frame(({tick}) => {
    if (--visualTime < 0) {
      visualTime = MOVIE_TIME
      activeVisual = visuals[(Math.random() * visuals.length) | 0]
    }
    activeVisual()
  })
}
