web-midi
===

This module wraps the [Web MIDI API](http://www.w3.org/TR/webmidi/) into a stream interface. 

Web MIDI is currently only available in Chrome, but this module can potentially be used in older browsers with the [WebMIDIAPIShim](https://github.com/cwilso/WebMIDIAPIShim).

For a serverside (Node) based version of the same API check out [midi-stream](https://github.com/mmckegg/midi-stream).

## Install

```bash
$ npm install web-midi
```

## Example

```js
var midi = require('web-midi')
var inStream = midi.openInput('Launchpad')
var outStream = midi.openOutput('Launchpad')

inStream.on('data', function(data){
  // => [146, 32, 127]
})

// send on note
outStream.write([146, 38, 127])

setTimeout(function(){
  // off note
  outStream.write([146, 38, 0])
}, 1000)

// or use pipes
var anotherStream = midi.openOutput('IAC')
inStream.pipe(anotherStream)
```

## Or create a duplex stream (assumes input and output ports are named the same thing)

```js
var midi = require('web-midi')

var duplexStream = midi('Launchpad')

duplexStream.on('data', function(data){
  // => [146, 32, 127]
})

// send on note
duplexStream.write([146, 38, 127])

setTimeout(function(){
  // send off note
  duplexStream.write([146, 38, 0])
}, 1000)

// or use pipes
var anotherStream = midi('IAC')
duplexStream.pipe(anotherStream)
```

## For SysEx access just add the appropriate option
Note that the browser will require user permission for this.
```js
var midi = require('web-midi')

var duplexStream = midi('Ableton Push User Port', {sysex: true})

// Write 'Hi' on Ableton Push display
duplexStream.write([0xF0, 0x47, 0x7F, 0x15, 0x18, 0x00, 0x45, 0x00, 0x48, 0x69, 0xF7])

```
