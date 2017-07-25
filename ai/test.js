var ts = new Date().getTime();
var type = Math.floor(Math.random()*8)+1;
var id = (1999123456789-ts-86400000*type)+"_"+type;
var country = "86";
var phone = country+"123456"+(Math.floor(Math.random()*88888)+11111);
var save = {"_id":id,type:NumberInt(type),c:country,phone:phone,ts:new Date(ts)}
db.cl_winner.save(save)
