var request = {
  method: "get",
  url: /https:\/\/api.box.com\/2.0\/folders\/\w+\/items/, 
  header: {
    Authorization: "Valid ACCESS_TOKEN" 
  }
};

// success response
var response = {
  status: 200,
  header: {ETag:"fb1567f361f1fb8ce8951a9bb80f496b"},
  template: {"name|1-3": "@LETTER_UPPER@LOREM "}
};

MockHttpServer.register(request, response);

// With Invalid access_token
request = {
  method: "get",
  url: /https:\/\/api.box.com\/2.0\/folders\/\w+\/items/, 
  header: {
    Authorization: "Invalid ACCESS_TOKEN" 
  }
};

// error response
response = {
  status: 200,
  header: {},
  template: {"errorCode": "PARTNER_AUTHENTICATION_FAILED"}
};

MockHttpServer.register(request, response);


// Without Authorization header
request = {
  method: "get",
  url: /https:\/\/api.box.com\/2.0\/folders\/\w+\/items/, 
  header: {
    Authorization: null
  }
};

// error response
response = {
  status: 200,
  header: {},
  template: {"errorCode": "PARTNER_AUTHENTICATION_FAILED"}
};

MockHttpServer.register(request, response);


request = {
  method: "post",
  url: "https://api.box.com/2.0/folders",
  header: {
    Authorization: "Bearer ACCESS_TOKEN" // if access_token is not present or invalid it will return error.
  },
  data: {
    name: /.+/ // if name is not present, it will return error.
  } 
};


// register mock requests and related responses.
MockHttpServer.register(request, response);


// turn on MockHttpServer
MockHttpServer.on();

// MockHttpServer will respond for the registered request.
$.ajax("https://api.box.com/2.0/folders/aaa/items", {
  headers: {Authorization: "Valid ACCESS_TOKEN"}
}).done(function(data) {
  console.log(data);
});

// MockHttpServer will respond with error message for the not-registered request.
$.ajax("https://api.box.com/2.0/files").done(function(data) {
  // data is error message.
  console.log(data);
});

// turn off MockHttpServer when you need real ajax call.
MockHttpServer.off();

// request will be sent to the box server.
$.ajax("https://api.box.com/2.0/files").done(function(data) {  
  console.log(data)
});




MockHttpServer.boxRegister(access_token, request, response);
// => regist valid case and invalid case for access_token

// MockHttpServer.boxApi(access_token).register