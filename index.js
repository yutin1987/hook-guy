var http = require("http");
var util = require("util");
var querystring = require("querystring");
var git = require('simple-git');
var async = require('async');
var fs = require('fs');

var port = 8000;

this.server = http.createServer( function( req, res ) {
  console.log(req.method);

  var data = '';
  if ( req.method === "POST" ) {
    req.on( "data", function( chunk ) {
      data += chunk;
    });
  }

  req.on('end', function() {
    payload = JSON.parse(data);
    console.log(payload);
    if ( /^0+$/.test(payload.after) ){
    }else{
      var ref = payload.ref;
      var branch = ref.substr(ref.lastIndexOf('/')+1);
      var path = '/var/www/html/'+branch;
      var rep;
      async.series([
        function (cb) {
          fs.exists(path, function (exists) { cb(exists ? true : null)});
        },
        function (cb) {
          fs.mkdir(path, 0777, cb); 
        },
        function (cb) {
          rep = git('/var/www/html/'+branch);
          rep.clone(payload.repository.url, './', cb);
        }
      ], function () {
        rep = git('/var/www/html/'+branch);
        rep.checkout(branch, function(){
          rep.pull();
        })
      });
    }

    res.writeHead( 200, {
      'Content-type': 'text/html'
    });
    res.end();
  });

}).listen( port || 8000 );