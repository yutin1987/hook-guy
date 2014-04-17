var http = require("http");
var util = require("util");
var querystring = require("querystring");

var port = 8000;

this.server = http.createServer( function( req, res ) {
  console.log(req.method);

  var data = "";
  if ( req.method === "POST" ) {
    req.on( "data", function( chunk ) {
      data += chunk;
    });
  }

  req.on('end', function() {
    if ( /^payload=/.test( data ) ) {
      var payload = JSON.parse( querystring.unescape(data.slice(8)) );
      console.log(payload);
      res.writeHead( 200, {
        'Content-type': 'text/html'
      });
    }
    res.end();
  });

}).listen( port || 8000 );