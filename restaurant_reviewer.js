/* jshint esversion: 6 */

const express = require('express');
const Promise = require('bluebird');
const pgp = require('pg-promise')({
  promiseLib: Promise
});
const bodyParser = require('body-parser');
const app = express();
const session = require('express-session');
const bcrypt = require('bcrypt');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static('public'));

const db = pgp({
  database: 'restaurant_db_2'
});

app.use(session({
  secret: 'steelism',
  cookie: {
    maxAge: 60000000
  }
}));

app.use(function(req, resp, next) {
  resp.locals.session = req.session;
  next();
});

app.get('/login', function(req, resp) {
  resp.render('login.hbs');
});

app.post('/submit_login', function(req, resp) {
  var username = req.body.username;
  var password = req.body.password;
  db.one(`select password from reviewer where name = $1`, [username])
  .then(function(result) {
    return bcrypt.compare(password, result.password);
  })
  .then(function(matched) {
    if (matched) {
      req.session.loggedInUser = username;
      resp.redirect('/');
    } else {
      resp.redirect('/login');
    }
  })
    .catch(function(err) {
      resp.redirect('/login');
  });
});

//   if (username === 'Steven' && password === 'sgrod91') {
//     //succesfull login
//     req.session.loggedInUser = username;
//     resp.redirect('/');
//   } else {
//     resp.redirect('/login');
//   }
// });

app.get('/sign_up', function(req, resp) {
  resp.render('sign_up.hbs');
});

app.post('/submit_registration', function(req, res, next) {
  var info = req.body;
  var username = req.body.username;
  var email = req.body.email;
  var password = req.body.password;
  bcrypt.hash(info.password, 10)
    .then(function(encryptedPassword) {
      console.log(encryptedPassword);
      return db.none(`insert into reviewer values (default, $1, $2, 1, $3)`,
      [info.username, info.email, encryptedPassword]);
    })
    .then(function() {
      req.session.loggedInUser = info.username;
      res.redirect('/login');
    })
    .catch(next);
});

app.use(function authentication(req, resp, next) {
  if (req.session.loggedInUser) {
    next();
  } else {
    resp.redirect('/login');
  }
});

app.get('/', function(req, resp) {
  resp.render('index.hbs', {
    name: req.session.loggedInUser
  });
});

app.get('/logout', function(req, res) {
  req.session.loggedInUser = null;
  res.redirect('/login');
});

app.get('/search_results', function(req, resp, next) {
  let term = req.query.searchTerm;
  console.log('Term:', term);
  db.any(`
    select * from restaurant
    where restaurant.name ilike '%${term}%'
    `)
    .then(function(resultsArray) {
      console.log('results', resultsArray);
      resp.render('search_results.hbs', {
        layout: false,
        results: resultsArray
      });
    })
    .catch(next);
});

app.get('/restaurant/:id', function(req, resp, next) {
  let id = req.params.id;
  db.any(`
    select
      reviewer.name as reviewer_name,
      review.title,
      review.stars,
      review.review
    from
      restaurant
    inner join
      review on review.restaurant_id = restaurant.id
    left outer join
      reviewer on review.reviewer_id = reviewer.id
    where restaurant.id = ${id}
  `)
    .then(function(reviews) {
      return [
        reviews,
        db.one(`
          select name as restaurant_name, * from restaurant
          where id = ${id}`)
      ];
    })
    .spread(function(reviews, restaurant) {
      resp.render('restaurant.hbs', {
        restaurant: restaurant,
        reviews: reviews
      });
    })
    .catch(next);
});

app.post('/write_review/:id', function(req, resp, next) {
  var restaurantId = req.params.id;
  console.log('restaurant ID', restaurantId);
  console.log('from the form', req.body);
  db.none(`insert into review values
    (default, NULL, ${req.body.stars}, '${req.body.title}', '${req.body.review}', ${restaurantId})`)
    .then(function() {
      resp.redirect(`/restaurant/${restaurantId}`);
    })
    .catch(next);
});

app.listen(3000, function() {
  console.log('Listening on port 3000.');
});
