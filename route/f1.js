function handlef1(req,res){
  var path = req.path;
  console.log(path);
  res.set('Content-Type','text/plain');
  res.send('ok\n'+path);
}

module.exports={
  handlef1
}
