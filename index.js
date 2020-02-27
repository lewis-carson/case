var app = require("express")();
var http = require("http").createServer(app);
var chokidar = require("chokidar");
const fs = require("fs");
var thumb = require("node-thumbnail").thumb;
var path = require("path");
var io = require('socket.io')(http);
var multer  = require('multer')
var upload = multer({ dest: 'cache/' })

const imgfolder = "public/img/"
const thumbfolder = "public/thumbnails/"

var watcher_img = chokidar.watch(imgfolder, {ignored: /^\./, persistent: true});
var watcher_thumb = chokidar.watch(thumbfolder, {ignored: /^\./, persistent: true});

var global_socket;

function generate_thumb(filepath){
	thumb({
		source: filepath,
		destination: thumbfolder,
		concurrency: 4,
		quiet: true,
		skip: true,
		ignore: true
	}, function(files, err, stdout, stderr) {
		console.log("[", files[0].srcPath, "] thumbnail generated")
	});
}

function delete_thumb(filepath){
	var base = path.basename(filepath).replace(/\.[^/.]+$/, "")
	var ext = path.extname(path.basename(filepath))
	fs.unlinkSync(thumbfolder + base + "_thumb" + ext);
}

function update_client(filepath){
	if(global_socket){
		var base = path.basename(filepath)
		global_socket.emit("update_client", base);
	}
}

function remove_client(filepath){
	if(global_socket){
		var base = path.basename(filepath)
		global_socket.emit('remove_client', base);
	}
}

function update_img(action, filepath){
	if(action == "add"){
		generate_thumb(filepath)
	}else if (action == "delete"){
		remove_client(filepath)
	}
}

function update_thumb(action, filepath){
	update_client(filepath)
}

function thumb_list(socket){
	fs.readdir(thumbfolder, function(err, files) {
		var filelist = []
		files.forEach(function(file) {
			filelist.push(file)
		})
		socket.emit("thumb_list", filelist);
	})	
}

function clear_thumbs(){
	fs.readdir(thumbfolder, function(err, files) {
		files.forEach(function(file) {
			fs.unlinkSync(thumbfolder + file);
		})
	})
}


app.get("/", function(req, res){
	res.sendFile(__dirname + "/public/index.html");
});

app.get("/css/main.css", function(req, res){
	res.sendFile(__dirname + "/public/css/main.css");
});

app.get("/thumbnails/*", function(req, res){
	res.sendFile(__dirname + "/public/" + req.path.replace("%20", " "));
});

var cpUpload = upload.fields([{ name: 'img', maxCount: 100 }])
app.post('/add_image', cpUpload, function (req, res, next) {
	var original = req.files.img[0].originalname
	var filename = req.files.img[0].filename

	fs.rename("cache/" + filename, "public/img/" + original, function (err) {
		if (err) throw err
		res.redirect("back");
	})
})

io.on("connection", function(socket){
	io.on("connection", function(socket){
		thumb_list(socket)
		global_socket = socket;

		socket.on("add_image", function(){
			console.log("new image");
		});

		socket.on("delete_image", function(){
			console.log("new image");
		});
	});
});

http.listen(3000, function(){
	//clear_thumbs()

	watcher_img
		.on("add", function(ipath) {update_img("add", ipath)})
		.on("change", function(ipath) {update_img("change", ipath)})
		.on("unlink", function(ipath) {update_img("delete", ipath)})

	watcher_thumb
		.on("add", function(ipath) {update_client(ipath)})
		.on("change", function(ipath) {update_client(ipath)})
		.on("unlink", function(ipath) {update_client(ipath)})
});