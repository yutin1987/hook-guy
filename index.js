#!/usr/bin/env node

var http = require("http"),
    util = require("util"),
    querystring = require("querystring"),
    git = require('simple-git'),
    async = require('async'),
    fs = require('fs');

var program = require('commander');
var exec = require('child_process').exec;

var nginx = function(){/*
server {
    listen         80;
    server_name    ${virtual_host};
    server_tokens  off;
    access_log     /var/log/nginx/${virtual_host}.access.log;
    root           /var/www/html/${virtual_host}/public;

    location / {
        index       index.php;
        add_header  X-Content-Type-Options "nosniff";
        add_header  X-XSS-Protection "1; mode=block";
        if (!-f $request_filename) {
            rewrite ^(.+)$ /index.php?_url=$1 last;
        }
    }

    location ~ \.php$ {
        fastcgi_pass   127.0.0.1:9000;
        fastcgi_index  index.php;
        include        /etc/nginx/fastcgi_params;
        fastcgi_param  SCRIPT_FILENAME  $document_root/$fastcgi_script_name;
        fastcgi_param  APPLICATION_ENV development;
    }

    location ~ \.(js|ico|gif|jpg|png|css|phtml)$ {
        add_header     X-Content-Type-Options "nosniff";
        add_header     X-XSS-Protection "1; mode=block";
        access_log     off;
        log_not_found  off;
    }

    location = /favicon.ico {
        access_log     off;
        log_not_found  off;
    }

    location ~ /\. {
        access_log     off;
        log_not_found  off;
        deny           all;
    }
}
*/}.toString().slice(14,-3);

program
  .version('0.0.1')
  .option('-p, --port [port]', 'Port')
  .option('-d, --dir [path]', '/var/www/html')
  .option('-v, --vhost [host]', 'Virtual Host')
  .option('-n, --nginx [path]', 'Nginx Path')
  .option('-s, --sites [file]', 'Nginx Config')
  .option('-c, --config', 'Create Config')
  .parse(process.argv);

if (program.config) {
  fs.writeFileSync('nginx', nginx);
  console.log('create nginx configs');
  process.exit(0);
}

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
    var nginx = program.nginx || '/etc/nginx/sites-available';
    console.log('updated ' + vhost);
    if ( /^0+$/.test(payload.after) ){
      exec('rm -rf ' + nginx + '/' + vhost);
      exec('rm -rf ' + path);
      exec('sudo service nginx reload');
    }else{
      var rep;
      async.series([
        function (cb) {
          fs.exists(path, function (exists) { cb(exists ? true : null)});
        },
        function (cb) {
          console.log('mkdir ' + vhost);
          fs.mkdir(path, 0777, cb); 
        },
        function (cb) {
          console.log('git clone ' + vhost);
          rep = git('/var/www/html/'+branch+'.'+program.vhost);
          rep.clone(payload.repository.url, './', cb);
        },
        function (cb) {
          console.log('set config ' + vhost);
          var config = program.config;
          if (config && fs.existsSync(config)){
            config = fs.readFileSync(config).toString();
            config = config.replace(/\${virtual_host}/gi, vhost);
            fs.writeFile(nginx + '/' + vhost, config, cb);
            exec('sudo service nginx reload');
          }else{
            cb();
          }
        }
      ], function () {
        rep = git('/var/www/html/'+branch+'.'+program.vhost);
        rep.checkout(branch, function(){
          rep.pull(function (){
            console.log('git pull ' + vhost);
          });
        })
      });
    }

    res.writeHead( 200, {
      'Content-type': 'text/html'
    });
    res.end();
  });

}).listen( program.port || 8000 );