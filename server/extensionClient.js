const _ = require('lodash');
const { EventEmitter } = require('events');

const STATE = {
  init: 'init',
  ready: 'ready',
  playing: 'playing',
  paused: 'paused',
  correcting: 'correcting',
  quitted: 'quitted'
};

class ExtensionClient extends EventEmitter {
  constructor (options = {}) {
    super();

    const { id, ws } = options;

    _.extend(this, { id, ws });

    this._state = STATE.init;

    this._bindEvents();
  }

  setState (state) {
    if (!_(STATE).values().includes(state)) {
      console.warn(`Attempt to set invalid state '${state}' in Client`);
    }

    this._state = state;
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
    this.ws.on('message', this._onMessage.bind(this));
    this.ws.on('close', this._onClose.bind(this));
  }

  _onMessage (evt) {
    console.log(`Incoming message from client '${this.id}' | ${evt}`);

    var message = JSON.parse(evt);
    // play, ready, time, quit, pause
    switch (message.command) {
      case 'ready':
        this.setState(STATE.ready);
        break;

      case 'time':
        this._time = message.data.time;
        this.setState(STATE.playing);
        break;

      case 'quit':
        this.setState(STATE.quitted);
        break;

      case 'pause':
        this.setState(STATE.paused);
        break;
    }

    return this.emit(message.command, message.data);
  }

  _onClose (evt) {
    console.log(`Need to close connection for client '${this.id}'`);

    this.emit('close', evt);
  }

  get time () {
    return this._time;
  }

  sendMessage (type, data = {}) {
    const message = JSON.stringify({ type, data });

    console.log(`Sending message from client '${this.id}'`, message);
    this.ws.send(message);
  }

  destroy () {
    this.removeAllListeners();
  }

  correct (diff) {
    this.setState(STATE.correcting);
    this.sendMessage('correct', { diff });
  }

  pause () {
    if (this.notInState(STATE.paused)) {
      this.sendMessage('pause');
    }
  }
}


module.exports = { ExtensionClient, ClientState: STATE };
