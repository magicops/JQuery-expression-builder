var express = require('express');
var path = require('path');
var open = require('open');
var webpack = require('webpack');

const port = 3000;
const app = express();


app.get('/', function (req, res) {
    res.sendFile(path.join(__dirname, 'demo/index.html'));
});

app.listen(port, function (err) {
    if (err)
        console.log(err);
    else
        open('http://localhost:' + port);
});