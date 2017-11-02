var Stream = require('stream')
var splitter = /^(.+)\/([0-9]+)$/
var midiOpts = { sysex: true }

module.exports = function(name, opts){
  opts = normalizeOpts(name, opts)

  var stream = new Stream()
  stream.readable = true
  stream.writable = true
  stream.paused = false

  var queue = []

  getInput(opts, function (err, port) {
    if (err) return stream.emit('error', err)
    stream.emit('connect')
    port.onmidimessage = function (event) {
      var d = event.data
      if (opts.normalizeNotes) {
        d = normalizeNotes(d)
      }
      stream.emit('data', [d[0], d[1], d[2]])
    }
    stream.on('end', function () {
      port.onmidimessage = null
    })
    stream.inputPort = port
  })

  stream.write = function (data) {
    queue.push(data)
  }

  stream.close = function () {
    stream.emit('close')
    stream.emit('end')
    stream.emit('finish')
    stream.removeAllListeners()
  }

  getOutput(opts, function (err, port) {
    if (err) return stream.emit('error', err)
    queue.forEach(function (data) {
      port.send(data)
    })
    stream.write = function (data) {
      port.send(data)
      stream.emit('send', data)
    }
    stream.outputPort = port
  })

  return stream
}

module.exports.openInput = function (name, opts) {
  opts = normalizeOpts(name, opts)

  var stream = new Stream()
  stream.readable = true
  stream.paused = false

  getInput(opts, function (err, port) {
    if (err) stream.emit('error', err)
    stream.emit('connect')
    port.onmidimessage = function (event) {
      var d = event.data
      if (opts.normalizeNotes) {
        d = normalizeNotes(d)
      }
      stream.emit('data', [d[0], d[1], d[2]])
    }
    stream.on('end', function () {
      port.onmidimessage = null
    })
    stream.inputPort = port
  })

  stream.close = function () {
    stream.emit('close')
    stream.emit('end')
    stream.emit('finish')
    stream.removeAllListeners()
  }

  return stream
}

module.exports.getPortNames = function (cb) {
  getMidi(function (err, midi) {
    if (err) return cb && cb(err)
      try {
        cb && cb(null, getPortNames(midi))
      } catch (ex) {
        cb && cb(ex)
      }
  })
}

module.exports.openOutput = function (name, opts) {
  opts = normalizeOpts(name, opts)

  var stream = new Stream()
  stream.writable = true

  var queue = []

  stream.write = function (data) {
    queue.push(data)
  }

  stream.close = function () {
    stream.emit('close')
    stream.emit('end')
    stream.emit('finish')
    stream.removeAllListeners()
  }

  getOutput(opts, function (err, port) {
    if (err) stream.emit('error', err)
    stream.emit('connect')
    queue.forEach(function (data) {
      port.send(data)
    })
    stream.write = function (data) {
      port.send(data)
      stream.emit('send', data)
    }
    stream.outputPort = port
  })

  return stream
}

module.exports.watchPortNames = function (listener, opts) {
  var midi = null
  var refreshing = false

  getMidi(function (err, m) {
    if (!err) {
      midi = m
      midi.addEventListener('statechange', handleEvent)
      listener(getPortNames(midi, opts))
    }
  })

  return function unwatch () {
    if (midi) {
      midi.removeEventListener('statechange', handleEvent)
    }
  }

  function handleEvent (e) {
    if (!refreshing) {
      refreshing = true
      setTimeout(function () {
        listener(getPortNames(midi, opts))
        refreshing = false
      }, 5)
    }
  }
}

function getInput (opts, cb) {
  var index = opts.index || 0
  getMidi(function (err, midi) {
    if (err) return cb && cb(err)
    if (!inputsOf(midi).some(function (input) {
      if (input.name === opts.name || input.id === opts.name) {
        if (index && index > 0) {
          index -= 1
        } else {
          cb(null, input)
          return true
        }
      }
    })) {
      cb('No input with specified name "' + opts.name + '"')
    }
  })
}

function getOutput (opts, cb) {
  var index = opts.index || 0
  getMidi(function (err, midi) {
    if (err) return cb && cb(err)
    if (!outputsOf(midi).some(function (output) {
      if (output.name === opts.name || output.id === opts.name) {
        if (index && index > 0) {
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

function outputsOf (obj) {
  if (typeof obj.outputs === 'function') {
    return obj.outputs()
  } else {
    var result = []
    if (obj.outputs && typeof obj.outputs.values === 'function') {
      for (var val of obj.outputs.values()) {
        result.push(val)
      }
    }
    return result
  }
}


function inputsOf (obj) {
  if (typeof obj.inputs === 'function') {
    return obj.inputs()
  } else {
    var result = []
    if (obj.inputs && typeof obj.inputs.values === 'function') {
      for (var val of obj.inputs.values()) {
        result.push(val)
      }
    }
    return result
  }
}

var midi = null
var loadCallbacks = []
var loading = false
var midiError = null

function getMidi (cb) {
  if (midi || midiError) {
    process.nextTick(function () {
      cb(midiError, midi)
    })
  } else if (window.navigator.requestMIDIAccess) {
    loadCallbacks.push(cb)
    if (!loading) {
      loading = true
      window.navigator.requestMIDIAccess(midiOpts).then(function (res) {
        midi = res
        gotMidi()
      }, gotMidi)
    }
  } else {
    process.nextTick(function () {
      cb(new Error('Web MIDI API not available'))
    })
  }
}

function gotMidi (err) {
  midiError = err
  loading = false
  while (loadCallbacks.length) {
    loadCallbacks.shift()(err, midi)
  }
}

function getPortNames (midi, opts) {
  var includeInputs = !opts || opts.inputs
  var includeOutputs = !opts || opts.outputs

  var used = {}
  var names = {}
  if (includeInputs) {
    inputsOf(midi).forEach(function (input) {
      if (used[input.name]) {
        var i = used[input.name] += 1
        names[input.name + '/' + i] = true
      } else {
        used[input.name] = 1
        names[input.name] = true
      }
    })
  }

  used = {}

  if (includeOutputs) {
    outputsOf(midi).forEach(function (output) {
      if (used[output.name]) {
        var i = used[output.name] += 1
        names[output.name + '/' + i] = true
      } else {
        used[output.name] = 1
        names[output.name] = true
      }
    })
  }

  return Object.keys(names)
}

function normalizeNotes (data) {
  if (data[0] >= 128 && data[0] < 128 + 16) {
    // convert note off events to 0 velocity note on events
    data = [data[0] + 16, data[1], 0]
  }
  return data
}

function normalizeOpts (name, opts) {
  var result = {
    index: 0,
    name: name,
    normalizeNotes: opts && opts.normalizeNotes
  }

  if (typeof opts === 'number') {
    result.index = opts
  } else if (opts.index != null) {
    result.index = opts.index
  } else {
    var parts = splitter.exec(name)
    if (parts && parts[2]) {
      result.name = parts[1].trim()
      result.index = parseInt(parts[2], 10) - 1
    }
  }

  return result
}
