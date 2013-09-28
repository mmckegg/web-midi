web-midi
===

This module wraps the Web MIDI API into a stream interface. 

It is currently only available in Chrome Canary requiring [#enable-experimental-web-platform-features](chrome://flags#enable-experimental-web-platform-features) and [#enable-web-midi](chrome://flags#enable-web-midi)) flags. 

Can be used in older browsers if [WebMIDIAPIShim](https://github.com/cwilso/WebMIDIAPIShim) is included on your html page.

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