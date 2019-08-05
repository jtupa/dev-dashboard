const express = require('express')
const path = require("path");
const app = express()
const port = 8080
app.use( '/', express.static( __dirname + '/src' ));
app.listen(port, () => console.log(`Example app listening on port ${port}!`))