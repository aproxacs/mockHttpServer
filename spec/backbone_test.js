describe("backbone.js test", function() {
  var mockRequest = null; 
  var mockResponse = null;

  beforeEach(function() {
    MockHttpServer.on();
  });

  afterEach(function() {
    MockHttpServer.off();
    MockHttpServer.clearMocked();
  });

  var Book = Backbone.Model.extend({urlRoot : 'http://test.com/api/books'});
  var Books = Backbone.Collection.extend({
    model: Book,
    url: "http://test.com/api/books"
  });


  describe("Get model", function() {

    beforeEach(function() {
      mockRequest = {url: "http://test.com/api/books/1111"};
      mockResponse = {
        status: 200, 
        headers: {"content-type": "application/json"},
        template: {"id": "1111", "name|1-3": "@LETTER_UPPER@LOREM "},
        timeout: 10
      };

      MockHttpServer.register(mockRequest, mockResponse);
    });

    it("success", function() {
      var book = new Book({id:"1111"});
      var changed = false;

      runs(function() {
        book.fetch();
        book.bind("change", function() {
          changed = true;
        })
      });

      waitsFor(function() {
        return changed;
      }, "Not received data from server", 200);
    });

  });  

  describe("Get Collections", function() {

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
      var books = new Books();
      var addCount = 0;
      runs(function() {
        books.fetch()
        books.on("add", function(book) {
          addCount += 1;
        });
      });

      waitsFor(function() {
        return addCount == 3;
      }, 200);
    });

  });
});
