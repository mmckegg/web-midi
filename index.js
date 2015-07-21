var Stream = require('stream')
var splitter = /^(.+)\/([0-9]+)$/

module.exports = function(name, opts){
  opts = normalizeOpts(opts)

  var stream = new Stream()
  stream.readable = true
  stream.writable = true
  stream.paused = false

  var queue = []

  // handle index in name specified by `/2`
  var index = opts.index
  if (index == null){
    var parts = splitter.exec(name)
    if (parts && parts[2]){
      name = parts[1].trim()
      index = parseInt(parts[2])-1
    }
  }

  getInput(name, index, function(err, port){
    if (err) return stream.emit('error', err)
    stream.emit('connect')
    port.onmidimessage = function(event){
      var d = event.data
      if (opts.normalizeNotes) {
        d = normalizeNotes(d)
      }
      stream.emit('data', [d[0], d[1], d[2]])
    }
    stream.on('end', function(){
      port.onmidimessage = null
    })
    stream.inputPort = port
  })

  stream.write = function(data){
    queue.push(data)
  }

  stream.close = function(){
    stream.emit('close')
    stream.emit('end')
    stream.emit('finish')
    stream.removeAllListeners()
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

module.exports.openInput = function(name, opts){
  opts = normalizeOpts(opts)

  // handle index in name specified by `/2`
  var index = opts.index
  if (index == null){
    var parts = splitter.exec(name)
    if (parts && parts[2]){
      name = parts[1].trim()
      index = parseInt(parts[2])-1
    }
  }

  var stream = new Stream()
  stream.readable = true
  stream.paused = false

  getInput(name, index, function(err, port){
    if (err) stream.emit('error', err)
    stream.emit('connect')
    port.onmidimessage = function(event){
      var d = event.data
      if (opts.normalizeNotes) {
        d = normalizeNotes(d)
      }
      stream.emit('data', [d[0], d[1], d[2]])
    }
    stream.on('end', function(){
      port.onmidimessage = null
    })
    stream.inputPort = port
  })

  stream.close = function(){
    stream.emit('close')
    stream.emit('end')
    stream.emit('finish')
    stream.removeAllListeners()
  }

  return stream
}

module.exports.getPortNames = function(cb){
  var used = {}
  var names = {}
  getMidi(function(err, midi){
    if (err) return cb&&cb(err)
      try {
        cb&&cb(null, getPortNames(midi))
      } catch (ex){
        cb&&cb(ex)
      }
  })
}

module.exports.openOutput = function(name, opts){
  opts = normalizeOpts(opts)

  // handle index in name specified by `/2`
  var index = opts.index
  if (index == null){
    var parts = splitter.exec(name)
    if (parts && parts[2]){
      name = parts[1].trim()
      index = parseInt(parts[2])-1
    }
  }

  var stream = new Stream()
  stream.writable = true

  var queue = []

  stream.write = function(data){
    queue.push(data)
  }

  stream.close = function(){
    stream.emit('close')
    stream.emit('end')
    stream.emit('finish')
    stream.removeAllListeners()
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

module.exports.watchPortNames = function(listener) {
  var midi = null
  var refreshing = false

  getMidi(function(err, m){
    if (!err) {
      midi = m
      midi.addEventListener('statechange', handleEvent) 
    }
  })

  return function unwatch() {
    if (midi) {
      midi.removeEventListener('statechange', handleEvent)
    }
  }

  function handleEvent(e) {
    if (!refreshing) {
      refreshing = true
      setTimeout(function() {
        listener(getPortNames(midi))
        refreshing = false
      }, 5)
    }
  }
}

function getInput(name, index, cb){
  getMidi(function(err, midi){
    if(err)return cb&&cb(err)
    if (!inputsOf(midi).some(function(input){
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
    if (!outputsOf(midi).some(function(output){
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

function outputsOf(obj){
  if (typeof obj.outputs === 'function'){
    return obj.outputs()
  } else {
    var result = []
    if (obj.outputs && typeof obj.outputs.values === 'function') {
      for (var val of obj.outputs.values()){
        result.push(val)
      }
    }
    return result
  }
}


function inputsOf(obj){
  if (typeof obj.inputs === 'function'){
    return obj.inputs()
  } else {
    var result = []
    if (obj.inputs && typeof obj.inputs.values === 'function') {
      for (var val of obj.inputs.values()){
        result.push(val)
      }
    }
    return result
  }
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

function getPortNames(midi) {
  var used = {}
  var names = {}
  inputsOf(midi).forEach(function(input){
    if (used[input.name]){
      var i = used[input.name] += 1
      names[input.name + '/' + i] = true
    } else {
      used[input.name] = 1
      names[input.name] = true
    }
  })
  used = {}
  outputsOf(midi).forEach(function(output){
    if (used[output.name]){
      var i = used[output.name] += 1
      names[output.name + '/' + i] = true
    } else {
      used[output.name] = 1
      names[output.name] = true
    }
  })
  return Object.keys(names)
}

function normalizeNotes(data) {
  if (data[0] >= 128 && data[0] < 128 + 16){
    // convert note off events to 0 velocity note on events
    data = [data[0]+16, data[1], 0]
  }
  return data
}

function normalizeOpts(opts) {
  if (typeof opts === 'number') opts = {index: opts}
  opts = opts || {}
  return opts
}