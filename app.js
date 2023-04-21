/// Server setup ///

require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash");
const md5 = require("md5")


const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true});

const userSchema = new mongoose.Schema({
    username: String,
    password: String
});


const User = new mongoose.model("User", userSchema);


/// routing /// 

app.get("/", (req, res)=>{
    res.render("home");
});

app.get("/login", (req, res)=>{
    res.render("login");
});

app.get("/register", (req, res)=>{
    res.render("register");
});

app.get("/submit", (req, res)=>{
    res.render("submit");
});

app.post("/register", (req, res)=>{
    const newUser = new User({
        username: req.body.username,
        password: md5(req.body.password)
    });
    newUser.save().then((result, err)=>{
        if (!err){
            res.render("secrets");
        } else {
            res.send(err)
        }
    })
});

app.post("/login",(req, res)=>{
    const username = req.body.username;
    const password = md5(req.body.password);

    User.findOne({username: username}).then((foundUser, err)=>{
        if (err){
            console.log(err)
        } else {
            if (foundUser){
                if (foundUser.password === password) {
                    res.render("secrets")
                } else {
                    console.log("pass doesn't match")
                }
            } 
        }
    })
})

/// starting server ///

let port = process.env.PORT;
if (port == null || port == ""){
    port = 3000;
};

app.listen(port);