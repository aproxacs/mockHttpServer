MockHttpServer = function(global) {
    var mocked = {};
    var accessTokens = {};
    var xhr = null;
    var isOn = false;

    initialize(global);

    function initialize(global) {
        var globalXMLHttpRequest = global.XMLHttpRequest;
        var globalActiveXObject = global.ActiveXObject;
        var supportsActiveX = typeof globalActiveXObject != "undefined";
        var supportsXHR = typeof globalXMLHttpRequest != "undefined";

        var Request = function() {
            this.onsend = function () {
                mockRespond(this);
            };
            MockHttpRequest.apply(this, arguments);
        }

        if( supportsXHR ) {
            global.XMLHttpRequest = function() {
                if(isOn) {
                    Request.prototype = MockHttpRequest.prototype;
                    return new Request();
                }        
                else {
                    return new globalXMLHttpRequest();
                }
            };
        }
        if( supportsActiveX ) {
            global.ActiveXObject = function() {
                if(isOn) {
                    Request.prototype = MockHttpRequest.prototype;
                    return new Request();
                }        
                else {
                  try { return new globalActiveXObject("Msxml2.XMLHTTP.6.0"); } catch (e1) {}
                  try { return new globalActiveXObject("Msxml2.XMLHTTP.3.0"); } catch (e2) {}
                  try { return new globalActiveXObject("Msxml2.XMLHTTP"); } catch (e3) {}
                  throw new Error("This browser does not support XMLHttpRequest.");
                }
            };
        }    
    }



    function mockRespond(mockXhr) {

        xhr = mockXhr;
        console.log(xhr)
        try {
            parseRequestText();

            var mock = getFirstMatchedMock();
            if(!mock) { throw "Not Registered"; }
            // console.log(mock);

            if( mock.request.requireAccessToken ) {
                processAccessToken();
            }
            sendMockResponse(mock.response);

        }
        catch(err) {
            // console.log(err)
            handleError(err);
        }
    }

    function handleError(err) {
        var errorMsg = null;
        if(err === "Invalid JSON") {
            errorMsg = "requestText[\"" + xhr.requestText + "\"] is not valid json";
        }
        if(err === "Invalid Access Token") {
            var accessToken = getAccessToken(xhr.urlParts.host);
            return sendMockResponse(accessToken.errorResponse);
        }
        if(err === "Access Token Not Registered") {
            errorMsg = "accessToken for " + xhr.urlParts.host + " is not registered yet.";        
        }
        if(err === "Not Registered") {
            errorMsg = "The url[" + xhr.method + " " + xhr.url + "] is not registered to mock server";
        }

        // console.log(msg)
        xhr.receive(500, errorMsg);
    }

    function sendMockResponse(response) {
        var mockXhr = xhr;
        console.log(response)
        // use timeout to give some delay like a real server.
        setTimeout(function() {
            var headers = response.headers || {};
            headers["content-type"] = "application/json";
            setHeaders(headers);

            var data = mockJson.generateTemplate(response.template, response.templateName);
            data = JSON.stringify(data);        
            // console.log(data)
            mockXhr.receive(response.status || 200, data);
        }, response.timeout || 10);
    }


    function processAccessToken() {
        var accessToken = getAccessToken(xhr.urlParts.host);
        // console.log(accessToken)
        if( accessToken ) {
            if( isInvalidAccessToken(accessToken) ) {
                throw "Invalid Access Token";
            }
        }
        else {
            throw "Access Token Not Registered";
        }
    }

    function getAccessToken(host) {
        return accessTokens[host];
    }

    function isInvalidAccessToken(accessToken) {
        var token = xhr.getRequestHeader(accessToken.key);
        // console.log(token);
        if(!token && xhr.requestData) {
            token = xhr.requestData[accessToken.key];
        }
        return token !== accessToken.value;
    }

    function getFirstMatchedMock() {
        for( key in mocked ) {
            var mock = mocked[key];

            if( isRequestMatched(mock.request) ) {
                return mock;
            }
        }
        return null;
    }

    function parseRequestText() {
        xhr.requestData = null;

        if(!xhr.requestText) { return null; }
        
        var mimetype = xhr.getRequestHeader("content-type");
        mimetype = mimetype && mimetype.split(';', 1)[0];
        // console.log(mimetype);

        if(mimetype === "application/json") {
            xhr.requestData = parseJson(xhr.requestText);
        }
        if(mimetype === "application/x-www-form-urlencoded") {
            xhr.requestData = parseUrlEncoded(xhr.requestText);
        }
    }

    function parseJson(text) {
        try {
            return JSON.parse(text);
        }
        catch(err) {
            throw "Invalid JSON"
        }
    }

    // TODO : it does not parse nested elements
    function parseUrlEncoded(text) {
        var parser = /(?:^|&)([^&=]*)=?([^&]*)/g;
        var data = {};

        try {
            text.replace(parser, function ($0, $1, $2) {
                if ($1) data[$1] = $2;
            });
            return data;
        }
        catch(err) {
            throw "Invalid URL Encoded"
        }
    }

    function isRequestMatched(mockRequest) {
        // console.log(isMethodMatched(xhr, mockRequest))
        // console.log(isUrlMatched(xhr, mockRequest))
        // console.log(isHeaderMatched(xhr, mockRequest))
        // console.log(isDataMatched(xhr, mockRequest))
        try {
            return isMethodMatched(mockRequest) && 
                   isUrlMatched(mockRequest) &&
                   isHeaderMatched(mockRequest) &&
                   isDataMatched(mockRequest);
        }
        catch(err) {
            // console.log(err)
            return false;            
        }
    }

    function isMethodMatched(mockRequest) {
        if( !mockRequest.method ) { return true; }
        return xhr.method.toLowerCase() === mockRequest.method.toLowerCase()
    }

    function isUrlMatched(mockRequest) {
        // console.log(mockRequest.url)
        // console.log(xhr.url)
        return isTextMatched(mockRequest.url, xhr.url);
    }

    function isHeaderMatched(mockRequest) {
        return isObjectMatched(mockRequest.headers, xhr.requestHeaders);
    }

    function isDataMatched(mockRequest) {
        // console.log(mockRequest.data)
        // console.log(xhr.requestData)
        return isObjectMatched(mockRequest.data, xhr.requestData || {});
    }

    // left comes from mockRequest, it may be a string or regular expression.
    // right comes from xhr(real request), it must be a string.
    function isTextMatched(left, right) {
        if(right === undefined || right === null) { return false; }

        if(typeof left === "string") {
            return (left === right);
        }
        else {
            // assume right is regular expression
            return left.test(right)
        }
    }

    // left comes from mockRequest
    // right comes from xhr
    function isObjectMatched(left, right) {
        for( key in left ) {
            var value = left[key];

            // if value is set to null, it means this value must not be present in right.
            // for example,
            // 
            // left = { 
            //   auth: null
            // }
            // right = {
            // }
            // then, it returns true, because right does not have Auth. 
            // Otherwise, if right has auth, it returns false.
            if ( value === null ) {
                if( right[key] ) {
                    return false;
                }
            }
            else {
                if( !isTextMatched(value, right[key]) ) {
                    return false;
                }
            }
        }

        return true;
    }

    function setHeaders(headers) {
        // console.log(headers)
        for( key in headers ) {
            xhr.setResponseHeader(key, headers[key]);    
        }
    }

    function downcaseKeys(obj) {
        if(!obj) { return; }

        for(key in obj) {
            value = obj[key];
            delete obj[key];
            obj[key.toLowerCase()] = value;
        }
    }


    return {
        // Usage :
        // MockHttpServer.setAccessToken({
        //    host: "box.net", 
        //    key: "Authorization", 
        //    value: "aa",
        //    errorResponse: {
        //      status: 401,
        //      headers: {},
        //      template: { "error": "invalid_token" }
        //    }
        // })
        setAccessToken: function(options) {
            accessTokens[options.host] = options;
        },
        clearAccessTokens: function() {
            accessTokens = {};
        },

        register: function(request, response) {
            var key = Math.random().toString(36);

            downcaseKeys(request.headers);
            downcaseKeys(response.headers);

            mocked[key] = {
                request: request,
                response: response
            }

            return key;
        },

        deregister: function(key) {
            delete mocked[key];
        },

        getMocked: function(key) {
            return mocked[key] || null;
        },

        clearMocked: function() {
            mocked = {};
        },

        on: function() {
            isOn = true;
        },

        off: function() {
            isOn = false;
        }
    }
  

}(this);





