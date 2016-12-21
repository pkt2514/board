// routes/posts.js

var express = require("express");
var router = express.Router();
var Post = require("../models/Post");
var util = require("../util");
var User = require("../models/User");
var Counter = require('../models/Counter');
var async = require('async');
var mongoose = require("mongoose");

/*
// Index
router.get("/", function(req, res){
 var visitorCounter = null;
 var page = Math.max(1, req.query.page) > 1 ? parseInt(req.query.page):1;
 var limit = Math.max(1, req.query.limit) > 1 ? parseInt(req.query.limit):10;
 var search = createSearch(req.query);
 console.log("search = " + search);

 Counter.findOne({name:"visitors"}, function(err, counter) {
   if(!err) visitorCounter = counter;
 });

 Post.count({}, function(err, count) {
  if(err) return res.json({success:false, message:err});
  var skip = (page - 1) * limit;
  var maxPage = Math.ceil(count / limit);
 //Post.find({}, function(err, posts){
 Post.find({}).populate("author").sort('-createdAt').skip(skip).limit(limit).exec(function(err, posts) {
  if(err) return res.json(err);
  res.render("posts/index", {user:req.user, posts:posts, page:page, maxPage:maxPage, counter:visitorCounter, search:search});
  });
 });
});
*/
router.get('/', function(req,res){
  var visitorCounter = null;
  var page = Math.max(1,req.query.page)>1?parseInt(req.query.page):1;
  var limit = Math.max(1,req.query.limit)>1?parseInt(req.query.limit):10;
  var search = createSearch(req.query);
  
  async.waterfall([function(callback){
      Counter.findOne({name:"visitors"}, function (err,counter) {
        if(err) callback(err);
        visitorCounter = counter;
        callback(null);
      });
    },function(callback) {
      if(!search.findUser) return callback(null);
      User.find(search.findUser,function(err,users){
        if(err) callback(err);
        var or = [];
        users.forEach(function(user){
          or.push({author:mongoose.Types.ObjectId(user._id)});
        });

        if(search.findPost.$or){
          search.findPost.$or = search.findPost.$or.concat(or);
        } else if(or.length>0){
          search.findPost = {$or:or};
        }
        callback(null);
      });
    },function(callback){
      if(search.findUser && !search.findPost.$or) return callback(null, null, 0);
      Post.count(search.findPost,function(err,count){
        if(err) callback(err);
        skip = (page-1)*limit;
        maxPage = Math.ceil(count/limit);
        callback(null, skip, maxPage);

      });
    },function(skip, maxPage, callback){
      if(search.findUser && !search.findPost.$or) return callback(null, [], 0);
      Post.find(search.findPost).populate("author").sort('-createdAt').skip(skip).limit(limit).exec(function (err,posts) {
        if(err) callback(err);
        callback(null, posts, maxPage);
      });
    }],function(err, posts, maxPage){
      if(err) return res.json({success:false, message:err});
      res.render("posts/index", {user:req.user, posts:posts, page:page, maxPage:maxPage, counter:visitorCounter, search:search});
    });
}); // index

// New
router.get("/new", function(req, res){
  var post = req.flash("post")[0] || {};
  var errors = req.flash("errors")[0] || {};
  res.render("posts/new", {user:req.user, post:post, errors:errors});
});

// create
router.post("/", function(req, res){
 if(req.user !== null) {
  req.body.author = req.user._id;
 }
 Post.create(req.body, function(err, post){
  if(err){
   req.flash("post", req.body);
   req.flash("errors", util.parseError(err));
   return res.redirect("/posts/new");
  }
  res.redirect("/posts");
 });
});

// show
router.get("/:id", function(req, res){
 Post.findOne({_id:req.params.id}).populate("author").exec(function(err, post) {
  if(err) return res.json(err);
  res.render("posts/show", {user:req.user, page:req.query.page, post:post});
 });
});

// edit
router.get("/:id/edit", function(req, res){
 var post = req.flash("post")[0];
 var errors = req.flash("errors")[0] || {};
 if(!post){
  Post.findOne({_id:req.params.id}, function(err, post){
   if(err) return res.json(err);
   res.render("posts/edit", { post:post, errors:errors });
  });
 } else {
  post._id = req.params.id;
  res.render("posts/edit", { post:post, errors:errors });
 }
});

// update
router.put("/:id", function(req, res){
 req.body.updatedAt = Date.now();
 Post.findOneAndUpdate({_id:req.params.id}, req.body, {runValidators:true}, function(err, post){
  if(err){
   req.flash("post", req.body);
   req.flash("errors", util.parseError(err));
   return res.redirect("/posts/"+req.params.id+"/edit");
  }
  res.redirect("/posts/"+req.params.id);
 });
});

// destroy
router.delete("/:id", function(req, res){
 Post.remove({_id:req.params.id}, function(err){
  if(err) return res.json(err);
  res.redirect("/posts");
 });
});

module.exports = router;

function createSearch(queries){
  var findPost = {}, findUser = null;
  if(queries.searchType && queries.searchText && queries.searchText.length >= 3){
    var searchTypes = queries.searchType.toLowerCase().split(",");
    var postQueries = [];
    if(searchTypes.indexOf("title")>=0){
      postQueries.push({ title : { $regex : new RegExp(queries.searchText, "i") } });
    }
    if(searchTypes.indexOf("body")>=0){
      postQueries.push({ body : { $regex : new RegExp(queries.searchText, "i") } });
    }
    if(searchTypes.indexOf("author!")>=0){
      findUser = { username : queries.searchText };
    } else if(searchTypes.indexOf("author")>=0){
      findUser = { username : { $regex : new RegExp(queries.searchText, "i") } };
    }
    if(postQueries.length > 0) findPost = {$or:postQueries};
  }
  return { searchType:queries.searchType, searchText:queries.searchText,
    findPost:findPost, findUser:findUser };
}
