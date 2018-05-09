var fz = function(t){return t*t*(Math.pow(Math.E,1/t)-1)-t};
var fm = function(x){return x*x*Math.log(1+1/x);}
var ret = 0;
var n = 99999999;
for(var i=1;i<n;i++){
  ret = ret + 1*fz(i);
}
console.log(ret/fm(n))