/*
 * Mock XMLHttpRequest (see http://www.w3.org/TR/XMLHttpRequest)
 *
 * Written by Philipp von Weitershausen <philipp@weitershausen.de>
 * Released under the MIT license.
 * http://www.opensource.org/licenses/mit-license.php
 *
 * For test interaction it exposes the following attributes:
 *
 * - method, url, urlParts, async, user, password
 * - requestText
 *
 * as well as the following methods:
 *
 * - getRequestHeader(header)
 * - setResponseHeader(header, value)
 * - receive(status, data)
 * - err(exception)
 *
 */
function MockHttpRequest () {
    // These are internal flags and data structures
    this.error = false;
    this.sent = false;
    this.requestHeaders = {};
    this.responseHeaders = {};
}
MockHttpRequest.prototype = {

    statusReasons: {
        100: 'Continue',
        101: 'Switching Protocols',
        102: 'Processing',
        200: 'OK',
        201: 'Created',
        202: 'Accepted',
        203: 'Non-Authoritative Information',
        204: 'No Content',
        205: 'Reset Content',
        206: 'Partial Content',
        207: 'Multi-Status',
        300: 'Multiple Choices',
        301: 'Moved Permanently',
        302: 'Moved Temporarily',
        303: 'See Other',
        304: 'Not Modified',
        305: 'Use Proxy',
        307: 'Temporary Redirect',
        400: 'Bad Request',
        401: 'Unauthorized',
        402: 'Payment Required',
        403: 'Forbidden',
        404: 'Not Found',
        405: 'Method Not Allowed',
        406: 'Not Acceptable',
        407: 'Proxy Authentication Required',
        408: 'Request Time-out',
        409: 'Conflict',
        410: 'Gone',
        411: 'Length Required',
        412: 'Precondition Failed',
        413: 'Request Entity Too Large',
        414: 'Request-URI Too Large',
        415: 'Unsupported Media Type',
        416: 'Requested range not satisfiable',
        417: 'Expectation Failed',
        422: 'Unprocessable Entity',
        423: 'Locked',
        424: 'Failed Dependency',
        500: 'Internal Server Error',
        501: 'Not Implemented',
        502: 'Bad Gateway',
        503: 'Service Unavailable',
        504: 'Gateway Time-out',
        505: 'HTTP Version not supported',
        507: 'Insufficient Storage'
    },

    /*** State ***/

    UNSENT: 0,
    OPENED: 1,
    HEADERS_RECEIVED: 2,
    LOADING: 3,
    DONE: 4,
    readyState: 0,


    /*** Request ***/

    open: function (method, url, async, user, password) {
        if (typeof method !== "string") {
            throw "INVALID_METHOD";
        }
        switch (method.toUpperCase()) {
        case "CONNECT":
        case "TRACE":
        case "TRACK":
            throw "SECURITY_ERR";

        case "DELETE":
        case "GET":
        case "HEAD":
        case "OPTIONS":
        case "POST":
        case "PUT":
            method = method.toUpperCase();
        }
        this.method = method;

        if (typeof url !== "string") {
            throw "INVALID_URL";
        }
        this.url = url;
        this.urlParts = this.parseUri(url);

        if (async === undefined) {
            async = true;
        }
        this.async = async;
        this.user = user;
        this.password = password;

        this.readyState = this.OPENED;
        this.onreadystatechange();
    },

    setRequestHeader: function (header, value) {
        header = header.toLowerCase();

        switch (header) {
        case "accept-charset":
        case "accept-encoding":
        case "connection":
        case "content-length":
        case "cookie":
        case "cookie2":
        case "content-transfer-encoding":
        case "date":
        case "expect":
        case "host":
        case "keep-alive":
        case "referer":
        case "te":
        case "trailer":
        case "transfer-encoding":
        case "upgrade":
        case "user-agent":
        case "via":
            return;
        }
        if ((header.substr(0, 6) === "proxy-")
            || (header.substr(0, 4) === "sec-")) {
            return;
        }

        // it's the first call on this header field
        if (this.requestHeaders[header] === undefined)
          this.requestHeaders[header] = value;
        else {
          var prev = this.requestHeaders[header];
          this.requestHeaders[header] = prev + ", " + value;
        }

    },

    send: function (data) {
        if ((this.readyState !== this.OPENED)
            || this.sent) {
            throw "INVALID_STATE_ERR";
        }
        if ((this.method === "GET") || (this.method === "HEAD")) {
            data = null;
        }

        //TODO set Content-Type header?
        this.error = false;
        this.sent = true;
        this.onreadystatechange();

        // fake send
        this.requestText = data;
        this.onsend();
    },

    abort: function () {
        this.responseText = null;
        this.error = true;
        for (var header in this.requestHeaders) {
            delete this.requestHeaders[header];
        }
        delete this.requestText;
        this.onreadystatechange();
        this.onabort();
        this.readyState = this.UNSENT;
    },


    /*** Response ***/

    status: 0,
    statusText: "",

    getResponseHeader: function (header) {
        if ((this.readyState === this.UNSENT)
            || (this.readyState === this.OPENED)
            || this.error) {
            return null;
        }
        return this.responseHeaders[header.toLowerCase()];
    },

    getAllResponseHeaders: function () {
        var r = "";
        for (var header in this.responseHeaders) {
            if ((header === "set-cookie") || (header === "set-cookie2")) {
                continue;
            }
            //TODO title case header
            r += header + ": " + this.responseHeaders[header] + "\r\n";
        }
        return r;
    },

    responseText: "",
    responseXML: undefined, //TODO


    /*** See http://www.w3.org/TR/progress-events/ ***/

    onload: function () {
        // Instances should override this.
    },

    onprogress: function () {
        // Instances should override this.
    },

    onerror: function () {
        // Instances should override this.
    },

    onabort: function () {
        // Instances should override this.
    },

    onreadystatechange: function () {
        // Instances should override this.
    },


    /*** Properties and methods for test interaction ***/

    onsend: function () {
        // Instances should override this.
    },

    getRequestHeader: function (header) {
        return this.requestHeaders[header.toLowerCase()];
    },

    setResponseHeader: function (header, value) {
        this.responseHeaders[header.toLowerCase()] = value;
    },

    makeXMLResponse: function (data) {
        var xmlDoc;
        // according to specs from point 3.7.5:
        // "1. If the response entity body is null terminate these steps
        //     and return null.
        //  2. If final MIME type is not null, text/xml, application/xml,
        //     and does not end in +xml terminate these steps and return null.
        var mimetype = this.getResponseHeader("Content-Type");
        mimetype = mimetype && mimetype.split(';', 1)[0];
        if ((mimetype == null) || (mimetype == 'text/xml') ||
           (mimetype == 'application/xml') ||
           (mimetype && mimetype.substring(mimetype.length - 4) == '+xml')) {
            // Attempt to produce an xml response
            // and it will fail if not a good xml
            try {
                if (window.DOMParser) {
                    var parser = new DOMParser();
                    xmlDoc = parser.parseFromString(data, "text/xml");
                } else { // Internet Explorer
                    xmlDoc = new ActiveXObject("Microsoft.XMLDOM");
                    xmlDoc.async = "false";
                    xmlDoc.loadXML(data);
                }
            } catch (e) {
                // according to specs from point 3.7.5:
                // "3. Let document be a cookie-free Document object that
                // represents the result of parsing the response entity body
                // into a document tree following the rules from the XML
                //  specifications. If this fails (unsupported character
                // encoding, namespace well-formedness error etc.), terminate
                // these steps return null."
                xmlDoc = null;
            }
            // parse errors also yield a null.
            if ((xmlDoc && xmlDoc.parseError && xmlDoc.parseError.errorCode != 0)
                || (xmlDoc && xmlDoc.documentElement && xmlDoc.documentElement.nodeName == "parsererror")
                || (xmlDoc && xmlDoc.documentElement && xmlDoc.documentElement.nodeName == "html"
                    &&  xmlDoc.documentElement.firstChild &&  xmlDoc.documentElement.firstChild.nodeName == "body"
                    &&  xmlDoc.documentElement.firstChild.firstChild && xmlDoc.documentElement.firstChild.firstChild.nodeName == "parsererror")) {
                xmlDoc = null;
            }
        } else {
            // mimetype is specified, but not xml-ish
            xmlDoc = null;
        }
        return xmlDoc;
    },

    // Call this to simulate a server response
    receive: function (status, data) {
        if ((this.readyState !== this.OPENED) || (!this.sent)) {
            // Can't respond to unopened request.
            throw "INVALID_STATE_ERR";
        }

        this.status = status;
        this.statusText = status + " " + this.statusReasons[status];
        this.readyState = this.HEADERS_RECEIVED;
        this.onprogress();
        this.onreadystatechange();

        this.responseText = data;
        this.responseXML = this.makeXMLResponse(data);

        this.readyState = this.LOADING;
        this.onprogress();
        this.onreadystatechange();

        this.readyState = this.DONE;
        this.onreadystatechange();
        this.onprogress();
        this.onload();
    },

    // Call this to simulate a request error (e.g. NETWORK_ERR)
    err: function (exception) {
        if ((this.readyState !== this.OPENED) || (!this.sent)) {
            // Can't respond to unopened request.
            throw "INVALID_STATE_ERR";
        }

        this.responseText = null;
        this.error = true;
        for (var header in this.requestHeaders) {
            delete this.requestHeaders[header];
        }
        this.readyState = this.DONE;
        if (!this.async) {
            throw exception;
        }
        this.onreadystatechange();
        this.onerror();
    },

    // Parse RFC 3986 compliant URIs.
    // Based on parseUri by Steven Levithan <stevenlevithan.com>
    // See http://blog.stevenlevithan.com/archives/parseuri
    parseUri: function (str) {
        var pattern = /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/;
        var key = ["source", "protocol", "authority", "userInfo", "user",
                   "password", "host", "port", "relative", "path",
                   "directory", "file", "query", "anchor"];
        var querypattern = /(?:^|&)([^&=]*)=?([^&]*)/g;

        var match = pattern.exec(str);
        var uri = {};
        var i = 14;
        while (i--) {
            uri[key[i]] = match[i] || "";
        }

        uri.queryKey = {};
        uri[key[12]].replace(querypattern, function ($0, $1, $2) {
            if ($1) {
                uri.queryKey[$1] = $2;
            }
        });

        return uri;
    }
};


