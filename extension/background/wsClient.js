import EventEmitter from '../../node_modules/eventemitter2/index'

const SOCKET_URL = "ws://smoothy.puelle.me/ws";

class WSClient {
  constructor () {
    this._initConnection();
  }

  _initConnection () {
    let socket = this._socket = new WebSocket(SOCKET_URL);

    socket.onopen = (...args) => this._onOpen(...args);
    socket.onclose = (...args) => this._onClose(...args);
    socket.onmessage = (...args) => this._onMessage(...args);
    socket.onerror = (...args) => this._onError(...args);
  }

  _onOpen () {
    console.log(`Connection established`);
  }

  _onClose (evt) {
    if (event.wasClean) {
      console.log(`Connection closed`);
    } else {
      console.log(`Connection was interrupted`); // например, "убит" процесс сервера
    }
    console.log(`Code: ${evt.code}, reason ${evt.reason}`);

    this._initConnection();
  }

  _onMessage (evt) {
    console.log(`Data received '${evt.data}'`);
    let message = JSON.parse(evt.data);

    switch (message.type) {
      case 'play':
        const { url, initiator } = message.data;

        if (initiator !== this._cliendId) {
          console.log(`I'm about to open '${message.data.url}'`);
        } else {
          console.log(`I'm the initiator of this click.`)
        }

        this.emit('play', { data: { url }});

        break;

      case 'greetings':
        this._cliendId = message.data.clientId;
        break;
    }
  }

  _onError (error) {
    console.log(`Error '${error.message}'`);
  }

  _prepareRequest (command, data = {}) {
    return JSON.stringify({
      command, data: Object.assign(data, { clientId: this._cliendId })
    });
  }

  play (url) {
    console.log(`Sending WS 'play' command`, url);

    this._socket.send(this._prepareRequest('play', { url }));
  }

  ready () {
    console.log(`Sending WS 'ready' command`);

    this._socket.send(this._prepareRequest('ready'));
  }

}

Object.assign(WSClient.prototype, EventEmitter.prototype);

export default WSClient
