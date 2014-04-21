var http = require("http"),
    util = require("util"),
    querystring = require("querystring"),
    git = require('simple-git'),
    async = require('async'),
    fs = require('fs');

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
    var ref = payload.ref;
    var branch = ref.substr(ref.lastIndexOf('/')+1);
    var path = '/var/www/html/'+branch;
    console.log('update ' + branch);
    if ( /^0+$/.test(payload.after) ){
      fs.unlink(path);
    }else{
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