//
// mockJson comes from mockJSON(http://experiments.mennovanslooten.nl/2010/mockjson/)
// 
// I wanted to use only template part without jQuery dependancy.
// 
// - removed jQuery part.
// - removed rand() function. rand() is replaced with Math.random()
//
var mockJson = function() {

    function getRandomData(key) {
        key = key.substr(1); // remove "@"
        
        //var params = key.match(/\(((\d+),?)+\)/g) || [];
        var params = key.match(/\(([^\)]+)\)/g) || [];
        
        if (!(key in mockJson.data)) {
            return key;
        }
        
        var a = mockJson.data[key];
        
        switch (type(a)) {
            case 'array':
                var index = Math.floor(a.length * Math.random());
                return a[index];
                
            case 'function':
                return a();
        }
    }


    function type(obj) {
        return $.isArray(obj)
            ? 'array' 
            : (obj === null)
                ? 'null'
                : typeof obj;
    }


    function pad(num) {
        if (num < 10) {
            return '0' + num;
        }
        return num + '';
    }


    function randomDate() {
        return new Date(Math.floor(Math.random() * new Date().valueOf()));
    }



    return {
        generateTemplate: function(template, name) {
            var length = 0;
            var matches = (name || '').match(/\w+\|(\d+)-(\d+)/);
            if (matches) {
                var length_min = parseInt(matches[1], 10);
                var length_max = parseInt(matches[2], 10);
                length = Math.round(Math.random() * (length_max - length_min)) + length_min;
            }
                
            var generated = null;
            // console.log(template)
            switch (type(template)) {
                case 'array':
                    generated = [];
                    for (var i = 0; i < length; i++) {
                        generated[i] = mockJson.generateTemplate(template[0]);
                    }
                    break;

                case 'object':
                    generated = {};
                    for (var p in template) {
                        generated[p.replace(/\|(\d+-\d+|\+\d+)/, '')] = mockJson.generateTemplate(template[p], p);
                        var inc_matches = p.match(/\w+\|\+(\d+)/);
                        if (inc_matches && type(template[p]) == 'number') {
                            var increment = parseInt(inc_matches[1], 10);
                            template[p] += increment;
                        }
                    }
                    break;

                case 'number':
                    generated = (matches)
                        ? length
                        : template;
                    break;

                case 'boolean':
                    generated = (matches)
                        ? Math.random() >= 0.5
                        : template;
                    break;

                case 'string':
                    if (template.length) {
                        generated = '';
                        length = length || 1;
                        for (var i = 0; i < length; i++) {
                            generated += template;
                        }
                        var keys = generated.match(/@([A-Z_0-9\(\),]+)/g) || [];
                        for (var i = 0; i < keys.length; i++) {
                            var key = keys[i];
                            generated = generated.replace(key, getRandomData(key));
                        }
                    } else {
                        generated = ""
                        for (var i = 0; i < length; i++) {
                            generated += String.fromCharCode(Math.floor(Math.random() * 255));
                        }
                    }
                    break;

                default:
                    generated = template;
                    break;
            }
            return generated;

        }
    };
}();

