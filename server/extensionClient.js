const _ = require('lodash');
const { EventEmitter } = require('events');

/**
 * @readonly
 * @enum {String}
 * @typedef ClientState
 */
const ClientState = {
  init: 'init',
  ready: 'ready',
  playing: 'playing',
  paused: 'paused',
  correcting: 'correcting',
  quitted: 'quitted'
};

/**
 * @readonly
 * @enum {String}
 * @typedef ClientCommands
 */
const ClientCommands = {
  launch: 'launch',
  play: 'play',
  pause: 'pause',
  correct: 'correct',
  greetings: 'greetings'
};

const WEB_SOCKET_STATE = ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'];

/**
 * @class ExtensionClient
 */
class ExtensionClient extends EventEmitter {
  constructor (options = {}) {
    super();

    this.activate(options);

    this._state = ClientState.init;
  }

  setState (state) {
    if (!_(ClientState).values().includes(state)) {
      this.warn(`Attempt to set invalid state '${state}' in Client`);
    }

    this.log(`State set to '${state}'`);

    this._state = state;
  }

  getState () {
    return this._state;
  }

  inState (state) {
    state = _.isArray(state) ? state : [state];

    return _.includes(state, this._state);
  }

  notInState (state) {
    state = _.isArray(state) ? state : [state];

    return !_.includes(state, this._state);
  }

  _bindSocketEvents () {
    this._ws.on('message', this._onMessage.bind(this));
    this._ws.on('close', this._onClose.bind(this));
  }

  _onMessage (evt) {
    this.log(`Incoming message | ${evt}`);

    var message = JSON.parse(evt);
    // launch, play, ready, time, quit, pause
    switch (message.command) {
      case 'ready':
        this.setState(ClientState.ready);
        break;

      case 'time':
        this._time = message.data.time;
        this.setState(ClientState.playing);
        break;

      case 'quit':
        this.setState(ClientState.quitted);
        break;

      case 'pause':
        this.setState(ClientState.paused);
        break;
    }

    return this.emit(message.command, message.data);
  }
  
  _printWebSocketState () {
    this.log(`WebSocket state is ${this._getWebSocketState()}`);
  }

  _onClose (evt) {
    this.log(`Need to close connection for client '${this.id}'`);

    this._closed = true;

    this.emit('close', evt);
  }

  get closed () {
    return this._closed;
  }

  get time () {
    return this._time;
  }

  _sendMessage (type, data = {}) {
    this._printWebSocketState();

    const message = JSON.stringify({ type, data });

    // Socket is closed
    if (this._ws.readyState === 3) {
      this.warn(`Socket is closed, can't send the message!`);
      return;
    }

    this.log(`Sending message from client '${this.id}'`, message);
    this._ws.send(message);
  }

  destroy () {
    this.removeAllListeners();
  }

  correct (diff) {
    this.setState(ClientState.correcting);
    this._sendMessage(ClientCommands.correct, { diff });
  }

  pause () {
    if (this.notInState(ClientState.paused)) {
      this._sendMessage(ClientCommands.pause);
    }
  }

  play () {
    if (this.notInState(ClientState.playing)) {
      this._sendMessage(ClientCommands.play);
    }
  }

  launch ({ url }) {
    this._sendMessage(ClientCommands.launch, { url });
  }

  greetings (id) {
    this._sendMessage(ClientCommands.greetings, { clientId: id });
  }

  _getWebSocketState() {
    let literalState = WEB_SOCKET_STATE[this._ws.readyState];

    return `${literalState}|${this._ws.readyState}`;
  }

  activate ({ id, ws } = {}) {
    this.id = id;
    this._ws = ws;

    this._bindSocketEvents();

    this.log(`Activate client ${id} with readyState ${this._getWebSocketState()}`);

    this._closed = false;
  }

  log (...args) {
    return console.log(...[`CLIENT ${this.id}:`, ...args]);
  }

  warn (...args) {
    return console.warn(...[`CLIENT ${this.id}:`, ...args]);
  }
}


module.exports = { ExtensionClient, ClientState, ClientCommands };
