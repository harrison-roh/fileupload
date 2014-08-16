var express = require('express'),
	app = express(),
	server = require('http').createServer(app),
	io = require('socket.io').listen(server),

	path = require('path'),
	fs = require('fs'),
	async = require('async'),
	rm = require('rimraf'),
	
	redis = require('redis'),
	client = redis.createClient(),

	rootDir = '/',
	repositoryDir = '/storage';
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

io.on('connection', function (socket)
{
	socket.on('reqAllDirs', function (data)
	{
		getAllDirs(socket);
	});

	socket.on('reqAllFiles', function (data)
	{
		var directory = data.directory;
		getAllFiles(socket, directory);
	});
});

var uploadFile = function (req, res)
{
	async.waterfall(
	[
		function (callback) // check directory
		{
			var targetPath = path.join(__dirname,
			                           repositoryDir,
			                           req.body.directory);

			fs.exists(targetPath, function (exists)
			{
				if (!exists)
				{
					// If not exist directory, create new one
					insertDir(targetPath);
				}

				callback(null, targetPath);
			});
		},
		function (targetPath, callback) // check file
		{
			var targetFile = path.join(targetPath, req.files.uploadfile.name);

			fs.exists(targetFile, function (exists)
			{
				if (exists)
				{
					// If already exist the file, file upload is ignored
					callback(null, null, targetPath);
				}
				else
				{
					callback(null, targetFile, targetPath);
				}
			});
		},
		function (targetFile, targetPath, callback) // store file
		{
			if (targetFile === null)
			{
				callback(null, false);
			}
			else
			{
				// copy file to under the `targetPath`
				fs.createReadStream(req.files.uploadfile.path)
				  .pipe(fs.createWriteStream(targetFile));

				insertFile(targetPath, req,files.uploadfile.name);

				callback(null, true);
			}
		}
	], function (err, result)
	{
		console.log('uploadFile: ' + result);
		res.redirect('back');
	});
}

var downloadFile = function (req, res)
{
	console.log('downloadFile: Not yet supported');
}

var insertDir = function (dir)
{
	client.hset(rootDir, dir, "", function (err, result)
	{
		if (err)
		{
			console.log('insertDir: ' + err);
		}
		else
		{
			console.log('insertDir: ' + result);

			fs.mkdir(dir, 0775, function (err)
			{
				if (err)
				{
					console.log('mkdir: ' + err);
					deleteDir(dir);
				}
			});
		}
	});
}

var deleteDir = function (dir)
{
	async.waterfall(
	[
		function (callback)
		{
			// Delete directory
			client.del(dir, function (err, result)
			{
				if (err)
				{
					console.log('deleteDir: ' + err);
					callback(null, false);
				}
				else
				{
					rm(dir, function (err)
					{
						console.log('rmdir: ' + err);
					}

					console.log('deleteDir: ' + result);
					callback(null, true);
				}
			});
		},
		function (result, callback)
		{
			if (result === false)
			{
				callback(null, false);
			}

			// Delete directory in rootDir directory
			client.hdel(rootDir, dir, function (err, result)
			{
				if (err)
				{
					console.log('deleteDir in /: ' + err);
					callback(null, false);
				}
				else
				{
					console.log('deleteDir in /: ' + result);
					callback(null, true);
				}
			});
		}
	], function (err, result)
	{
		console.log('deleteDir result: ' + result);
	});
}

var getAllDirs = function (socket)
{
	client.hkeys(rootDir, function (err, keys)
	{
		if (err)
		{
			console.log('getAllDirs: ' + err);
		}
		else
		{
			console.log('getAllDirs: ' + keys);

			var dirs = getDirNames(keys);
			console.log('getAllDirs name: ' + dirs);

			socket.emit('resAllDirs', {directorys, dirs});
		}
	});
}

var insertFile = function (dir, file)
{
	var token = file.split('.');
	var type = token[token.length - 1];

	client.hset(dir, file, type, function (err, result)
	{
		if (err)
		{
			console.log('insertFile: ' + err);
		}
		else
		{
			console.log('insertFile: ' + result);
		}
	});
}

var deleteFile = function (dir, file)
{
	client.hdel(dir, file, function (err, result)
	{
		if (err)
		{
			console.log('deleteFile: ' + err);
		}
		else
		{
			console.log('deleteFile: ' + result);
			var filePath = path.join(dir, file);

			unlink(filePath, function (err)
			{
				console.log('unlink: ' + err);
			});
		}
	});
}

var getAllFiles = function (socket, dir)
{
	client.hkeys(dir, function (err, keys)
	{
		if (err)
		{
			console.log('getAllFiles: ' + err);
		}
		else
		{
			console.log('getAllFiles: ' + keys);
			socket.emit('resAllFiles', {files, keys});
		}
	});
}

var getDirNames = function (dirs)
{
	var dirNames = [];
	var token;

	for (var i = 0; i < dirs.length; ++i)
	{
		token = dirs.split('/');
		dirNames.append(token[token.length - 1]);
	}

	return dirNames
}

// Initialization
(function ()
{
	client.hkeys(rootDir, function (err, keys)
	{
		if (err)
		{
			console.log('init failed');
		}
		else
		{
			if (keys.length === 0)
			{
				var tmpPath = path.join(__dirname, repositoryDir, 'default');
				insertDir(tmpPath);
			}
		}
	}
})();

console.log('Listening on port ' + port);
server.listen(port);