mockJson.data = {
    NUMBER : "0123456789".split(''),
    LETTER_UPPER : "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(''),
    LETTER_LOWER : "abcdefghijklmnopqrstuvwxyz".split(''),
    MALE_FIRST_NAME : ["James", "John", "Robert", "Michael", "William", "David",
        "Richard", "Charles", "Joseph", "Thomas", "Christopher", "Daniel", 
        "Paul", "Mark", "Donald", "George", "Kenneth", "Steven", "Edward",
        "Brian", "Ronald", "Anthony", "Kevin", "Jason", "Matthew", "Gary",
        "Timothy", "Jose", "Larry", "Jeffrey", "Frank", "Scott", "Eric"],
    FEMALE_FIRST_NAME : ["Mary", "Patricia", "Linda", "Barbara", "Elizabeth", 
        "Jennifer", "Maria", "Susan", "Margaret", "Dorothy", "Lisa", "Nancy", 
        "Karen", "Betty", "Helen", "Sandra", "Donna", "Carol", "Ruth", "Sharon",
        "Michelle", "Laura", "Sarah", "Kimberly", "Deborah", "Jessica", 
        "Shirley", "Cynthia", "Angela", "Melissa", "Brenda", "Amy", "Anna"], 
    LAST_NAME : ["Smith", "Johnson", "Williams", "Brown", "Jones", "Miller",
        "Davis", "Garcia", "Rodriguez", "Wilson", "Martinez", "Anderson",
        "Taylor", "Thomas", "Hernandez", "Moore", "Martin", "Jackson",
        "Thompson", "White", "Lopez", "Lee", "Gonzalez", "Harris", "Clark",
        "Lewis", "Robinson", "Walker", "Perez", "Hall", "Young", "Allen"],
    EMAIL : function() {
        return getRandomData('@LETTER_LOWER')
            + '.'
            + getRandomData('@LAST_NAME').toLowerCase()
            + '@'
            + getRandomData('@LAST_NAME').toLowerCase()
            + '.com';
    },
    DATE_YYYY : function() {
        var yyyy = randomDate().getFullYear();
        return yyyy + '';
    },
    DATE_DD : function() {
        return pad(randomDate().getDate());
    },
    DATE_MM : function() {
        return pad(randomDate().getMonth() + 1);
    },
    TIME_HH : function() {
        return pad(randomDate().getHours());
    },
    TIME_MM : function() {
        return pad(randomDate().getMinutes());
    },
    TIME_SS : function() {
        return pad(randomDate().getSeconds());
    },
    LOREM : function() {
        var words = 'lorem ipsum dolor sit amet consectetur adipisicing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua Ut enim ad minim veniam quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur Excepteur sint occaecat cupidatat non proident sunt in culpa qui officia deserunt mollit anim id est laborum'.split(' ');
        var index = Math.floor(Math.random() * words.length);
        return words[index];
    },
    LOREM_IPSUM : function() {
        var words = 'Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum'.split(' ');
        var result = [];
        var length = Math.floor(Math.random() * words.length / 2);
        for (var i = 0; i < length; i++) {
            var index = Math.floor(Math.random() * words.length);
            result.push(words[index]);
        }
        return result.join(' ');
    }
};
