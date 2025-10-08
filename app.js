const express= require("express");
const app = express();

const path = require( "path" );
const cors = require( "cors" );
const bodyParser = require( "body-parser" );
const cookieParser = require( "cookie-parser" );

const IndexController = require("./src/indexController.js");
const EditorController = require("./src/editorController.js");

const router = express.Router();

app.set( "view engine", "ejs" );
app.set( "views", path.join( __dirname, "../../views" ) );

app.use( cookieParser( "secret" ) );
app.use( bodyParser.json() );
app.use( bodyParser.urlencoded( { extended: true } ) );
app.use( express.json() );
app.use( express.urlencoded( { extended: true } ) );
app.use( cors() );

app.use( express.static( path.join( __dirname, "../../public" ) ) );

const ROUTE_START = "/.netlify/functions/server";

app.use(`${ROUTE_START}/index`, IndexController);
app.use(`${ROUTE_START}/editor`, EditorController);

app.get(ROUTE_START, (req, res) => {
    res.render('pages/index', { title: 'Text Editor' });
});

module.exports = app;