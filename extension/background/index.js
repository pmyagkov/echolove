import WebSocketClient from './webSocketClient'
import Background from './background'

let webSocketClient = new WebSocketClient();

new Background(webSocketClient);
