var express = require('express');
var app = express();
var bodyParser = require('body-parser');

class AppServer {
  constructor (port) {

    app.use(bodyParser.urlencoded({ extended: true }));

    app.post('/launch', function (req, res) {
      var url = req.body.url;

      if (!url) {
        return res.status(400).send('No `url` passed');
      }

      res.status(200).end();
    });

    app.listen(port, function () {
      console.log('Smoothy server app listening on port 8069!');
    });

  }
}

module.exports = AppServer;
