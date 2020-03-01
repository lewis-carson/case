var global_socket;
var app = require("express")();
var http = require("http").createServer(app);
var chokidar = require("chokidar");
var path = require("path");
var io = require('socket.io')(http);
var multer  = require('multer');
var upload = multer({ dest: 'cache/' });
const ext = ["ase","art","bmp","blp","cd5","cit","cpt","cr2","cut","dds","dib","djvu","egt","exif","gif","gpl","grf","icns","ico","iff","jng","jpeg","jpg","jfif","jp2","jps","lbm","max","miff","mng","msp","nitf","ota","pbm","pc1","pc2","pc3","pcf","pcx","pdn","pgm","PI1","PI2","PI3","pict","pct","pnm","pns","ppm","psb","psd","pdd","psp","px","pxm","pxr","qfx","raw","rle","sct","sgi","rgb","int","bw","tga","tiff","tif","vtf","xbm","xcf","xpm","3dv","amf","ai","awg","cgm","cdr","cmx","dxf","e2d","egt","eps","fs","gbr","odg","svg","stl","vrml","x3d","sxd","v2d","vnd","wmf","emf","art","xar","png","webp","jxr","hdp","wdp","cur","ecw","iff","lbm","liff","nrrd","pam","pcx","pgf","sgi","rgb","rgba","bw","int","inta","sid","ras","sun","tga"]

const fs = require("fs");
const https = require('https');
const getSize = require('get-folder-size');
const imageThumbnail = require('image-thumbnail');

var imgDir = __dirname + "/public/img/";
var thumbDir =  __dirname + "/public/thumbnails/";
var watcherThumb = chokidar.watch(thumbDir, {ignored: /^\./, persistent: true});
var cpUpload = upload.fields([{ name: 'img', maxCount: 100 }])

function endsWithAny(suffixes, string) {
    return suffixes.some(function (suffix) {
        return string.endsWith(suffix);
    });
}

function getimgsize() {
    getSize(imgDir, (err, size) => {
        if (err) {
            throw err;
        }

        size = (size / 1024 / 1024).toFixed(2);

        if (global_socket) {
            global_socket.emit("imgsize", size);
        }
    });
}

function generate_thumb(filepath, fileorurl) {
    if (fileorurl != "file") {
        var thumbpath = thumbDir + filepath.split("/").pop();
    } else {
        var thumbpath = thumbDir + path.basename(filepath);
    }

    if (fileorurl != "file") {
        if (!filepath.startsWith("http")) {
            filepath = "https://" + filepath;
        }

        filepath = {
            uri: filepath.toString()
        }
    }

    if(endsWithAny(ext, filepath)){
	    imageThumbnail(filepath, { width: 400 }).then(thumbnail => {
	        fs.writeFile(thumbpath, thumbnail, function(err) {
	            if (err) {
	                return console.log(err);
	            }

	            console.log("generated", thumbpath);
	        }); 
	    }).catch(err => console.error(err));
    }

    
}

function delete_thumb(filepath) {
    var base = path.basename(filepath).replace(/\.[^/.]+$/, "");
    var ext = path.extname(path.basename(filepath));
    fs.unlinkSync(thumbDir + base + "_thumb" + ext);
}

function update_client(filepath) {
    if (global_socket) {
        var base = path.basename(filepath);
        global_socket.emit("update_client", base);
    }
}

function remove_client(filepath) {
    if (global_socket) {
        var base = path.basename(filepath);
        global_socket.emit('remove_client', base);
    }
}

function update_img(action, filepath) {
    if (action == "add") {
        generate_thumb(filepath, "file");
    } else if (action == "delete") {
        delete_thumb(filepath);
        remove_client(filepath);
    }

    getimgsize();
}

var filesglobal = [];

function read_files(dir) {
    return fs.readdirSync(dir, function(err, files) {
        files = files.map(function (fileName) {
            return {
                name: fileName,
                time: fs.statSync(dir + '/' + fileName).mtime.getTime()
            };
        }).sort(function (a, b) {
            return a.time - b.time;
        }).map(function (v) {
            return v.name;
        });

        return files;
    }); 
}

function thumb_list(socket) {
    files = read_files(thumbDir);
    socket.emit("thumb_list", files);
}

function clear_thumbs() {
    fs.readdir(thumbDir, function(err, files) {
        files.forEach(function(file) {
            fs.unlinkSync(thumbDir + file);
        });
    });
}

app.get("/*", function(req, res) {
    res.sendFile(__dirname + "/public/" + req.path.replace("%20", " "));
});


app.post('/add_image', cpUpload, function (req, res, next) {
    var original = req.files.img[0].originalname;
    var filename = req.files.img[0].filename;

    fs.rename("cache/" + filename, imgDir + original, function (err) {
        if (err) {
            throw err;
        }

        res.redirect("back");
    });
});

function endsWithAny(suffixes, string) {
    return suffixes.some(function (suffix) {
        return string.endsWith(suffix);
    });
}

io.on("connection", function(socket) {
    thumb_list(socket);
    global_socket = socket;
    getimgsize();

    socket.on("download_url", function(s) {
        if (endsWithAny([".jpg", ".jpeg", ".png"], s)) {
            generate_thumb(s, "url");
        }
    });
});


if (require.main === module) {
    var args = process.argv.slice(2);

	if(args[0]){
		imgDir = path.resolve(args[0])
	}
	var watcherImg = chokidar.watch(imgDir, {ignored: /^\./, persistent: true});

    http.listen(3000, function() {
        clear_thumbs();

        watcherImg
        .on("add", function(ipath) {
            update_img("add", ipath);
        })
        .on("change", function(ipath) {
            update_img("change", ipath);
        })
        .on("unlink", function(ipath) {
            update_img("delete", ipath);
        })

        watcherThumb
        .on("add", function(ipath) {
            update_client(ipath)
        })
        .on("change", function(ipath) {
            update_client(ipath)
        })
        .on("unlink", function(ipath) {
            update_client(ipath)
        })
    });
}