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
      res.render("posts/index", {user:req.user, posts:posts, page:page, maxPage:maxPage, counter:visitorCounter, search:search, urlQuery:req._parsedUrl.query});
    });
}); // index

// New
router.get("/new", util.isLoggedin, function(req, res){
  var post = req.flash("post")[0] || {};
  var errors = req.flash("errors")[0] || {};
  res.render("posts/new", {user:req.user, post:post, errors:errors});
});

/*
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
*/
router.post('/', util.isLoggedin, function(req,res){
  async.waterfall([function(callback){
    Counter.findOne({name:"posts"}, function (err,counter) {
      if(err) callback(err);
      if(counter){
         callback(null, counter);
      } else {
        Counter.create({name:"posts",totalCount:0},function(err,counter){
          if(err) return res.json({success:false, message:err});
          callback(null, counter);
        });
      }
    });
  }],function(callback, counter){
    var newPost = req.body;
    newPost.author = req.user._id;
    newPost.numId = counter.totalCount+1;
    Post.create(req.body,function (err,post) {
      if(err) return res.json({success:false, message:err});
      counter.totalCount++;
      counter.save();
      res.redirect('/posts');
    });
  });
}); // create

// show
router.get("/:id", function(req, res){
 Post.findOne({_id:req.params.id}).populate(["author", "comments.author"]).exec(function(err, post) {
  if(err) return res.json(err);
  post.views++;
  post.save();
  res.render("posts/show", {user:req.user, page:req.query.page, post:post, search:createSearch(req.query), urlQuery:req._parsedUrl.query});
 });
});

// edit
router.get("/:id/edit", util.isLoggedin, checkPermission, function(req, res){
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
router.put("/:id", util.isLoggedin, checkPermission, function(req, res){
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
router.delete("/:id", util.isLoggedin, checkPermission, function(req, res){
 Post.remove({_id:req.params.id}, function(err){
  if(err) return res.json(err);
  res.redirect("/posts");
 });
});

router.post('/:id/comments', function(req,res){
  var newComment = req.body.comment;
  newComment.author = req.user._id;
  Post.update({_id:req.params.id},{$push:{comments:newComment}},function(err,post){
    if(err) return res.json({success:false, message:err});
    res.redirect('/posts/'+req.params.id+"?"+req._parsedUrl.query);
  });
}); //create a comment
router.delete('/:postId/comments/:commentId', function(req,res){
  Post.update({_id:req.params.postId},{$pull:{comments:{_id:req.params.commentId}}},
    function(err,post){
      if(err) return res.json({success:false, message:err});
      res.redirect('/posts/'+req.params.postId+"?"+
                   req._parsedUrl.query.replace(/_method=(.*?)(&|$)/ig,""));
  });
}); //destroy a comment

module.exports = router;

// private functions // 1
function checkPermission(req, res, next){
 Post.findOne({_id:req.params.id}, function(err, post){
  if(err) return res.json(err);
  if(post.author != req.user.id) return util.noPermission(req, res);

  next();
 });
}

function createSearch(queries){
  var findPost = {}, findUser = null, highlight = {};
  if(queries.searchType && queries.searchText && queries.searchText.length >= 3){
    var searchTypes = queries.searchType.toLowerCase().split(",");
    var postQueries = [];
    if(searchTypes.indexOf("title")>=0){
      postQueries.push({ title : { $regex : new RegExp(queries.searchText, "i") } });
      highlight.title = queries.searchText;
    }
    if(searchTypes.indexOf("body")>=0){
      postQueries.push({ body : { $regex : new RegExp(queries.searchText, "i") } });
      highlight.body = queries.searchText;
    }
    if(searchTypes.indexOf("author!")>=0){
      findUser = { username : queries.searchText };
      highlight.author = queries.searchText;
    } else if(searchTypes.indexOf("author")>=0){
      findUser = { username : { $regex : new RegExp(queries.searchText, "i") } };
      highlight.author = queries.searchText;
    }
    if(postQueries.length > 0) findPost = {$or:postQueries};
  }
  return { searchType:queries.searchType, searchText:queries.searchText,
    findPost:findPost, findUser:findUser, highlight:highlight };
}
