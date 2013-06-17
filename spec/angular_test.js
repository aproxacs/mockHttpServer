
describe("angular.js test", function() {
  beforeEach(function() {
    MockHttpServer.on();
  });

  afterEach(function() {
    MockHttpServer.off();
    MockHttpServer.clearMocked();
  });


  describe("http request", function() {
    beforeEach(function() {
      mockRequest = {url: "http://test.com/api/books"};
      mockResponse = {
        status: 200, 
        headers: {"content-type": "application/json"},
        template: [ 
          {"name|1-3": "@LETTER_UPPER@LOREM "} 
        ],
        templateName: "books|3-3"
      };

      MockHttpServer.register(mockRequest, mockResponse);
    });

    it("success", function() {
      var $injector = angular.injector([ 'ng' ]); 
      var $http = $injector.get("$http");
      var called = false;
      runs(function() {
        $http.get('http://test.com/api/books').success(function(data) {
          called = true;
          expect(data.length).toEqual(3);
        });
      });

      waitsFor(function() {
        return called;
      }, 200);
    });
  });
});

