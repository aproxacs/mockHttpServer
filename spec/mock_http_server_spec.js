describe("MockHttpServer", function() {
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
    var request = {url: "http://test.com/api"};
    var response = {status: 200, header: {}, template: {}};

    afterEach(function() {
      MockHttpServer.clearMocked();
    });

    it("returns a registered key", function() {
      var key = MockHttpServer.register(request, response);
      var mocked = MockHttpServer.getMocked();

      expect(mocked[key]).toBeDefined();
    });

    it("adds request and response to the mocked list", function() {
      var key = MockHttpServer.register(request, response);
      var mocked = MockHttpServer.getMocked();

      expect(mocked[key].request).toEqual(request);
      expect(mocked[key].response).toEqual(response);
    });
  });

  describe("deregister", function() {
    var request = {url: "http://test.com/api"};
    var response = {status: 200, header: {}, template: {}};

    afterEach(function() {
      MockHttpServer.clearMocked();
    });

    it("deletes mock", function() {
      var key = MockHttpServer.register(request, response);
      MockHttpServer.deregister(key);

      expect(MockHttpServer.getMocked()).toEqual({});      
    })
  });
});


describe("mocked ajax request test", function() {
  var request = {url: "http://test.com/api"};
  var response = {status: 200, header: {}, template: {"name|1-3": "@LETTER_UPPER@LOREM "}};
    
  beforeEach(function() {
    MockHttpServer.on();
    MockHttpServer.register(request, response);
  });

  afterEach(function() {
    MockHttpServer.off();
    MockHttpServer.clearMocked();
  });

  it("responds mocked response for the registered request", function() {
    $.ajax("http://test.com/api").done(function(data) {
      expect(data.name).toBeDefined();
    });
  });

  it("responds error message for the not-registered request", function() {
    $.ajax("http://test.com/api/not_registered").done(function(data) {
      expect(data).toEqual("The url[http://test.com/api/not_registered] is not registered to mock server");
    });
  });

});

