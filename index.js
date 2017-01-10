// index.js

var express    = require("express");
var mongoose   = require("mongoose");
var bodyParser  = require("body-parser");
var cookieParser = require("cookie-parser");
var methodOverride = require("method-override");
var flash     = require("connect-flash");
var session    = require("express-session");
var passport   = require("./config/passport");
var app = express();
var ckStaticsPath = require('node-ckeditor');

// DB setting
mongoose.connect(process.env.MONGO_DB);
var db = mongoose.connection;

db.once("open", function(){
 console.log("DB connected");
});
db.on("error", function(err){
 console.log("DB ERRnmpOR : ", err);
});

// Other settings
app.set("view engine", "ejs");
app.use(express.static(__dirname+"/public"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:true}));
app.use(cookieParser());
app.use(methodOverride("_method"));
app.use(flash());
app.use(session({secret:"MySecret"}));
app.use(countVisitors);
app.use(express.static(__dirname+"/ckeditor"));

// Passport
app.use(passport.initialize());
app.use(passport.session());

// Custom Middlewares
app.use(function(req,res,next){
 res.locals.isAuthenticated = req.isAuthenticated();
 res.locals.user = req.user;
 next();
});

// Routes
app.use("/", require("./routes/home"));
app.use("/posts", require("./routes/posts"));
app.use("/users", require("./routes/users"));

// Port setting
var port = process.env.PORT || 3000;

app.listen(port, function(){
 console.log("server on!");
});

function countVisitors(req, res, next) {
  if(!req.cookies.count && req.cookies['connect.sid']) {
    res.cookie('count', "", { maxAge:3600000, httpOnly:true});
    var now = new Date();
    var date = now.getFullYear() + "/" + now.getMonth() + "/" + now.getDate();
    if(date != req.cookies.countDate) {
      res.cookie('countDate', date, { maxAge:86400000, httpOnly:true});

      var Counter = require('./models/Counter');
      Counter.findOne({name:"visitors"}, function(err, counter) {
        if(err) return next();
        if(counter===null) {
          Counter.create({name:"visitors", totalCount:1, todayCount:1, date:date});
        } else {
          counter.totalCount++;
          if(counter.date == date) {
            counter.todayCount++;
          } else {
            counter.todayCount = 1;
            counter.date = date;
          }
          counter.save();
        }
      });
    }
  }
  return next();
}
