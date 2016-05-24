const SOCKET_URL = "ws://smoothy.puelle.me/ws";

class WSClient {
  constructor () {
    this._initConnection();
  }
  
  _initConnection () {
    let socket = this._socket = new WebSocket(SOCKET_URL);

    socket.onopen = (...args) => this._onOpen(...args);
    socket.onclose = (...args) => this._onClose(...args);
    socket.onmessage = (...args) => this._onMessage(...args);
    socket.onerror = (...args) => this._onError(...args);
  }

  _onOpen () {
    console.log(`Connection established`);
  }

  _onClose (evt) {
    if (event.wasClean) {
      console.log(`Connection closed`);
    } else {
      console.log(`Connection was interrupted`); // например, "убит" процесс сервера
    }
    console.log(`Code: ${evt.code}, reason ${evt.reason}`);

    this._initConnection();
  }

  _onMessage (evt) {
    console.log(`Data received '${evt.data}'`);
    let message = JSON.parse(evt.data);

    switch (message.type) {
      case 'play':
        const { url, initiator } = message.data;

        if (initiator !== this._cliendId) {
          console.log(`I'm about to open '${message.data.url}'`);
        } else {
          console.log(`I'm the initiator of this click.`)
        }

        chrome.tabs.query({ url }, (results) => {
          debugger;
          if (!results.length) {
            chrome.tabs.create({ url }, (tab) => {
              //chrome.tabs.executeScript(tab.id,{file: "buy.js"});
            });
          } else {
            chrome.tabs.update(results[0].id, { selected: true });
          }
        });

        break;

      case 'greetings':
        this._cliendId = message.data.clientId;
        break;
    }
  }

  _onError (error) {
    console.log(`Error '${error.message}'`);
  }

  play (url) {
    const data = { command: 'play', data: { url } };

    console.log('Sending WS play command', data);

    this._socket.send(JSON.stringify(data));
  }

}

class BackgroundPage {
  constructor (wsClient) {
    this._wsClient = wsClient;
    this._bindEvents();
  }

  _bindEvents () {
    chrome.tabs.onUpdated.addListener(this._showPageAction.bind(this));

    chrome.runtime.onMessage.addListener(this._onMessage.bind(this));

    chrome.browserAction.onClicked.addListener(this._browserActionClick.bind(this));
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
      /*case 'save':
        this._getActiveTabUrl().then((url) => {
          debugger;
          wsClient.play(url);

          sendResponse({ command: request.command, result: 'ok' });
        });

        console.groupEnd();
        return true;*/

      case 'play':
        this._wsClient.play(request.data.url);

        sendResponse({ command: request.command, result: 'ok' });

        console.groupEnd();
        return true;
    }
  }

  _browserActionClick (tab) {
    //this._wsClient.play(tab.url);
  }

  _showPageAction () {

  }
}

let wsClient = new WSClient();

new BackgroundPage(wsClient);
