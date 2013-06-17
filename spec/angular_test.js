 
// PhoneListCtrl.$inject = ['$scope', '$http'];

describe("angular.js test", function() {
  beforeEach(function() {
    MockHttpServer.on();
  });

  afterEach(function() {
    MockHttpServer.off();
    MockHttpServer.clearMocked();
  });

  it("test", function() {
    var $injector = angular.injector([ 'ng' ]); 
    var $http = $injector.get("$http");
    $http.get('http://test.com/api/books.json').success(function(data) {
      console.log(data)
    });

  })

});

