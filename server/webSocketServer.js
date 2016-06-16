const _ = require('lodash');
const {
  ExtensionClient,
  ClientState,
  ClientCommands
  } = require('./extensionClient');
const WebSocket = require('ws');

class WebSocketServer {
  constructor ({ port } = {}) {
    this.log(`Creating WebSocketServer on port ${port}`);

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
    this.log(`New connection request came. Send greetings`);

    const tempId = this._clientIndex++;
    ws.send(JSON.stringify({ type: ClientCommands.greetings, data: { clientId: tempId }}));

    var _this = this;
    ws.on('message', function onGreetings(request) {
      ws.removeListener('message', onGreetings);

      var message = JSON.parse(request);

      switch (message.command) {
        case ClientCommands.greetings:
          const clientId = message.data.clientId;
          _this.log(`Greetings response came with clientId '${clientId}'`);

          let client;
          const isNewClient = tempId === clientId;
          const oldClient = client = _.find(_this._clients, { id: clientId });

          if (isNewClient || !oldClient) {
            isNewClient && _this.log(`It's new client, creating it...`);
            !oldClient && _this.log(`Client with this id '${clientId}' not found. Constructing new one...`);

            _this._createClient({ id: clientId, ws });

          } else {
            _this.log(`Client found! It's state '${oldClient.getState()}' and ${oldClient.closed ? 'is': 'is NOT'} closed`);
            if (oldClient.closed) {
              _this.log(`It's in closed state. Activating...`);
            } else {
              _this.warn(`Client state is abnormal. But activate it anyway...`);
            }

            oldClient.activate({ id: clientId, ws });
          }

          if (this._clientIndex <= clientId) {
            this._clientIndex = clientId + 1;
          }

          break;
      }
    });
  }

  _bindClientEvents (client) {
    client
      .on('launch', this._onLaunch.bind(this, client))
      .on('ready', this._onReady.bind(this, client))
      .on('close', this._onClose.bind(this, client))
      .on('time', this._onTime.bind(this, client))
      .on('quit', this._onClose.bind(this, client))
      .on('pause', this._onPause.bind(this, client))
      .on('play', this._onPlay.bind(this, client));
  }

  _getMinTime () {
    const playingClients = this._getClients({ inState: ClientState.playing });

    if (!playingClients.length) {
      return null;
    }

    let minTime = playingClients[0].time;
    playingClients.forEach((client) => {
      if (client.time < minTime) {
        minTime = client.time;
      }
    });

    return minTime;
  }

  _onTime () {
    let minTime = this._getMinTime();
    const playingClients = this._getClients({ inState: ClientState.playing });

    const playingDiffs = playingClients.map((c) => {
      return {
        client: c, diff: c.time - minTime
      };
    });

    let diffString = '';
    playingDiffs.forEach((d) => diffString += `${d.client.id}|${d.diff} `);
    this.log(`MIN time: ${minTime}s; DIFFS (${playingClients.length}): ${diffString}`);

    playingDiffs.forEach((clientObj) => {
      let { client, diff } = clientObj;

      if (Math.abs(diff) > 1) {
        client.correct(diff);
      }
    })
  }

  _onLaunch (client, data) {
    var { url } = data;
    if (url.indexOf('https://') === -1) {
      url = 'https://soundcloud.com' + url;
    }

    this.log(`Launch command handled with url '${url}'`);
    if (/^https:\/\/soundcloud\.com\/[^/]+\/[^/]+/.test(url)) {
      this.log('Url passed the validation. Launching clients.');

      this._invokeClients(ClientCommands.launch, null, { url });

    } else {
      this.warn(`Url didn't pass the validation.`);
    }
  }

  _areAllClientsReady () {
    return _.every(this._clients, (c) => c.closed || c.inState(ClientState.ready));
  }

  _onReady () {
    if (this._areAllClientsReady()) {
      this.log('All clients are ready. Sending play!');

      this._invokeClients(ClientCommands.play);
    }
  }

  _onPause () {
    this._invokeClients(ClientCommands.pause);
  }

  _onPlay () {
    this._invokeClients(ClientCommands.play);
  }

  _onClose (client) {
    //client.destroy();
    //this._clients = _.filter(this._clients, (c) => c !== client);
  }

  _invokeClients (method, criteria, ...args) {
    if (!_.isFunction(ExtensionClient.prototype[method])) {
      this.warn(`No '${method}' method is presented in ExtensionClient`);
      return;
    }

    this._getClients(criteria).forEach((client) => client[method](...args));
  }

  /**
   * Returns a list of clients filtered by criteria.
   *
   * @param {Object} criteria
   * @param {String|String[]} [criteria.inState]
   * @param {String|String[]} [criteria.notInState]
   * @returns {Array}
   * @private
   */
  _getClients(criteria = {}) {
    let clients = this._clients;

    // fetch not closed clients by default
    criteria = _.extend({ closed: false }, criteria);

    let { inState, notInState } = criteria;

    if (inState) {
      inState = _.isArray(inState) ? inState : [inState];
      clients = _.filter(clients, (c) => _.some(inState, (st) => c.inState(st)));
    }
    delete criteria.inState;

    if (notInState) {
      notInState = _.isArray(notInState) ? notInState : [notInState];
      clients = _.filter(clients, (c) => _.some(notInState, (st) => c.notInState(st)));
    }
    delete criteria.notInState;

    return _.filter(clients, criteria);
  }

  log (...args) {
    return console.log(...[`WS SERVER:`, ...args]);
  }

  warn (...args) {
    return console.warn(...[`WS SERVER:`, ...args]);
  }
}

module.exports = WebSocketServer;
