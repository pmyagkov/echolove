var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var WebSocket = require('ws');
var _ = require('lodash');

// подключенные клиенты
var clients = {};
var clientIndex = 0;

var SOCKET_PORT = 8070;
var APP_PORT = 8069;

console.log('Creating ws server on port', SOCKET_PORT);

var wss = new WebSocket.Server({
  port: SOCKET_PORT
});

wss.on('connection', function(ws) {
  var id = clientIndex++;
  clients[id] = ws;
  console.log('New connection coming', id);

  ws.on('message', function (evt) {
    console.log('Incoming message from client', id, ' | ', evt);

    var message = JSON.parse(evt);
    switch (message.command) {
      case 'play':
        var url = message.data.url;
        if (url.indexOf('https://') === -1) {
          url = 'https://soundcloud.com' + url;
        }

        console.log('url', url);
        if (/^https:\/\/soundcloud\.com\/[^/]+\/[^/]+/.test(url)) {
          console.log('Url passed validation. Sending it to clients.');
          sendMessageToClient(null, JSON.stringify({ type: 'play', data: { url: url, initiator: id }}));
        } else {
          console.log('Url DIDNT pass validation. Avoid.');
        }

        break;
    }
  });

  ws.on('close', function() {
    console.log('Connection closed', id);
    delete clients[id];
  });

  ws.send(JSON.stringify({ type: 'greetings', data: { clientId: id }}));

});


function sendMessageToClient(id, message) {
  var cls;
  var ids = [id];
  if (!id || !clients[id]) {
    cls = _.values(clients);
    ids = _.keys(clients);
  } else {
    cls = [clients[id]];
  }

  cls.forEach(function (client) {
    console.log('Sending message to clients', ids);
    client.send(message);
  });
}


app.use(bodyParser.urlencoded({ extended: true }));

app.post('/play', function (req, res) {
  var url = req.body.url;

  if (!url) {
    return res.status(400).send('No `url` passed');
  }

  sendMessageToClient(null, JSON.stringify({ type: 'play', data: { url: url, initiator: null }}));

  res.status(200).end();

  /*
  var name = req.body.name;
  if (!name || name === '@') {
    name = 'Anonymous';
  }

  var message = text + '\n\n' + name;
  var url = 'https://api.telegram.org/bot190843896:AAFchCFzLnhq-H9FG0wZABviItMBA3_HCuo/sendMessage';
  var data = {chat_id: '@JIRAbusFeedback', text: message};

  request.post({ url: url, form: data }, function (err, httpResponse, body) {
    console.log('TELEGRAM RESPONSE', body);

    try {
      body = JSON.parse(body);
    } catch (e) {}

    res.set('Access-Control-Allow-Origin', '*');

    var text;
    if (err || !body.ok) {
      text = 'Request error: ' + JSON.stringify(err) + '\n\n' + 'Response payload: ' + JSON.stringify(body);
      res.status(502).send(text);
    } else {
      res.status(200).end('Success!');
    }

  });*/
});

app.listen(APP_PORT, function () {
  console.log('Smoothy server app listening on port 8069!');
});
