var MongoClient = require('mongodb').MongoClient;
var mongourl = 'mongodb://127.0.0.1:27017/db_test';


MongoClient.connect(mongourl, function(err, db) {
  // var query = {'_id':userName};
  console.log(err)
  var cl_roulette_game = db.collection('cl_roulette_game');
  cl_roulette_game.save({test: 12450});
  // cl_roulette_game.findOne(query, function(err, data) {
  //   if(data){
  //     data.d=data.d+1;
  //     data.death=data.death+IsDeath;
  //   }else{
  //     data = {'_id':userName,d:1,death:IsDeath}
  //   }
  //   callback(data.death+"/"+data.d);
  // });
});