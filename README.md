## About mockHttpServer
[mockJSON](http://experiments.mennovanslooten.nl/2010/mockjson/) is great tool when mocking ajax request with jquery. It is easy to use, and provides very useful templates. But it is jquery plugin, which means it is impossible to use without jquery like angular.js. The main goal of this project is to create a general XHR mocking server having mockJSON's template feature.

mockHttpServer is begins with [Cloudspokes Challenge](http://www.cloudspokes.com/challenges/2333).

### Basic Flow
1. Register mockRequests/mockResponses to the mockHttpServer. 
2. Turn on MockHttpServer. Now all XHR requests are handled by mockHttpServer.
3. Send a XHR request. If a request matches to the one of registered mockRequest, server will respond with correspoding mockResponse. If not, server will respond with error(status 500).
4. Turn off MockHttpServer when you want to send a request to the real server.
5. Whenever you want to use MockHttpServer, just turn on the server.


## Usage

Include `mock_http_server.js` file inside of your HTML file's head. 

    <head>
      ...
      <script type="text/javascript" src="js/mock_http_server.js"></script>
      ...
    </head>

Please make sure `mock_http_server.js` file is located before any other javascript files. If not, it may not work. This is because `mock_http_server.js` uses the trick to replace XMLHttpRequest object. If any other liblary(for example angular.js), references XMLHttpRequest before `mock_http_server.js` and use it, mocking will not work.


### Simple Example

    var mockRequest = {
      url: "http://api.box.com/2.0/folders/abc/items"
    };
    var mockResponse = {
      template: {"name|1-3": "@LETTER_UPPER@LOREM"}
    };
    MockHttpServer.register(mockRequest, mockResponse);
    
    MockHttpServer.on
    // now all XHR requests are intercepted by MockHttpServer
    //
    MockHttpServer.off
    // now XHR requests are sent to the real server.


#### Advanced Example

    var mockRequest = {
      method: "POST",
      url: "http://api.box.com/2.0/folders/abc/items"
      headers: {
        "content-tag" : /application\/\w+/,
        "authorization" : null
      },
      data: {
        "name": "stars",
        "owner": /^james.*/,
        "directory": null
      }
    };
    var mockResponse = {
      status: 200,
      headers: {
        "ETag" : "23n423o8ufjwleijr32"
      }
      template: {"name|1-3": "@LETTER_UPPER@LOREM"},
      timeout: 59
    };
    MockHttpServer.register(mockRequest, mockResponse);

#### Box.com Exmaples
run `example.html` file.
it uses `js/example.js` file.

#### mockRequest
mockRequest is an endpoint registered to MockHttpServer. When XHR request comes in to the server, server finds if request is matched to registered mockRequest.

Possible options of mockRequest are `url`, `method`, `headers`, and `data`. Among them, only `url` is mandatory.

`url` : URL of the request. can be String or Reqular Expression. It includes query parts.

`method` : "GET", "POST", "PUT", "DELETE"

`headers` : HTTP headers of the request. The value of header can be String or Regular Expression. 

`data` : data of the request. The value of data can be String or Regular Expression.

`requireAccessToken` : see `Setting Access Token` section below.

### mockResponse
The mockResponse is about how to send a response by server when XHR request matches to mockRequest.

Possible options are `status`, `headers`, `template`, `templateName`, and `timeout`.

`status` : default is 200
`headers` : HTTP headers of the response. Sets 'content-tag' as `application/json`, because response type is always json.
`template` : Template to generate response data. Almost same as [mockJSON](http://experiments.mennovanslooten.nl/2010/mockjson/)
`templateName` : If template starts with array, it needs template name to specify the size of array. For example,

    mockResponse = {
      template: [ 
        {"name|1-3": "@LETTER_UPPER@LOREM "} 
      ],
      templateName: "books|3-3"
    }

It generates, 3 book objects.

`timeout` : The delay time of response. Server will delay before sending response. The default value is 10(ms).


### Registering/Deregistering mockRequest/mockResponse
MockHttpServer.register returns key of registered mockRequest. You can delete registered mockRequest by the returned key.

    key = MockHttpServer.register(mockRequest, mockResponse);
    MockHttpServer.deregister(key);


### Finding matching request.
How does the server find mathing mockRequest? The basic principle is finding the first one matching all options. 

If mockRequest has only a url, then all XHR requests statisfying the url is matched. It doesn't care about method or headers or data.

    var mockRequest = { url: "http://test.com/api" }

then,

    GET http://test.com/api => Matched
    POST http://test.com/api => Matched
    GET http://test.com/api with some header => Matched
    GET http://test.com/other_api => NOT Matched

If mockRequest has url and method, then XHR requests should have the same url and method to match. It doesn't care about headers or data.

    var request = {
      method: "post", 
      url: "http://test.com/api"
    }

then,

    POST http://test.com/api => Matched
    POST http://test.com/api with some header and data => Matched
    GET http://test.com/api => Not Matched
    POST http://test.com/other_api => Not Matched

If mockRequest has headers, server checks if XHR request satisfies the header of mockRequest in addition to the url. 

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

The value of header may be String, Regulare Expression or `null`. What does `null` mean? It means this header should not exist in the XHR request.

    var request = {
      url: "http://test.com/api", 
      header: { Auth: null }
    }

then,

    POST http://test.com/api with header {Auth: "12345"} => Not Matched because Auth header exist.
    POST http://test.com/api with header {} => Matched

data is treated same as headers.


### Setting Access Token
Box.net requires access token for some requests. It responses error when access token is invalid. It can be mocked like below.

    var request = {
      url: "http://api.box.com/2.0/folders/abc/items",
      header: {
        Authorization: "Valid ACCESS_TOKEN" 
      }
    };
    var response = {
      template: {"name|1-3": "@LETTER_UPPER@LOREM "}
    };
    MockHttpServer.register(request, response);
    request = {
      url: "http://api.box.com/2.0/folders/abc/items",
      header: {
        Authorization: "Invalid ACCESS_TOKEN" 
      }
    };
    // error response
    response = {
      template: {"errorCode": "PARTNER_AUTHENTICATION_FAILED"}
    };
    MockHttpServer.register(request, response);

However, it is very inefficient, because it needs 2 mockRequest for every url, and need to set Authorization header for every mockRequest. Instead, you can set access token for the api.box.com host like below

    MockHttpServer.setAccessToken({
       host: "api.box.net", 
       key: "Authorization", 
       value: "Valid Access Token",
       errorResponse: {
         status: 401,
         template: { "errorCode": "PARTNER_AUTHENTICATION_FAILED" }
       }
    });

And then, register mockRequest like below.

    var request = {
      url: "http://api.box.com/2.0/folders/abc/items",
      requireAccessToken: true
    };
    var response = {
      template: {"name|1-3": "@LETTER_UPPER@LOREM "}
    };
    MockHttpServer.register(request, response);

If requireAccessToken is set true, server will check access token for matched XHR request. If XHR request does not Authorization header, or access token is invalid, server will respond with errorResponse.

### Handling errors
If error occurs while processing request, it sends 500 error with an error reason. So, when you work with MockHttpServer, use error handling callback to check errors. For example with jquery,

    $(document).ajaxError(function(event, xhr) {
      if(xhr.status === 500) {
        alert(xhr.responseText);
      }
    });

#### Error Reasons
- Invalid JSON : 
    when request body is not a valid json.
- Access Token Not Registered :
    when mockRequest requires access token, but access token is not set to MockHttpServer.
- Not Registered :
    when request does not match to any registered mockRequest.

## Codes and Reference
All codes are in `js/mock_http_server.js` file.
It is consisted of 3 parts, MockHttpRequest, mockJson, and MockHttpServer.

#### MockHttpRequest
MockHttpRequest comes from [MockHttpRequest](https://github.com/philikon/MockHttpRequest). It mocks XMLHttpRequest.

#### mockJson
[mockJSON](http://experiments.mennovanslooten.nl/2010/mockjson/) is imported to manage response template.

#### MockHttpServer
MockHttpServer provides an interface to register mockRequest/mockResponse, set access token, and turn on/off the server. When the sever is on, it intercepts XHR requests, works as a fake server.


## Test
Tests were written using [jasmine](http://pivotal.github.io/jasmine/). To run spec, run `spec_runner.html` file with the browser.


Thank you.
