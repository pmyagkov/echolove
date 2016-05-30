class Background {
  constructor (webSocketClient) {
    this._webSocketClient = webSocketClient;
    this._bindEvents();

    this._tabsToInject = [];
    this._activeTabId = null;
  }

  _bindEvents () {
    chrome.tabs.onUpdated.addListener(this._showPageAction.bind(this));

    chrome.runtime.onMessage.addListener(this._onMessage.bind(this));

    chrome.runtime.onConnect.addListener((port) => {
      console.log('Sync connection came');
      this._syncPort = port;

      port.onMessage.addListener(this._onPortMessage.bind(this));
    });

    chrome.browserAction.onClicked.addListener(this._browserActionClick.bind(this));

    this._webSocketClient.on('play', this._onWSPlay.bind(this));
    this._webSocketClient.on('start', this._onWSStart.bind(this));
    this._webSocketClient.on('pause', this._onWSPause.bind(this));
    this._webSocketClient.on('stop', this._onWSStop.bind(this));
    this._webSocketClient.on('correct', this._onWSCorrect.bind(this));
  }

  _onWSCorrect (evt) {
    return this._onWSMessage(evt, 'correct');
  }

  _onWSStart (evt) {
    return this._onWSMessage(evt, 'start');
  }

  _onWSPause (evt) {
    return this._onWSMessage(evt, 'pause');
  }

  _onWSStop (evt) {
    return this._onWSMessage(evt, 'stop');
  }

  _onWSMessage (evt, command) {
    this._syncPort.postMessage({ command, data: evt });
  }

  _onWSPlay (evt) {
    let { url } = evt.data;

    chrome.tabs.query({ url }, (results) => {
      let tabId;
      new Promise((resolve, reject) => {
        // if no matching tabs found
        if (!results.length) {
          // create one
          chrome.tabs.create({ url }, (tab) => {
            resolve(tabId = tab.id);
          });
        } else {
          tabId = results[0].id;
          // active tab
          chrome.tabs.update(tabId, { selected: true }, () => {
            // reload tab to normalize it's state
            const code = 'window.location.reload();';
            chrome.tabs.executeScript(tabId, { code }, () => {
              resolve(tabId);
            });
          });

        }
      }).then((tabId) => {
        // add tab to inject sync script when tab is ready
        this._tabsToInject.push(tabId);
      });
    });
  }

  _onMessage (request, sender, sendResponse) {
    console.group('Background._onMessage');

    console.log('Received message', sender.tab
      ? 'from a content script:' + sender.tab.url
      : 'from the extension'
    );

    console.log('request', request);
    console.log('sender', sender);

    console.log(`${request.command} command came`, request.data);

    switch (request.command) {
      case 'lifecycle':
        if (request.data.event === 'window-loaded' && sender.tab) {
          this._injectSyncScript(sender.tab.id);
        } else {
          console.log(`Can't inject script on '${request.data.event}`);
        }
        break;

      case 'play':
        this._webSocketClient.play(request.data.url);

        sendResponse({ command: request.command, result: 'ok' });

        console.groupEnd();
        return true;
    }
  }

  _onPortMessage (request) {
    console.log('Port message came', request);

    const { command, data } = request;

    switch (command) {
      case 'ready':
        this._webSocketClient.ready();

        break;

      case 'time':
        this._webSocketClient.sendTime(data.time);
    }
  }

  _injectSyncScript (tabId) {
    if (this._tabsToInject.includes(tabId)) {
      this._tabsToInject = this._tabsToInject.filter(id => id !== tabId);

      chrome.tabs.executeScript(tabId, { file: 'js/sync.js' });

      this._activeTabId = tabId;
    }
  }

  _browserActionClick (tab) {
    //this._webSocketClient.play(tab.url);
  }

  _showPageAction () {

  }
}

export default Background
