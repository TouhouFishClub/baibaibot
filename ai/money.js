var money = function(str){
  var unit = ['圆', '万', '亿', '万'];
  var unitrep = ['', '拾', '佰', '仟'];
  var Numlist = [];
  if (/^\d{1,16}(\.\d{1,2}){0,1}$/.test(str)) {
    var numarr = str.split('.');
    if (!numarr[1]) {
      numarr.push('00')
    } else {
      numarr[1].length == 1 ? numarr.push('0') : '';
    }
    numarr = numarr.join('').split('');
    var f = numarr.pop(), fz = false;
    // 处理分
    if (f == '0') {
      fz = true;
      Numlist.push('整')
    } else {
      Numlist.push('分');
      Numlist.push(maparray(f));
    }
    // 处理角
    var j = numarr.pop();
    if (j == '0') {
      if (!fz) {
        Numlist.push('零')
      }
    } else {
      Numlist.push('角');
      Numlist.push(maparray(j));
    }
    // 处理整数部分
    var zc = 0, b = false, c, uz = true;
    for (var i = 0; i < unit.length; i++) {
      if (b || numarr.length == 0) {
        break;
      } else {
        if(zc % 4 == 0 && zc > 1 && !uz){
          uz = true;
          Numlist.splice(-1, 0, '零');
        }
        if (i == 2) {
          if (zc >= unitrep.length - 1) {
            Numlist.pop();
          }
        }
        Numlist.push(unit[i]);
        for (var k = 0; k < unitrep.length; k++) {
          if (numarr.length == 0) {
            b = true;
            break;
          } else {
            c = numarr.pop();
            if (c == '0') {
              if (!(k == 0) && !zc) {
                Numlist.push('零')
              }
              zc++;
            } else {
              zc = 0;
              uz = false;
              Numlist.push(unitrep[k]);
              Numlist.push(maparray(c));
            }
          }
        }
      }
    }
    if(Numlist[Numlist.length - 1] == '圆')
      Numlist.pop()
    if(Numlist[Numlist.length - 1] == '零')
      Numlist.pop()
    return Numlist.reverse().join('')
  } else {
    return '输入错误'
  }
}

const maparray = n => ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'][n]

module.exports = {
  money
}