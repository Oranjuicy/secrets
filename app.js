/// Server setup ///

require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate')
const FacebookStrategy = require('passport-facebook').Strategy;

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));
app.set('trust proxy', 1) // trust first proxy
app.use(session({
  secret: 'nostaletoastplease',
  resave: false,
  saveUninitialized: false,
}))
app.use(passport.initialize());
app.use(passport.session());


mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true});

const userSchema = new mongoose.Schema({
    username: String,
    password: String,
    googleId: String,
    facebookId: String,
    secret: String,
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, {
        id: user.id,
        username: user.username,
        picture: user.picture
      });
    });
  });
  
  passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, user);
    });
  });

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_ID,
    clientSecret: process.env.FACEBOOK_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ facebookId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

/// routing /// 

app.get("/", (req, res)=>{
    res.render("home");
});

app.get("/auth/google",
  passport.authenticate("google", { scope: ["profile"] }));

app.get("/auth/google/secrets", 
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    res.redirect("/secrets");
  });

app.get('/auth/facebook',
  passport.authenticate('facebook'));

app.get('/auth/facebook/secrets',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/secrets');
  });

app.get("/login", (req, res)=>{
    res.render("login");
});

app.get("/register", (req, res)=>{
    res.render("register");
});

app.get("/secrets", (req, res)=>{
  User.find({"secret": {$ne:null}}).then((foundSecrets, err)=>{
    if (!err) {
      res.render("secrets", {foundSecrets: foundSecrets})
    } else {
      console.log(err);
    }
  })
});

app.get('/logout', (req, res)=>{
    req.logout((err)=>{
        if (!err){
            res.redirect("/");
        } else {
            console.log(err)
        }
    });
})

app.get("/submit", (req, res)=>{
  if (req.isAuthenticated()){
    res.render("submit");
  } else {
    res.redirect("/login");
    }
});

app.post("/register", (req, res)=>{
    User.register({username: req.body.username}, req.body.password, (err, user)=>{
        if (err) {
            console.log(err);
            res.redirect("/register");
        } else {
            passport.authenticate("local")(req, res, ()=>{
                res.redirect("/secrets");
            })
        }
    })
});


app.post("/login",(req, res)=>{
    const user = new User ({
        username: req.body.username,
        password: req.body.password,
    })
    User.findOne({username: user.username}).then((foundUser, err)=>{
   if (foundUser){
    req.login(user, (err)=>{
      if (err){
          console.log(err)
      } else {
          passport.authenticate("local")(req, res, ()=>{
              res.redirect("/secrets");
          })
      }
    })
   } else {
    res.redirect("/register")
   }

  })
});

app.post("/submit", (req, res)=>{
  const submittedSecret = req.body.secret;

  User.findById(req.user.id).then((foundUser, err)=>{
    if (!err) {
      if (foundUser){
        foundUser.secret = submittedSecret;
        foundUser.save().then(()=>{
          res.redirect("secrets");
        })
      }
    } else {
      console.log(err)
    }
  })


})

/// starting server ///

let port = process.env.PORT;
if (port == null || port == ""){
    port = 3000;
};

app.listen(port);