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
 * @class ExtensionClient
 */
class ExtensionClient extends EventEmitter {
  constructor (options = {}) {
    super();

    const { id, ws } = options;

    this._ws = ws;
    this.id = id;
    this._state = ClientState.init;

    this._bindEvents();
  }

  setState (state) {
    if (!_(ClientState).values().includes(state)) {
      console.warn(`Attempt to set invalid state '${state}' in Client`);
    }

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

  _bindEvents () {
    this._ws.on('message', this._onMessage.bind(this));
    this._ws.on('close', this._onClose.bind(this));
  }

  _onMessage (evt) {
    console.log(`Incoming message from client '${this.id}' | ${evt}`);

    var message = JSON.parse(evt);
    // greetings, play, ready, time, quit, pause
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

  _onClose (evt) {
    console.log(`Need to close connection for client '${this.id}'`);

    this._closed = true;

    this.emit('close', evt);
  }

  isClosed () {
    return this._closed;
  }

  get time () {
    return this._time;
  }

  sendMessage (type, data = {}) {
    const message = JSON.stringify({ type, data });

    console.log(`Sending message from client '${this.id}'`, message);
    this._ws.send(message);
  }

  destroy () {
    this.removeAllListeners();
  }

  correct (diff) {
    this.setState(ClientState.correcting);
    this.sendMessage('correct', { diff });
  }

  pause () {
    if (this.notInState(ClientState.paused)) {
      this.sendMessage('pause');
    }
  }

  greetings (id) {
    this.sendMessage('greetings', { clientId: id });
  }

  activate (id) {
    this.id = id;

    this._closed = false;
  }
}


module.exports = { ExtensionClient, ClientState };
