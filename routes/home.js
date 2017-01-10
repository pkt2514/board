// routes/home.js

var express = require("express");
var router = express.Router();
var passport= require("../config/passport"); // 1
var multipart = require("connect-multiparty");
var multipartMiddleware = multipart();

// Home
router.get("/", function(req, res){
 res.render("home/welcome");
});
router.get("/about", function(req, res){
 res.render("home/about");
});
router.get("/ckeditor", function(req, res){
 res.render("home/ckeditor");
});

// Login // 2
router.get("/login", function (req,res) {
 var username = req.flash("username")[0];
 var errors = req.flash("errors")[0] || {};
 res.render("home/login", {
  username:username,
  errors:errors
 });
});

// Post Login // 3
router.post("/login",
 function(req,res,next){
  var errors = {};
  var isValid = true;
  if(!req.body.username){
   isValid = false;
   errors.username = "Username is required!";
  }
  if(!req.body.password){
   isValid = false;
   errors.password = "Password is required!";
  }

  if(isValid){
   next();
  } else {
   req.flash("errors",errors);
   res.redirect("/login");
  }
 },
 passport.authenticate("local-login", {
  successRedirect : "/",
  failureRedirect : "/login"
 }
));

// Logout // 4
router.get("/logout", function(req, res) {
 req.logout();
 res.redirect("/");
});

// upload Images
router.post('/uploader', multipartMiddleware, function(req, res) {
    var fs = require('fs');

    fs.readFile(req.files.upload.path, function (err, data) {
        var newPath = __dirname + '/../public/uploads/' + req.files.upload.name;
        fs.writeFile(newPath, data, function (err) {
            if (err) console.log({err: err});
            else {
                html = "";
                html += "<script type='text/javascript'>";
                html += "    var funcNum = " + req.query.CKEditorFuncNum + ";";
                html += "    var url     = \"/uploads/" + req.files.upload.name + "\";";
                html += "    var message = \"Uploaded file successfully\";";
                html += "";
                html += "    window.parent.CKEDITOR.tools.callFunction(funcNum, url, message);";
                html += "</script>";

                res.send(html);
            }
        });
    });
});

/*
router.post('/uploader', function (req, res) {
  if (req.query.error) {
    return res.send('ERROR ' + req.query.error + ': ' + req.query.error_description);
  }

  fs.readFile(__dirname + '/files/pictureicon.png','utf8', function read(err, data) {
    if (err) {
      throw err;
    }
    fileupload(data);
  });
});

function fileupload(content) {
  request.put('https://api-content.dropbox.com/1/files_put/auto/proposals/icon.png', {
    headers: { Authorization: 'Bearer TOKEN-HERE', 'Content-Type': 'image/png'
  }, body: content}, function optionalCallback (err, httpResponse, bodymsg) {
    if (err) {
      return console.log(err);
    }

    console.log("HERE");
  });
}
*/
module.exports = router;
