$(function() {
  function randomString(length) {
    var chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz'.split('');

    if (! length) {
        length = Math.floor(Math.random() * chars.length);
    }

    var str = '';
    for (var i = 0; i < length; i++) {
        str += chars[Math.floor(Math.random() * chars.length)];
    }
    return str;
  }

  var accessToken = randomString(20);
  $("#valid-access-token").text(accessToken);
  $("#request-access-token").val(accessToken);


  MockHttpServer.setAccessToken({
     host: "api.box.com", 
     key: "Authorization", 
     value: accessToken,
     errorResponse: {
       status: 401,
       template: { "errorCode": "PARTNER_AUTHENTICATION_FAILED" }
     }
  });

  var mockRequest = {
    url: "http://api.box.com/2.0/folders/cloudspokes/items",
    requireAccessToken: true
  };
  var mockResponse = {
    template: {
      "total_count": 24,
      "entries|2-2": [
          {
              "type": "folder",
              "id": "192429928",
              "sequence_id": "1",
              "etag": "1",
              "name|1-3": "@LETTER_UPPER@LOREM"
          }
      ],
      "offset": 0,
      "limit": 2,
      "order": [
          {
              "by": "type",
              "direction": "ASC"
          },
          {
              "by": "name",
              "direction": "ASC"
          }
      ]
    }
  };
  MockHttpServer.register(mockRequest, mockResponse);

  mockRequest = {
    url: "http://api.box.com/2.0/folders/cloudspokes",
    requireAccessToken: true
  };
  mockResponse = {
    template: {
      "type": "folder",
      "id": "11446498",
      "sequence_id": "1",
      "etag": "1",
      "name": "Pictures",
      "created_at": "2012-12-12T10:53:43-08:00",
      "modified_at": "2012-12-12T11:15:04-08:00",
      "description": "Some pictures I took",
      "size": 629644,
      "path_collection": {
          "total_count": 1,
          "entries": [
              {
                  "type": "folder",
                  "id": "0",
                  "sequence_id": null,
                  "etag": null,
                  "name": "All Files"
              }
          ]
      },
      "created_by": {
          "type": "user",
          "id": "17738362",
          "name": "sean rose",
          "login": "sean@box.com"
      },
      "modified_by": {
          "type": "user",
          "id": "17738362",
          "name": "sean rose",
          "login": "sean@box.com"
      },
      "owned_by": {
          "type": "user",
          "id": "17738362",
          "name": "sean rose",
          "login": "sean@box.com"
      },
      "shared_link": {
          "url": "https://www.box.com/s/vspke7y05sb214wjokpk",
          "download_url": "https://www.box.com/shared/static/vspke7y05sb214wjokpk",
          "vanity_url": null,
          "is_password_enabled": false,
          "unshared_at": null,
          "download_count": 0,
          "preview_count": 0,
          "access": "open",
          "permissions": {
              "can_download": true,
              "can_preview": true
          }
      },
      "folder_upload_email": {
          "access": "open",
          "email": "upload.Picture.k13sdz1@u.box.com"
      },
      "parent": {
          "type": "folder",
          "id": "0",
          "sequence_id": null,
          "etag": null,
          "name": "All Files"
      },
      "item_status": "active",
      "item_collection": {
          "total_count": 1,
          "entries": [
              {
                  "type": "file",
                  "id": "5000948880",
                  "sequence_id": "3",
                  "etag": "3",
                  "sha1": "134b65991ed521fcfe4724b7d814ab8ded5185dc",
                  "name": "tigers.jpeg"
              }
          ],
          "offset": 0,
          "limit": 100
      }
    }
  };
  MockHttpServer.register(mockRequest, mockResponse);

  MockHttpServer.on();

  $("form#mock-request").submit(function(event) {
    event.preventDefault();
    var endpoint = "http://api.box.com/2.0" + $("input[name='endpoint']:checked" ).data("endpoint");
    // console.log(endpoint)
    var request = {
      url: endpoint,
      headers: {
        "Authorization" : $("#request-access-token").val()
      }
    };

    $.ajax(request).success(function(data) {
      console.log(data)
      $("#output pre").html( JSON.stringify( data, null, 2 ) );
    }).error(function(xhr) {
      var text = xhr.responseText;
      if(xhr.getResponseHeader("content-type") === "application/json") {
        text = JSON.stringify( JSON.parse(text), null, 2 )
      }
      $("#output pre").html(text).css("color", "red");
    });
  })
});