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

    this._webSocketClient.on('launch', this._onWSLaunch.bind(this));
    this._webSocketClient.on('play', this._onWSPlay.bind(this));
    this._webSocketClient.on('pause', this._onWSPause.bind(this));
    this._webSocketClient.on('stop', this._onWSStop.bind(this));
    this._webSocketClient.on('correct', this._onWSCorrect.bind(this));
  }

  _onWSCorrect (data) {
    return this._onWSMessage(data, 'correct');
  }

  _onWSPlay (data) {
    return this._onWSMessage(data, 'play');
  }

  _onWSPause (data) {
    return this._onWSMessage(data, 'pause');
  }

  _onWSStop (data) {
    return this._onWSMessage(data, 'stop');
  }

  _onWSMessage (data, command) {
    this._syncPort.postMessage({ command, data });
  }

  _onWSLaunch ({ url }) {

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

  _onLifecycleMessage (eventName, sender) {
    if (!sender.tab) {
      return;
    }

    switch (eventName) {
      case 'window-loaded':
        this._injectSyncScript(sender.tab.id);
        break;

      case 'window-unloaded':
        if (sender.tab.id === this._activeTabId) {
          this._activeTabId = null;
          // TODO do some client lifecycle work
          this._webSocketClient.quit();
        }
    }
  }

  _onMessage (request, sender, sendResponse) {
    console.log(`Common message '${request.command}' came`, request.data);

    const { command, data } = request;

    switch (command) {
      case 'lifecycle':
        return this._onLifecycleMessage(data.event, sender);

      case 'launch':
        return this._webSocketClient.launch(data.url);
    }
  }

  _onPortMessage (request) {
    console.log(`Port message '${request.command}' came`, request.data);

    const { command, data } = request;

    switch (command) {
      case 'ready':
      case 'pause':
      case 'play':
        this._webSocketClient[command]();
        break;

      case 'time':
        this._webSocketClient.sendTime(data.time);
        break;
    }
  }

  _injectSyncScript (tabId) {
    if (this._tabsToInject.includes(tabId)) {
      this._tabsToInject = this._tabsToInject.filter((id) => id !== tabId);

      chrome.tabs.executeScript(tabId, { file: 'js/sync.js' });

      this._activeTabId = tabId;
    }
  }

  _browserActionClick (tab) {

  }

  _showPageAction () {

  }
}

export default Background
