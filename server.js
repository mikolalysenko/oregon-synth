var wsock = require('websocket-stream')
var onend = require('end-of-stream')
var http = require('http')

var midi = require('midi')
var input = new midi.input()

var server = http.createServer(function (req, res) {
  res.statusCode = 404
  res.end('not found\n')
})
server.listen(5000)

var streams = []
wsock.createServer({ server: server }, function (stream) {
  streams.push(stream)
  onend(stream, function () {
    var ix = streams.indexOf(stream)
    streams.splice(ix, 1)
  })
})

input.on('message', function (dt, msg) {
  for (var i = 0; i < streams.length; i++) {
    streams[i].write(JSON.stringify({ dt: dt, values: msg }) + '\n')
  }
})
input.openPort(1)
