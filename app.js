var express = require('express'),
	app = express(),
	server = require('http').createServer(app),
	path = require('path'),
	fs = require('fs'),
	async = require('async'),
	port = 8888; // change yourself

app.set('views', path.join(__dirname, '/views'));
app.engine('html', require('ejs').renderFile);
app.use(express.bodyParser());

app.get('/', function (req, res)
{
	res.render('index.html');
});

app.post('/upload', function (req, res)
{
	uploadFile(req, res);
});

function uploadFile(req, res)
{
	async.waterfall(
	[
		function (callback)
		{
			var targetPath = path.join(__dirname, '/storage', req.body.directory);

			callback(null, targetPath);
		},
		function (targetPath, callback)
		{
			fs.exists(targetPath, function (exists)
			{
				if (exists)
				{
					callback(null, targetPath);
				}
				else
				{
					// If not exist directory, create new one
					fs.mkdir(targetPath, 0775, function (err)
					{
						callback(null, targetPath);
					});
				}
			});
		},
		function (targetPath, callback)
		{
			var targetFile = path.join(targetPath, req.files.uploadfile.name);

			fs.exists(targetFile, function (exists)
			{
				if (exists)
				{
					// If already exist file, file upload is ignored
					callback(null, null);
				}
				else
				{
					callback(null, targetFile);
				}
			});
		},
		function (targetFile, callback)
		{
			if (targetFile === null)
			{
				callback(null, 'duplicated');
			}
			else
			{
				// copy file to under the `targetPath`
				fs.createReadStream(req.files.uploadfile.path)
				  .pipe(fs.createWriteStream(targetFile));
				callback(null, 'done');
			}
		}
	], function (err, result)
	{
		console.log('result: ' + result);
		res.redirect('back');
	});
}

console.log('Listening on port ' + port);
server.listen(port);

