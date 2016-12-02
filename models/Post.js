// models/Post.js

var mongoose = require("mongoose");
var util = require("../util");

// schema
var postSchema = mongoose.Schema({ // 1
 title:{type:String, required:[true,"Title is required!"]}, // 2
 body:{type:String, required:[true,"Body is required!"]}, // 2
 createdAt:{type:Date, default:Date.now}, // 2
 updatedAt:{type:Date},
},{
 toObject:{virtuals:true} // 4
});

// virtuals // 3
postSchema.virtual("createdDate")
.get(function(){
 return util.getDate(this.createdAt);
});

postSchema.virtual("createdTime")
.get(function(){
 return util.getTime(this.createdAt);
});

postSchema.virtual("updatedDate")
.get(function(){
 return util.getDate(this.updatedAt);
});

postSchema.virtual("updatedTime")
.get(function(){
 return util.getTime(this.updatedAt);
});

// model & export
var Post = mongoose.model("post", postSchema);
module.exports = Post;
