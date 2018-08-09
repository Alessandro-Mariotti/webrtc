(function() {
    'use strict';
    const WebSocket = require('ws');
    const ws = new WebSocket('ws://192.168.10.56:8080');
    ws.on('open', () => ws.send('something'));
    ws.on('message', message => console.log(`Received ${message}`));
    console.log('WebSocket Client started.');
})();