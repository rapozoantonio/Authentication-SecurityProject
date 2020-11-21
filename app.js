//jshint esversion:6
require('dotenv').config()
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-find-or-create')
const FacebookStrategy = require('passport-facebook').Strategy;
const supervillains = require('supervillains');

const app = express();

app.use(express.static('public'));
app.set('view engine','ejs');
app.use(bodyParser.urlencoded({
	extended: true
}));

app.use(session({ 
	secret: 'Our little secret.', 
	resave: false,
	saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());



mongoose.connect('mongodb://localhost:27017/userDB', {

	useNewUrlParser: true, 
	useUnifiedTopology: true
});

mongoose.set('useCreateIndex', true);

const userSchema = new mongoose.Schema ({
	email: String,
	password: String,
	googleId: String,
	facebookId: String,
	secret: String,
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model('User', userSchema);


passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: 'http://localhost:3000/auth/google/secrets',
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo" //add this feature since google+ could be deprecated
  },
  function(accessToken, refreshToken, profile, cb) {
  	console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/secrets",
    profileFields: ['id','displayName','email']
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ facebookId: profile.id, username: profile.email }, function (err, user) {
      return cb(err, user);
    });
  }
));



app.get('/', function(req,res){
	res.render('home')
});

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] }));

app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  	function(req, res) {
    	res.redirect('/secrets');
  });

app.get('/auth/facebook',
  passport.authenticate('facebook'));

app.get('/auth/facebook/secrets',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
  		res.redirect('/secrets');;
  });


app.get('/login', function(req,res){
	res.render('login')
});

app.get('/secrets', function(req,res){
 
	if (req.isAuthenticated()){

		var supervillainName = supervillains.random();
		var supervillainSecret = 'My supervillain name is ' + supervillainName;

		User.find({'secret':{'$ne': null}}, function(err,foundUsers){
			if (err){
				console.log(err);
			}
			else {
				if(foundUsers) {
					res.render('secrets',{supervillainSecret: supervillainSecret, usersWithSecrets: foundUsers});
				}
			}
		});
	}
	else{
		res.redirect('/login');
	}
});

app.get('/logout', function (req, res){
  req.session.destroy(function (err) {
    res.redirect('/'); //Inside a callback… bulletproof!
  });
});

app.get('/register', function(req,res){
	if(req.isAuthenticated()){
		res.render('register');
	}
	else{
		res.redirect('/login')
	}
});


app.get('/submit', function(req,res){
	if(req.isAuthenticated()){
		res.render('submit');
	}
	else{
		res.redirect('/login')
	}
});

app.post('/submit', function(req,res){

	const submittedSecret = req.body.secret;

	User.findById(req.user.id,function(err,foundUser){
		if (err){
			console.log(err);
		}
		else {
			if(foundUser) {
				foundUser.secret = submittedSecret
				foundUser.save(function(){
					res.redirect('/secrets');
				});

			}
		}
	}) 
});

app.post('/register',function(req,res){

	User.register({username: req.body.username}, req.body.password, function(err,user){
		if(err){
			console.log(err);
			res.redirect('/register');
		}
		else {
			passport.authenticate('local')(req,res,function(){
				res.redirect('/secrets');
			})
		}
	})
});

app.post('/login',

  	passport.authenticate('local', { 
  		successRedirect: '/secrets',
        failureRedirect: '/login',
    })
);

app.listen(3000, function () {
    console.log('Listening on port 3000. Go to http://localhost:3000');
});