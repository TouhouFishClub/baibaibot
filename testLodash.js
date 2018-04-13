const _ = require('lodash')
var users = [
  { 'user': 'barney',  'count': 1 },
  { 'user': 'fred',    'count': 3 },
  { 'user': 'pebbles', 'count': 2 }
];

console.log(_.sortBy(users, 'count'))
console.log(users)

console.log(_.replace('121212', '1', '3'))