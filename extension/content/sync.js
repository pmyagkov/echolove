//sc-button-pause
//sc-button-buffering

const CLASS = {
  buffering: 'sc-button-buffering',
  paused: 'sc-button-pause'
};

class Sync {
  constructor () {
    this._init();

    this._initBackgroundConnection();
  }

  _initBackgroundConnection () {
    this._port = chrome.runtime.connect({ name: 'sync' });

    this._port.onMessage.addListener((request) => this._onMessage(request));
  }

  _init () {
    this._playButton = this._findPlayButton();
    if (!this._playButton) {
      console.warn('Play button is not presented on the page');
      return;
    }
    
    this._initMutationObserver();

    this._scheduleReadinessCheck();
  }

  _scheduleReadinessCheck () {
    const timeout = 5000;

    if (this._readinessCheckTimeout) {
      console.log(`Clearing schedule timeout`);
      clearTimeout(this._readinessCheckTimeout);
    }

    console.log(`Scheduling readiness check after ${timeout}ms`);
    this._readinessCheckTimeout = setTimeout(() => this._checkReadiness(), timeout);
  }

  _stopObserving (options = { dom: true, attr: true, playback: true }) {
    console.log('Stop observing...', options);

    options.dom && this._domObserver.disconnect();
    options.attr && this._attrObserver.disconnect();
    options.playback && this._playbackObserver.disconnect();
  }

  _startObserving (options = { dom: true, attr: true, playback: true }) {
    console.log('Start observing...', options);

    const subtreeOptions = { subtree: true, childList: true };
    const attrOptions = { attributes: true, attributeOldValue: true };

    options.dom && this._domObserver.observe(document, subtreeOptions);
    options.attr && this._attrObserver.observe(this._playButton, attrOptions);
    if (options.playback) {
      this._playbackObserver.observe(this._findPlaybackContainer(), subtreeOptions);
    }
  }

  _checkReadiness () {
    console.log('Checking track status after timeout.');
    if (this._isPaused()) {
      console.log('Track is paused. READY! Sending command');
      this._sendCommand('ready');

      // stop all observers
      this._stopObserving();
    } else {
      console.log('Track is in undefined state. NOT READY!', this._playButton.classList);
    }
  }

  _initMutationObserver () {
    console.log('Init observing...');
    this._domObserver = new MutationObserver((records) => this._onDomMutation(records));
    this._attrObserver = new MutationObserver((records) => this._onAttrMutation(records));
    this._playbackObserver = new MutationObserver((records) => this._onPlaybackMutation(records));

    this._startObserving({ dom: true, attr: true });
  }
  
  _isPaused () {
    // sc-button-play playButton sc-button m-stretch

    const { classList } = this._playButton;
    
    return !classList.contains(CLASS.paused) && !classList.contains(CLASS.buffering);
  }

  _isPlaying () {
    // sc-button-play playButton sc-button m-stretch sc-button-pause

    const { classList } = this._playButton;

    return classList.contains(CLASS.paused) && !classList.contains(CLASS.buffering);
  }

  _isBuffering () {
    const { classList } = this._playButton;

    return classList.contains(CLASS.buffering);
  }

  _pause () {
    const isPlaying = this._isPlaying();
    const isBuffering = this._isBuffering();
    
    console.log('Attempt to pause', `Playing '${isPlaying}', buffering '${isBuffering}'`);

    if (!this._isPaused()) {
      console.log(`Track is playing. Click pause`);
      this._playButton.click();
    }
  }

  _play () {
    console.log('Attempt to play');

    // can't play if buffering
    if (this._isBuffering()) {
      console.log(`Can't play, buffering`);
      return false;
    }

    // play if paused
    if (this._isPaused()) {
      console.log(`Track is paused. Clicking play`);
      this._playButton.click();
      return true;
    }

    console.log(`Track is playing. Can't play it`);

    return false
  }

  _findPlayButton () {
    return document.querySelector('.playButton');
  }

  _findPlaybackContainer () {
    return document.querySelector('.playbackTimeline__timePassed');
  }

  _findPlaybackTime () {
    return document.querySelectorAll('.playbackTimeline__timePassed span')[1];
  }

  _onDomMutation (records) {
    console.log('DOM mutation', records.map(r => r.addedNodes));
    if (records.every(r => r.addedNodes.length === 0)) {
      console.log('No added nodes. Nothing interesting');
      return;
    }

    let playButton = this._findPlayButton();
    if (playButton !== this._playButton) {
      console.log('Replacing PLAY BUTTON pointer, relaunching observers');
      this._playButton = playButton;
      this._stopObserving({ attr: true });
      this._startObserving({ attr: true });

      this._scheduleReadinessCheck();
    }
  }

  _onAttrMutation (records) {
    console.log('Attr mutation', records, this._playButton.classList.toString());
    if (this._isPlaying()) {
      console.log('Is playing. Pause!');
      this._pause();
    }
  }

  _onPlaybackMutation (records) {
    const time = this._findPlaybackTime().textContent;
    console.log('Playback mutation', time);

    this._sendCommand('time', { time });
  }

  _sendCommand (command, data) {
    this._port.postMessage({ command, data });
  }

  _onMessage (request) {
    console.log('Sync port message came', request);
    switch (request.command) {
      case 'start':
        return this._start();

      case 'correct':
        return this._correct(request.data.diff);
    }
  }

  _correct (diff) {
    if (this._correctTimeout) {
      return console.log('Skip correction.');
    }

    console.log(`Correcting on ${diff}sec`);

    this._stopObserving({ playback: true });
    this._pause();

    this._correctTimeout = setTimeout(() => {
      console.log(`Correction timeout fired! Starting`);
      this._correctTimeout = null;
      this._start();
    }, diff * 1000);
  }

  _start () {
    this._playbackTime = this._findPlaybackTime();
    this._play();

    this._startObserving({ playback: true });
  }
}

console.log('SYNC injected');

new Sync;

