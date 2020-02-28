window.reset = function(e) {
    e.wrap('<form>').closest('form').get(0).reset();
    e.unwrap();
}

$("#file").change(function() {
    $("#uploadForm").submit();
    reset($('#file'));
});

$("#uploadForm").submit( function( e ) {
    $.ajax( {
        url: '/add_image',
        type: 'POST',
        data: new FormData( this ),
        processData: false,
        contentType: false
    } );
    e.preventDefault();
})

document.body.addEventListener('dragenter', function(e) {
    $("#uploadForm").css("pointer-events", "all");
});

document.body.addEventListener('mouseover', function(e) {
    $("#uploadForm").css("pointer-events", "none");
});
