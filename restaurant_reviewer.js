/* jshint esversion: 6 */

var express = require("express");
var Promise = require("bluebird");
var bodyParser = require("body-parser");
var app = express();

const pgp = require('pg-promise') ({
  promiseLib: Promise
});

var db = pgp({database: 'restaurant_db_2'});


app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static('public'));

app.get('/', function(request, response) {
  response.render('index.hbs');
});

app.get('/search_results', function(request, response) {
  let term = request.query.searchTerm;
  console.log('Term:', term);
  db.any(`select * from restaurant where name ilike '%${term}%'`)
    .then(function(resultsArray) {
      console.log('search', resultsArray);
      response.render('search_results.hbs', {
        search_results: resultsArray
      });
    });
});

app.get('/restaurant/:id', function(request, response) {
  var id = request.params.id;
  console.log(id);
  db.one(`select * from restaurant where id = ${id}`)
    .then(function(restaurant) {
      response.render('restaurant.hbs', {
        restaurant: restaurant
      });
    });
});

app.listen(3000, function() {
  console.log('Example app listening on port 3000!');
});
