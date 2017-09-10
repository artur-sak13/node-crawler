const _     = require("lodash"),
      async = require("async"),
      https = require("https"),
      redis = require("redis");

var base    = process.argv[2],
    keyword = process.argv[3],
    matched = {};

let client = redis.createClient();

client.on('connect', () => {
  console.log("Connected to Redis...");
});

/*
 * Get the html of the page at a given url
 * @param: {string} url - a url to follow provided a string
 */
function getPageHtml(url,callback) {
  var content = "";
  https.get(url, (res) => {
    console.log("Response: " + res.statusCode + "\n");

    res.on("data", (chunk) => {
      content += chunk;
    }).on('end', () => {
      if(RegExp(keyword , "gi").test(content)) {
        matched[url] = content;
      }
    }).on("error", (e) => {
      console.log("Error: " + e.message);
    });
  });
  return content;
}

/*
 * Parse out url from given html
 * @param: {string} html - a retrieved page's html provided as a string
 */
function getUrls(html) {
  return _.concat([],
    _.uniq(
      _.map(
        html.match(/href="\/([^"]*")/g), (url) => {
          return url.replace('href=', base).replace(/"/g, '');
        }
      )
    )
  );
}

/*
 * Walk the folder structure at a given url
 * e.g. https://www.test.com/folder1/folder2/file will produce
 * ["https://www.test.com", "https://www.test.com/folder1", "https://www.test.com/folder1/folder2", "https://www.test.com/folder1/folder2/file"]
 * @param: {string} url - a specified page's url provided as a string
 * @returns: {array} expanded - an array containing the full walk down a url path
 */
function walkUrlPath(url) {
  var t_url    = url.split("/");
  var expanded = [];
  for(var i = 0; i < t_url.length; i++) {
    expanded.append(t_url.slice(0,i).join());
  }
  return expanded;
}

function crawler(url) {
  var html = getPageHtml(url);
  var url_q = [];
  for(var curl in getUrls(html)) {
    _.concat(url_q, walkUrlPath(curl));
  }
  async.map(url_q, getPageHtml);
}
