var http = require("http"),
    util = require("util"),
    querystring = require("querystring"),
    git = require('simple-git'),
    async = require('async'),
    fs = require('fs');

var program = require('commander');

program
  .version('0.0.1')
  .option('-p, --port', 'Port')
  .option('-d, --dir', '/var/www/html')
  .option('-v, --vhost', 'Virtual Host')
  .option('-n, --nginx', 'Nginx Path')
  .option('-c, --config', 'Nginx Config')
  .parse(process.argv);

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
    var vhost = branch + (program.vhost ? '.' + program.vhost : '');
    var path = '/var/www/html/' + vhost;
    console.log('updated ' + branch);
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
          rep = git('/var/www/html/'+branch+'.'+program.vhost);
          rep.clone(payload.repository.url, './', cb);
        },
        function (cb) {
          var nginx = program.nginx || '/etc/nginx/sites-available';
          var config = program.config || 'nginx';
          config = fs.readFileSync(config);
          config = config.replace(/\${virtual_host}/gi, vhost);
          fs.writeFile(nginx + '/' + vhost, config, cb);
        }
      ], function () {
        rep = git('/var/www/html/'+branch+'.'+program.vhost);
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

}).listen( program.port || 8000 );