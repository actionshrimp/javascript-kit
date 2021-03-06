(function (Global, undefined) {

    "use strict";

    // -- Request handlers

    var ajaxRequest = (function() {
        if(typeof XMLHttpRequest != 'undefined' && 'withCredentials' in new XMLHttpRequest()) {
            return function(url, callback) {

                var xhr = new XMLHttpRequest();

                // Called on success
                var resolve = function() {
                    callback(null, JSON.parse(xhr.responseText), xhr);
                };

                // Called on error
                var reject = function() {
                    var status = xhr.status;
                    callback(new Error("Unexpected status code [" + status + "] on URL "+url), null, xhr);
                };

                // Bind the XHR finished callback
                xhr.onreadystatechange = function() {
                    if (xhr.readyState === 4) {
                        if(xhr.status && xhr.status == 200) {
                            resolve();
                        } else {
                            reject();
                        }
                    }
                };

                // Open the XHR
                xhr.open('GET', url, true);

                // Kit version (can't override the user-agent client side)
                // xhr.setRequestHeader("X-Prismic-User-Agent", "Prismic-javascript-kit/%VERSION%".replace("%VERSION%", Global.Prismic.version));

                // Json request
                xhr.setRequestHeader('Accept', 'application/json');

                // Send the XHR
                xhr.send();
            };
        }
    });

    var xdomainRequest = (function() {
        if(typeof XDomainRequest != 'undefined') {
            return function(url, callback) {

                var xdr = new XDomainRequest();

                // Called on success
                var resolve = function() {
                    callback(null, JSON.parse(xdr.responseText), xdr);
                };

                // Called on error
                var reject = function(msg) {
                    callback(new Error(msg), null, xdr);
                };

                // Bind the XDR finished callback
                xdr.onload = function() {
                    resolve(xdr);
                };

                // Bind the XDR error callback
                xdr.onerror = function() {
                    reject("Unexpected status code on URL "+url);
                };

                // Open the XHR
                xdr.open('GET', url, true);

                // Bind the XDR timeout callback
                xdr.ontimeout = function () {
                    reject("Request timeout");
                };

                // Empty callback. IE sometimes abort the reqeust if
                // this is not present
                xdr.onprogress = function () { };

                xdr.send();
            };
        }
    });

    var nodeJSRequest = (function() {
        if(typeof require == 'function' && require('http')) {
            var requestsCache = {},
                http = require('http'),
                https = require('https'),
                url = require('url'),
                querystring = require('querystring'),
                pjson = require('../package.json');

            return function(requestUrl, callback) {
                if(requestsCache[requestUrl]) {
                    callback(null, requestsCache[requestUrl]);
                } else {

                    var parsed = url.parse(requestUrl),
                        h = parsed.protocol == 'https:' ? https : http,
                        options = {
                            hostname: parsed.hostname,
                            path: parsed.path,
                            query: parsed.query,
                            headers: {
                                'Accept': 'application/json',
                                'User-Agent': 'Prismic-javascript-kit/' + pjson.version + " NodeJS/" + process.version
                            }
                        };

                    h.get(options, function(response) {
                        if(response.statusCode && response.statusCode == 200) {
                            var jsonStr = '';

                            response.setEncoding('utf8');
                            response.on('data', function (chunk) {
                                jsonStr += chunk;
                            });

                            response.on('end', function () {
                              var cacheControl = response.headers['cache-control'],
                                  maxAge = cacheControl && /max-age=(\d+)/.test(cacheControl) ? parseInt(/max-age=(\d+)/.exec(cacheControl)[1], 10) : undefined,
                                  json = JSON.parse(jsonStr);

                              if(maxAge) {
                                  requestsCache[requestUrl] = json;
                              }

                              callback(null, json, response);
                            });
                        } else {
                            callback(new Error("Unexpected status code [" + response.statusCode + "] on URL "+requestUrl), null, response);
                        }
                    });

                }

            };
        }
    });

    Global.Prismic.Utils = {
        request: function() {
            return ajaxRequest() || xdomainRequest() || nodeJSRequest() ||
                (function() {throw new Error("No request handler available (tried XMLHttpRequest & NodeJS)");})();
        }
    };

}(typeof exports === 'object' && exports ? exports : (typeof module === "object" && module && typeof module.exports === "object" ? module.exports : window)));
