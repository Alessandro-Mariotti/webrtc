(function() {
	const WebSocket = require('ws');
	const wss = new WebSocket.Server({ port: 8080 });

	function broadcast(webSocketServer, ws, message) {
		webSocketServer.clients.forEach(function each(client) {
			if (client !== ws && client.readyState === WebSocket.OPEN) {
				client.send(message);
			}
		});
	}

	wss.on('connection', ws => {
		let count = 0;
		wss.clients.forEach(client => count++);
		if (count === 1) {
			ws.send('initiator');
		}
		if (count > 1) {
			broadcast(wss, ws, 'join');
		}
		console.log(`New client connected, connected clients: ${count}`);
		ws.on('message', message => {
			console.log(`Received ${message}`);
			// wss.clients.forEach(function each(client) {
			// 	if (client !== ws && client.readyState === WebSocket.OPEN) {
			// 		client.send(message);
			// 	}
			// });
			broadcast(wss, ws, message);
		});
	});
	console.log('WebSocket server started');
})();
