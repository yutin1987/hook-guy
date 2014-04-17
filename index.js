var http = require("http");
var util = require("util");
var querystring = require("querystring");

var port = 9000;

this.server = http.createServer( function( req, res ) {
  var data = "";
  if ( req.method === "POST" ) {
    req.on( "data", function( chunk ) {
      data += chunk;
    });
  }

  req.on( "end", function() {
    if ( _.indexOf( gith.ips, req.connection.remoteAddress ) >= 0 ||
         _.indexOf( gith.ips, "*" ) >= 0 ) {
      if ( /^payload=/.test( data ) ) {
        var payload = JSON.parse( querystring.unescape(data.slice(8)) );
        console.log(payload);
        res.writeHead( 200, {
          'Content-type': 'text/html'
        });
      }
    }      
    res.end();
  });

}).listen( port || 9000 );