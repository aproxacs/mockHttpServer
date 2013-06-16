describe("MockHttpServer", function() {
  var mockRequest = {url: "http://test.com/api"};
  var mockResponse = {status: 200, headers: {}, template: {}};
  var mockedKey = null;

  beforeEach(function() {
    mockedKey = MockHttpServer.register(mockRequest, mockResponse);
  });

  afterEach(function() {
    MockHttpServer.off();
    MockHttpServer.clearMocked();
  });

  describe("on", function() {
    it("changes XMLHttpRequest to MockHttpRequest", function() {
      MockHttpServer.on();
      var obj = new XMLHttpRequest();
      expect(obj instanceof MockHttpRequest).toEqual(true);
    });
  });

  describe("off", function() {
    it("changes XMLHttpRequest to original", function() {
      MockHttpServer.on();
      MockHttpServer.off();
      var obj = new XMLHttpRequest();
      expect(obj instanceof XMLHttpRequest).toEqual(true);
    });
  });

  describe("register", function() {
    it("returns a registered mockedKey", function() {
      var mocked = MockHttpServer.getMocked(mockedKey);

      expect(mocked).not.toBeNull();
    });

    it("adds mocked request and response to the mocked list", function() {
      var mocked = MockHttpServer.getMocked(mockedKey);

      expect(mocked.request).toEqual(mockRequest);
      expect(mocked.response).toEqual(mockResponse);
    });
  });

  describe("deregister", function() {

    it("deletes mock", function() {
      MockHttpServer.deregister(mockedKey);

      expect(MockHttpServer.getMocked(mockedKey)).toBeNull()
    })
  });
});
describe("jQuery test", function() {
  var mockRequest = null; 
  var mockResponse = null;
  var request = null;
  // var called = false;

  beforeEach(function() {
    mockResponse = {
      status: 200, 
      headers: {"Tag": "hello"}, 
      template: {"name|1-3": "@LETTER_UPPER@LOREM "}
    };

    MockHttpServer.on();
  });

  afterEach(function() {
    MockHttpServer.off();
    MockHttpServer.clearMocked();
  });

  function setJsonData(request, data) {
    request.data = JSON.stringify(data);
    request.contentType = "application/json";
  }

  function ajaxRequest(callbacks, timeout) {
    var called = false;
    runs(function() {
      if(callbacks.error) {
        $.ajax(request).error(function() {
          callbacks.error.apply(this, arguments);
          called = true;
        });
      }
      if(callbacks.success) {
        $.ajax(request).success(function() {
          callbacks.success.apply(this, arguments);
          called = true;
        });
      }
    });

    waitsFor(function() {
      return called;
    }, "Not received ajax response.", timeout || 100);
  }

  describe("when registered with a string url", function() {

    beforeEach(function() {
      mockRequest = {url: "http://test.com/api"};
      MockHttpServer.register(mockRequest, mockResponse);
      request = { url: "http://test.com/api" };
    });

    describe("when GET url is requested", function() {
      it("responds mocked response", function() {
        ajaxRequest({success: function(data, textStatus, jqXHR) {
          expect(jqXHR.status).toEqual(200);
          expect(jqXHR.getResponseHeader("Tag")).toEqual("hello");
          expect(data.name).toBeDefined();
        }});
      });

      it("responds mocked response when request has headers", function() {
        request.headers = { "AGENT": "12345" }
        ajaxRequest({success: function(data, textStatus, jqXHR) {
          expect(data.name).toBeDefined();
        }});
      });
    });

    describe("when POST url is requested", function() {
      beforeEach(function() {
        request.type = "POST";
      });
      it("responds mocked response", function() {
        ajaxRequest({success: function(data, textStatus, jqXHR) {
          expect(data.name).toBeDefined();
        }});
      });
      it("responds mocked response when request has data", function() {
        request.data = {agent: 12345};
        ajaxRequest({success: function(data, textStatus, jqXHR) {
          expect(data.name).toBeDefined();
        }});
      });

    });

    describe("when the not-registered url is requested", function() {
      beforeEach(function() {
        request.url = "http://test.com/api/not_registered";
      });
      it("responds error message", function() {
        ajaxRequest({error: function(xhr) {
          expect(xhr.responseText).toEqual("The url[GET http://test.com/api/not_registered] is not registered to mock server");
        }});
      });
    });
  }); // end of a string url

  describe("when registred with a regular expression url", function() {
    beforeEach(function() {
      mockRequest = {url: /http:\/\/test.com\/api\?.+/ };
      MockHttpServer.register(mockRequest, mockResponse);
      request = { url: "http://test.com/api" };
    });

    describe("when request url matches the pattern of mockRequest's url", function() {
      beforeEach(function() {
        request.url += "?name=james"
      });
      it("responds mocked response", function() {
        ajaxRequest({success: function(data, textStatus, jqXHR) {
          expect(data.name).toBeDefined();
        }});
      });
    });

    describe("when request url does not match the pattern of mockRequest's url", function() {
      beforeEach(function() {
        request.url += "/not_registered?name=james"
      });
      it("responds error message", function() {
        ajaxRequest({error: function(xhr) {
          expect(xhr.responseText).toEqual("The url[GET http://test.com/api/not_registered?name=james] is not registered to mock server");
        }});
      });
    });
  });

  describe("when registered with method and url", function() {
    beforeEach(function() {
      mockRequest = { method: "post", url: "http://test.com/api" };
      MockHttpServer.register(mockRequest, mockResponse);
      request = { type: "POST", url: "http://test.com/api" };
    });

    describe("when POST url is requested", function() {
      it("responds mocked response", function() {
        ajaxRequest({success: function(data, textStatus, jqXHR) {
          expect(data.name).toBeDefined();
        }});
      });
    });

    describe("when GET url is requested", function() {
      beforeEach(function() {
        request.type = "GET"
      });
      it("responds error message", function() {
        ajaxRequest({error: function(xhr) {
          expect(xhr.responseText).toEqual("The url[GET http://test.com/api] is not registered to mock server");
        }});
      });
    });
  }); // end of method and url

  describe("when registred with url and headers", function() {
    beforeEach(function() {
      mockRequest = { 
        url: "http://test.com/api",
        headers: { "Auth": "1234" }
      };
      MockHttpServer.register(mockRequest, mockResponse);
      request = { url: "http://test.com/api" };
    });

    describe("when requests with header ", function() {
      beforeEach(function() {
        request.headers = { auth: "1234" }
      });

      it("responds mocked response", function() {
        ajaxRequest({success: function(data, textStatus, jqXHR) {
          expect(data.name).toBeDefined();
        }});
      });

      it("responds mocked request regardless of additional headers", function() {
        request.headers["name"] = "angel";
        ajaxRequest({success: function(data, textStatus, jqXHR) {
          expect(data.name).toBeDefined();
        }});
      });
    });

    describe("when requests with different header value", function() {
      beforeEach(function() {
        request.headers = { auth: "3333" }
      });

      it("responds error message", function() {
        ajaxRequest({error: function(xhr) {
          expect(xhr.responseText).toEqual("The url[GET http://test.com/api] is not registered to mock server");
        }});
      });
    });

    describe("when requests without header value", function() {
      beforeEach(function() {
        request.headers = {}
      });

      it("responds error message", function() {
        ajaxRequest({error: function(xhr) {
          expect(xhr.responseText).toEqual("The url[GET http://test.com/api] is not registered to mock server");
        }});
      });
    });
  }); // end of url and headers

  describe("when registred with regular expression header", function() {
    beforeEach(function() {
      mockRequest = { 
        url: "http://test.com/api",
        headers: { "Auth": /\d+/ }
      };
      MockHttpServer.register(mockRequest, mockResponse);
      request = { url: "http://test.com/api" };
    });    

    describe("when request header is matched with pattern", function() {
      beforeEach(function() {
        request.headers = { auth: "12345" }
      });

      it("responds mocked response", function() {
        ajaxRequest({success: function(data, textStatus, jqXHR) {
          expect(data.name).toBeDefined();
        }});
      });
    });

    describe("when request header is not matched with pattern", function() {
      beforeEach(function() {
        request.headers = { auth: "WERKfweriuwERE" }
      });

      it("responds error message", function() {
        ajaxRequest({error: function(xhr) {
          expect(xhr.responseText).toEqual("The url[GET http://test.com/api] is not registered to mock server");
        }});
      });
    });
  }); // end of regular expression headers


  describe("when registered with url and data", function() {
    beforeEach(function() {
      mockRequest = { 
        url: "http://test.com/api",
        data: { name: "james" }
      };
      MockHttpServer.register(mockRequest, mockResponse);
      request = { type: "POST", url: "http://test.com/api" };
    });

    describe("when requests with data", function() {
      beforeEach(function() {
        setJsonData(request, {name: "james"});
      });

      it("responds mocked response", function() {
        ajaxRequest({success: function(data, textStatus, jqXHR) {
          expect(data.name).toBeDefined();
        }});
      });

      it("responds mocked request regardless of additional data", function() {
        setJsonData(request, {name: "james", height: 100});
        ajaxRequest({success: function(data, textStatus, jqXHR) {
          expect(data.name).toBeDefined();
        }});
      });
    });

    describe("when requests with different data value", function() {
      beforeEach(function() {
        setJsonData(request, {name: "invalid"});
      });

      it("responds error message", function() {
        ajaxRequest({error: function(xhr) {
          expect(xhr.responseText).toEqual("The url[POST http://test.com/api] is not registered to mock server");
        }});
      });
    });

    describe("when requests without data value", function() {
      beforeEach(function() {
        setJsonData(request, {height: 100});
      });

      it("responds error message", function() {
        ajaxRequest({error: function(xhr) {
          expect(xhr.responseText).toEqual("The url[POST http://test.com/api] is not registered to mock server");
        }});
      });
    });
  }); // end of url and data

  describe("when registred with regular expression data", function() {
    beforeEach(function() {
      mockRequest = { 
        url: /http:\/\/test.com\/api\??.*/,
        data: { height: /\d+/ }
      };
      MockHttpServer.register(mockRequest, mockResponse);
      request = { type: "POST", url: "http://test.com/api" };
    });    

    describe("when request data is matched with pattern", function() {
      beforeEach(function() {
        setJsonData(request, {height: "12345"});
      });

      it("responds mocked response", function() {
        ajaxRequest({success: function(data, textStatus, jqXHR) {
          expect(data.name).toBeDefined();
        }});
      });
    });

    describe("when request data is not matched with pattern", function() {
      beforeEach(function() {
        setJsonData(request, {height: "wer"});
      });

      it("responds error message", function() {
        ajaxRequest({error: function(xhr) {
          expect(xhr.responseText).toEqual("The url[POST http://test.com/api] is not registered to mock server");
        }});
      });
    });
  }); // end of regular expression headers


  describe("when requestText is not a json format", function() {
    beforeEach(function() {
      mockRequest = { 
        url: /http:\/\/test.com\/api\??.*/,
        data: { height: /\d+/ }
      };
      MockHttpServer.register(mockRequest, mockResponse);

      request = { type: "POST", url: "http://test.com/api" };
      request.data = "name=james";
      request.contentType = "application/json";
    });

    it("responds error", function() {
      ajaxRequest({error: function(xhr) {
        expect(xhr.responseText).toEqual("requestText[\"name=james\"] is not valid json");
      }});
    });
  });


  describe("when access token is required for mockRequest", function() {

    var mockAccessToken = null;

    beforeEach(function() {
      mockRequest = { 
        url: "http://test.com/api",
        requireAccessToken: true
      };
      mockAccessToken = {
        host: "test.com", 
        key: "Auth", 
        value: "Ar369",
        errorResponse: {
          status: 401,
          headers: {},
          template: { "error": "invalid_token" }
        }
      };
      request = { url: "http://test.com/api" };
    });

    afterEach(function() {
      MockHttpServer.clearAccessTokens();
    });

    describe("without accessToken setup", function() {
      beforeEach(function() {
        MockHttpServer.register(mockRequest, mockResponse);
      });

      it("responds error", function() {
        ajaxRequest({error: function(xhr) {
            expect(xhr.responseText).toEqual("accessToken for test.com is not registered yet.");
        }});
      });
    });

    describe("with accessToken setup", function() {
      beforeEach(function() {
        MockHttpServer.setAccessToken(mockAccessToken);
        MockHttpServer.register(mockRequest, mockResponse);
      });

      describe("for request without accessToken", function() {
        it("responds error", function() {
          $.ajax(request).error(function(jqXHR, textStatus) {
            expect(jqXHR.status).toEqual(401);
          }).done(function() {
            // should not come here
            expect(true).toEqual(false);            
          });
        });
      });

      describe("for request with invalid accessToken", function() {
        beforeEach(function() {
          request.headers = { "Auth": "Ar379" };
        });
        
        it("responds error", function() {
          $.ajax(request).error(function(jqXHR, textStatus) {
            expect(jqXHR.status).toEqual(401);
          }).done(function() {
            // should not come here
            expect(true).toEqual(false);            
          });

        });
      });

      describe("for request with valid accessToken in header", function() {
        beforeEach(function() {
          request.headers = { "Auth": "Ar369" };
        });

        it("responds mock response", function() {
          ajaxRequest({success: function(data, textStatus, jqXHR) {
            expect(jqXHR.status).toEqual(200);
            expect(data.name).toBeDefined();
          }});
        });
      });

      describe("for request with valid accessToken in data", function() {
        beforeEach(function() {
          request.type = "POST";
          request.data = { "Auth": "Ar369" };
        });

        it("responds mock response", function() {
          ajaxRequest({success: function(data, textStatus, jqXHR) {
            expect(jqXHR.status).toEqual(200);
            expect(data.name).toBeDefined();
          }});
        });
      });
    });
  });  
});
