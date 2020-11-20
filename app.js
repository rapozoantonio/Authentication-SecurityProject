//jshint esversion:6

const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const encrypt = require('mongoose-encryption');

mongoose.connect('mongodb://localhost:27017/userDB', {

	useNewUrlParser: true, 
	useUnifiedTopology: true
});

const userSchema = new mongoose.Schema ({
	email: String,
	password: String
});

const secret = 'Thisisourlittlesecret.';


userSchema.plugin(encrypt, {secret: secret, encryptedFields: ['password']});


const User = new mongoose.model('User', userSchema);

const app = express();

app.use(express.static('public'));
app.set('view engine','ejs');
app.use(bodyParser.urlencoded({
	extended: true
}));

app.get('/', function(req,res){
	res.render('home')
});

app.get('/logout', function(req,res){
	res.redirect('/')
});

app.get('/login', function(req,res){
	res.render('login')
});

app.get('/register', function(req,res){
	res.render('register')
});


app.get('/submit', function(req,res){
	res.render('submit')
});


app.post('/register',function(req,res){

	const newUser = new User({
		email: req.body.username,
		password: req.body.password
	});

	newUser.save(function(err){
		if (err){
			console.log(err);
		}
		else {
			res.render('secrets');
		}
	});
});

app.post('/login',function(req,res){

	const email = req.body.username;
	const password = req.body.password;

	User.findOne({email:email},function(err, foundUser){

		if(err){
		console.log(err);
		}
		else{
			if (foundUser) {
				if (foundUser.password === password) {
					res.render('secrets');
				}
			}
		}

	});



})






app.listen(3000, function () {
    console.log('Listening on port 3000. Go to http://localhost:3000');
});

