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
    console.log("Соединение установлено.");
  }

  _onClose () {
    if (event.wasClean) {
      console.log('Соединение закрыто чисто');
    } else {
      console.log('Обрыв соединения'); // например, "убит" процесс сервера
    }
    console.log('Код: ' + event.code + ' причина: ' + event.reason);

    this._initConnection();
  }

  _onMessage (evt) {
    console.log("Получены данные " + evt.data);
    let message = JSON.parse(evt.data);

    switch (message.type) {
      case 'play':
        let initiator = message.data.initiator;
        if (initiator !== this._cliendId) {
          console.log(`I'm about to open '${message.data.url}'`);
          chrome.tabs.create({ url: message.data.url });
        } else {
          console.log(`I'm the initiator of this click. Avoid it.`)
        }
        break;

      case 'greetings':
        this._cliendId = message.data.clientId;
        break;
    }
  }

  _onError (error) {
    console.log("Ошибка " + error.message);
  }

  play (url) {
    this._socket.send(JSON.stringify({ command: 'play', data: { url } }));
  }

}

let wsClient = new WSClient();

chrome.browserAction.onClicked.addListener((tab) => {
  wsClient.play(tab.url);
});
