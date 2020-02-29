window.reset = function(e) {
    e.wrap('<form>').closest('form').get(0).reset();
    e.unwrap();
}

function onDragOver(event) {
 
    console.log('File(s) in drop zone');
 
    // Prevent default behavior
    event.preventDefault();
}
 
function onDrop(event) {
    console.log('File(s) dropped');
 
    // Prevent default behavior (Prevent file from being opened)
    event.preventDefault();
    //Way 1: Use DataTransferItemList interface to access the file(s), if it's defined
    if (event.dataTransfer.items) {
        console.log(event.dataTransfer.items)
        for (var i = 0; i < event.dataTransfer.items.length; i++) {
            // If dropped items aren't files, reject them
            if (event.dataTransfer.items[i].kind === 'file') {
                var file = event.dataTransfer.items[i].getAsFile();
                
                var data = new FormData();
                data.append("img", file);

                jQuery.ajax({
                    url: '/add_image',
                    data: data,
                    cache: false,
                    contentType: false,
                    processData: false,
                    method: 'POST',
                    type: 'POST'
                });

                event.preventDefault();
            }
        }
        if(event.dataTransfer.items[0].kind == "string"){
                var s = event.dataTransfer.getData("text/plain");
                console.log(s)
                socket.emit('download_url', s.split("?")[0]);
        }
    }
    //Way 2: Use DataTransfer interface to access the file(s), if DataTransferItemList
    //interface is undefined
    else {
        for (var i = 0; i < event.dataTransfer.files.length; i++) {
            console.log('... file[' + i + '].name = ' + event.dataTransfer.files[i].name);
    }
  }
}