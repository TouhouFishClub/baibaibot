const rp = require('./ai/rp');
let count = 10000
let arr = new Array(101).fill(0)
for(let i = 1; i < 100000; i++) {
  count += ~~(Math.random() * 1000)
  rp(count, d => {
    arr[d] += 1
  });
}
console.log(JSON.stringify(arr))