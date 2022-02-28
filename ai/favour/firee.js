var MongoClient = require('mongodb').MongoClient;
var mongourl = require('../../baibaiConfigs').mongourl;
var gm = require('gm')
var request = require("request");
var imageMagick = gm.subClass({ imageMagick : true });
var {sendGmImage} = require('../../cq/sendImage');

var udb;
var cl_ft;
var cl_chat;

initDB();
function initDB(){
  MongoClient.connect(mongourl, function(err, db) {
    udb=db;
    cl_ft = db.collection('cl_ft');
    cl_chat = db.collection('cl_chat');
  });
}