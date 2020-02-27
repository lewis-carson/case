// variables
var socket = io();
var loaded = false;


// functions
function chunkify(a, n, balanced) {
    if (n < 2)
        return [a];

    var len = a.length,
    out = [],
    i = 0,
    size;

    if (len % n === 0) {
        size = Math.floor(len / n);
        while (i < len) {
            out.push(a.slice(i, i += size));
        }
    }

    else if (balanced) {
        while (i < len) {
            size = Math.ceil((len - i) / n--);
            out.push(a.slice(i, i += size));
        }
    }

    else {
        n--;
        size = Math.floor(len / n);
        if (len % size === 0)
            size--;
        while (i < size * n) {
            out.push(a.slice(i, i += size));
        }
        out.push(a.slice(size * n));

    }

    return out;
}


// exec
socket.on("thumb_list", function(msg){
    if(loaded == false){
        var cols = chunkify(msg, 4, true)
        for(var col in cols){
            if (!$("#" + col).length){
                $(".columns").prepend($("<div>", {class: "column", id: col}));
            }
            for(var img in cols[col]){
                if(cols[col][img] != undefined){
                    $("#" + col).prepend($("<img>", {src: "thumbnails/" + cols[col][img]}));
                }
            }
        }
        loaded = true;
    }
});

socket.on("remove_client", function(file){
    $('body').find('img[src$="/' + file + '"]').remove()
})

col = 0;
socket.on("update_client", function(file){
    $("#" + col).prepend($("<img>", {src: "thumbnails/" + file}));
    col ++;
    if(col == 4){col = 1}
})

window.reset = function(e) {
    e.wrap('<form>').closest('form').get(0).reset();
    e.unwrap();
}

$("input").change(function() {
    $("form").submit();
    reset($('#file'))
});