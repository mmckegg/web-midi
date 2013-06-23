web-midi
===

This module wraps the proposed Web MIDI API (which no browsers currently implement) into a stream interface. This can be used now if you include [WebMIDIAPIShim](https://github.com/cwilso/WebMIDIAPIShim) on your html page.

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

// on note
outStream.write([146, 38, 127])

setTimeout(function(){
  // off note
  outStream.write([146, 38, 0])
}, 1000)

// or use pipes
var anotherStream = midi.openOutput('IAC')
inStream.pipe(anotherStream)
```