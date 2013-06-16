## Idea
basic flow is like below.
1. Register requests and responses. Request has 4 parts.(method, url, headers, data) Only url is mandatory, and others are optional. Respond has 2 parts, headers and template. The template is the same as mockJSON.
2. Turn on MockHttpServer. Now all ajax request is handled by MockHttpServer server.
3. Send an ajax request. If a sending request matches to one of registered, server will respond with registered headers and template. If not, server will respond with error message.
4. Turn off MockHttpServer when you want to send a request to a real server.
5. Whenever you want to use MockHttpServer, just turn on the server.

### Finding matching request.
If registered mock request only has url, then all requests with the url is matched. Url can be string or regular expression.

    var request = {url: "http://test.com/api"}

then,

    GET http://test.com/api => Matched
    POST http://test.com/api => Matched
    GET http://test.com/api with some header => Matched
    GET http://test.com/other_api => NOT Matched

If registered mock request has url and method, matching request should has the same method, url.

    var request = {method: "post", url: "http://test.com/api"}

then,

    POST http://test.com/api => Matched
    POST http://test.com/api with some header and data => Matched
    GET http://test.com/api => Not Matched
    POST http://test.com/other_api => Not Matched

If registered mock request has url and headers, matching request should include specified headers. It is ok for request to have more headers. The value of header may be String or Regulare Expression.

    var request = {
      url: "http://test.com/api", 
      header: { Auth: "12345" }
    }

then,

    POST http://test.com/api with header {Auth: "12345"} => Matched
    GET http://test.com/api with header {Auth: "12345"} => Matched
    POST http://test.com/api with header {Auth: "12345", Tag: "some value"} => Matched
    POST http://test.com/api with header {Auth: "222"} => Not Matched
    POST http://test.com/api with header {} => Not Matched

The value of header may be null, which means matching request should not have the header.

    var request = {
      url: "http://test.com/api", 
      header: { Auth: null }
    }

then,

    POST http://test.com/api with header {Auth: "12345"} => Not Matched
    POST http://test.com/api with header {Tag: "value"} => Matched

If registered mock request has url and data, data is treated same as headers.




## Usage
- Simple Usage
- regular expression
- caution : order matters
- content-type : json, or url-encoded

1 Registering

    var request = {
      method: "get",
      url: /https:\/\/api.box.com\/2.0\/folders\/\w+\/items/, 
      header: {
        Authorization: "Valid ACCESS_TOKEN" 
      }
    };
    var response = {
      status: 200,
      header: {ETag:"fb1567f361f1fb8ce8951a9bb80f496b"},
      template: {"name|1-3": "@LETTER_UPPER@LOREM "}
    };
    MockHttpServer.register(request, response);

2 Turning on the mock server.
  
    MockHttpServer.on();

3 Ajax request.

    $.ajax("https://api.box.com/2.0/folders/aaa/items", {
      headers: {Authorization: "Valid ACCESS_TOKEN"}
    }).done(function(data) {
      console.log(data);
    });

4 Turning off ther mock server.

    MockHttpServer.off();

more examples are in `js/example.js` file.



## Codes and Reference
All codes are in `js/mock_http_server.js` file.
It is consisted of 3 parts, MockHttpRequest, mockJson, and MockHttpServer.

#### MockHttpRequest
MockHttpRequest comes from https://github.com/philikon/MockHttpRequest. Sinon is nice but seems too complicate to import.

#### mockJson
mockJSON is imported to manage response template.

#### MockHttpServer
MockHttpServer is the mock server, similar to sinon.js FakeServer. It provides an interface to register mock request and respnse, and turn on/off the server. And if a mathed request comes, it responds appropriate headers and template.


## Test
Tests were written using jasmine.(http://pivotal.github.io/jasmine/)
To run spec, run `spec_runner.html` file with the browser.




## TODO
- test with angular, backbone. : 2h


- documentation : 2h
- box.net examples : 1h




Please review my codes and let me know if I am going right.

Thank you.
