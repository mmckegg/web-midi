var Stream = require('stream')

module.exports = function(name, index){
  var stream = new Stream()
  stream.readable = true
  stream.writable = true
  stream.paused = false

  var queue = []

  getInput(name, index, function(err, port){
    if (err) return stream.emit('error', err)
    stream.emit('connect')
    port.onmidimessage = function(event){
      var d = event.data
      stream.emit('data', [d[0], d[1], d[2]])
    }
    stream.inputPort = port
  })

  stream.write = function(data){
    queue.push(data)
  }

  getOutput(name, index, function(err, port){
    if (err) return stream.emit('error', err)
    queue.forEach(function(data){
      port.send(data)
    })
    stream.write = function(data){
      port.send(data)
      stream.emit('send', data)
    }
    stream.outputPort = port
  })

  return stream

}

module.exports.openInput = function(name){
  var stream = new Stream()
  stream.readable = true
  stream.paused = false

  getInput(name, index, function(err, port){
    if (err) stream.emit('error', err)
    stream.emit('connect')
    port.onmidimessage = function(event){
      var d = event.data
      stream.emit('data', [d[0], d[1], d[2]])
    }
    stream.inputPort = port
  })

  return stream
}

module.exports.openOutput = function(name){
  var stream = new Stream()
  stream.writable = true

  var queue = []

  stream.write = function(data){
    queue.push(data)
  }

  getOutput(name, index, function(err, port){
    if (err) stream.emit('error', err)
    stream.emit('connect')
    queue.forEach(function(data){
      port.send(data)
    })
    stream.write = function(data){
      port.send(data)
      stream.emit('send', data)
    }
    stream.outputPort = port
  })

  return stream
}

function getInput(name, index, cb){
  getMidi(function(err, midi){
    if(err)return cb&&cb(err)
    if (!midi.inputs().some(function(input){
      if (input.name === name || input.id === name){
        if (index && index > 0){
          index -= 1
        } else {
          cb(null, input)
          return true
        }
      }
    })) {
      cb('No input with specified name "' + name + '"')
    }
  })
}

function getOutput(name, index, cb){
  getMidi(function(err, midi){
    if(err)return cb&&cb(err)
    if (!midi.outputs().some(function(output){
      if (output.name === name || output.id === name){
        if (index && index > 0){
          index -= 1
        } else {
          cb(null, output)
          return true
        }
      }
    })) {
      cb('No output with specified name')
    }
  })
}

var midi = null
function getMidi(cb){
  if (midi){
    process.nextTick(function(){
      cb(null, midi)
    })
  } else if (window.navigator.requestMIDIAccess) {
    window.navigator.requestMIDIAccess().then(function(res){
      midi = res
      cb(null, midi)
    }, cb)
  } else {
    process.nextTick(function(){
      cb('Web MIDI API not available')
    })
  }
}
