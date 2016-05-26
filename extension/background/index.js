import WSClient from './wsClient'
import Background from './background'

let wsClient = new WSClient();

new Background(wsClient);
