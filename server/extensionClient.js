const _ = require('lodash');
const { EventEmitter } = require('events');

const STATE = {
  init: 'init',
  ready: 'ready',
  playing: 'playing'
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
    return this._state === state;
  }

  _bindEvents () {
    this.ws.on('message', this._onMessage.bind(this));
    this.ws.on('close', this._onClose.bind(this));
  }

  _onMessage (evt) {
    console.log(`Incoming message from client '${this.id}' | ${evt}`);

    var message = JSON.parse(evt);
    switch (message.command) {
      case 'play':
      case 'pause':
        return this.emit(message.command, message.data);

      case 'ready':
        this.setState(STATE.ready);

        return this.emit('ready');

      case 'time':
        this._time = message.data.time;
        return this.emit('time', message.data);
    }
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
}


module.exports = { ExtensionClient, ClientState: STATE };
