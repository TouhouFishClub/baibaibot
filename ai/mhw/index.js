var https = require('https');


function handleMHRes(resdata){
  var n1 = resdata.indexOf('simple-table');
  var n2 = resdata.indexOf('</table>');
  var tb = resdata.substring(n1,n2);


}
