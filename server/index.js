const WebSocketServer = require('./webSocketServer');

const SOCKET_PORT = 8070;
new WebSocketServer({ port: SOCKET_PORT });
