const {sendPrivateMsg} = require('../../cq/cache')


var gamers = {};

var cards = [];




function init(){
  cards = [];
  for(var i=1;i<=54;i++){
    cards.push([i])
  }
  cards.sort(function(){return 0.5 - Math.random()})
}

function join(username,userid,callback){
  gamers[username]={id:userid,name:username,c:[]};
}


var sr="♠♣♥♦".split('');
var cr=["K","A","2","3","4","5","6","7","8","9","10","J","Q"];


function draw(userid,username){
  if(gamers[username]){
    var d = cards.pop();
    gamers[username].c.push(d);
  }else{

  }


}

function getCardName(number){
  if(number==53){
    return "joker"
  }else if(number==54){
    return "JOKER";
  }else{
    var c = Math.floor((number-1)/13);
    var d = Math.floor(number%13);
    return sr[c]+cr[d];
  }

}

function start(){

}