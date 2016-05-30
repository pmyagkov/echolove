var express = require('express');
var app = express();
var bodyParser = require('body-parser');

class AppServer {
  constructor (port) {

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

    app.listen(port, function () {
      console.log('Smoothy server app listening on port 8069!');
    });

  }
}

module.exports = AppServer;
