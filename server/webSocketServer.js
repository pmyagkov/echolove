const _ = require('lodash');
const { ExtensionClient, ClientState } = require('./extensionClient');
const WebSocket = require('ws');

class WebSocketServer {
  constructor ({ port } = {}) {
    console.log(`Creating WebSocketServer on port ${port}`);

    if (!port) {
      throw new Error('No port set in WebSocketServer');
    }

    this._port = port;
    this._wss = new WebSocket.Server({
      port: port
    });

    this._clients = [];
    this._clientIndex = 0;

    this._bindEvents();
  }

  _bindEvents () {
    this._wss.on('connection', this._onConnection.bind(this));
  }

  _onConnection (ws) {
    const id = this._clientIndex++;
    console.log('New connection coming', id);

    let client = new ExtensionClient({ id, ws });
    this._clients.push(client);

    this._bindClientEvents(client);

    client.sendMessage('greetings', { clientId: id });
  }

  _bindClientEvents (client) {
    client.on('play', this._onPlay.bind(this, client));
    client.on('ready', this._onReady.bind(this, client));
    client.on('close', this._onClose.bind(this, client));
    client.on('time', this._onTime.bind(this, client));
    client.on('quit', this._onClose.bind(this, client));
    client.on('pause', this._onPause.bind(this, client));
  }

  _getMinTime () {
    let minTime = this._clients[0].time;
    this._clients.forEach((client) => {
      if (client.time < minTime) {
        minTime = client.time;
      }
    });

    return minTime;
  }

  _onTime () {
    let minTime = this._getMinTime();
    this._clients.map((c) => {
      return {
        client: c, diff: c.time - minTime
      };
    }).forEach((clientObj) => {
      let { client, diff } = clientObj;

      if (Math.abs(diff) > 1) {
        client.correct(diff);
      }
    })
  }

  _onPlay (client, data) {
    var { url } = data;
    if (url.indexOf('https://') === -1) {
      url = 'https://soundcloud.com' + url;
    }

    console.log('url', url);
    if (/^https:\/\/soundcloud\.com\/[^/]+\/[^/]+/.test(url)) {
      console.log('Url passed validation. Sending it to clients.');

      this._sendMessageToClient(null, 'play', { url, initiator: client.id });

    } else {
      console.log('Url DIDNT pass validation. Avoid.');
    }
  }

  _onReady () {
    if (_.every(this._clients, (c) => c.inState(ClientState.ready))) {
      console.log('All clients are ready. Sending play!');

      this._sendMessageToClient(null, 'start');
    }
  }

  _onPause () {
    this._invokeClients(null, 'pause');
  }

  _invokeClients (id, method, data = {}) {
    data = _.isArray(data) ? data : [data];
    this._getClients(id).forEach((client) => _.isFunction(client[method]) && client[method](...data));
  }

  _onClose (client) {
    client.destroy();
    this._clients = _.filter(this._clients, (c) => c !== client);
  }

  _sendMessageToClient (id, type, data) {
    this._getClients(id).forEach((client) => client.sendMessage(type, data));
  }

  _getClients (id) {
    if (!_.isNumber(id)) {
      return this._clients;
    }

    return _.filter(this._clients, (client) => client.id === id);
  }
}

module.exports = WebSocketServer;
