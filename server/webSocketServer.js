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

    /** {ExtensionClient[]} */
    this._clients = [];
    this._clientIndex = 0;

    this._bindEvents();
  }

  _bindEvents () {
    this._wss.on('connection', this._onConnection.bind(this));
  }

  _createClient (options) {
    let client = new ExtensionClient(options);
    this._clients.push(client);

    this._bindClientEvents(client);
  }

  _onConnection (ws) {
    console.log(`New connection request came. Send greetings`);

    const tempId = this._clientIndex++;
    ws.send(JSON.stringify({ type: 'greetings', data: { clientId: tempId }}));

    var _this = this;
    ws.on('message', function onGreetings(request) {
      ws.removeListener('message', onGreetings);

      var message = JSON.parse(request);

      switch (message.command) {
        case 'greetings':
          const clientId = message.data.clientId;
          console.log(`Greetings response came with clientId '${clientId}'`);

          let client;
          const isNewClient = tempId === clientId;
          const oldClient = client = _.find(_this._clients, { id: clientId });

          if (isNewClient || !oldClient) {
            isNewClient && console.log(`It's new client, creating it...`);
            !oldClient && console.log(`Client with this id '${clientId}' not found. Constructing new one...`);

            _this._createClient({ id: clientId, ws });

          } else {
            console.log(`Client found! It's state '${oldClient.getState()}' and ${oldClient.isClosed() ? 'is': 'is NOT'} closed`);
            if (oldClient.isClosed()) {
              console.log(`It's in closed state. Activating...`);
            } else {
              console.warn(`Client state is abnormal. But activate it anyway...`);
            }

            oldClient.activate({ id: clientId, ws });
          }

          break;
      }
    });
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
    this._getClientsByType(ClientState.playing).map((c) => {
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

  _onClose (client) {
    //client.destroy();
    //this._clients = _.filter(this._clients, (c) => c !== client);
  }

  _invokeClients (id, method, data = {}) {
    data = _.isArray(data) ? data : [data];
    this._getClients(id).forEach((client) => _.isFunction(client[method]) && client[method](...data));
  }

  _sendMessageToClient (id, type, data) {
    this._getClients(id).forEach((client) => client.sendMessage(type, data));
  }

  // TODO: check workness
  _getClientsByType({ inState, notInState } = {}) {
    let clients = this._clients;
    if (inState) {
      inState = _.isArray(inState) ? inState : [inState];
      clients = _.filter(clients, (c) => _.some(inState, (st) => c.inState(st)));
    }

    if (notInState) {
      notInState = _.isArray(notInState) ? notInState : [notInState];
      clients = _.filter(clients, (c) => _.some(notInState, (st) => c.notInState(st)));
    }

    return clients;
  }

  _getClients (id) {
    if (!_.isNumber(id)) {
      return this._clients;
    }

    return _.filter(this._clients, (client) => client.id === id);
  }
}

module.exports = WebSocketServer;
