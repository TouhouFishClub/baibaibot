const _ = require('lodash')
var users = [
  { 'user': 'barney',  'active': true },
  { 'user': 'fred',    'active': false },
  { 'user': 'pebbles', 'active': false }
];

console.log(_.includes({ 'a': 'aab', 'b': 'bc' }, 'aab'))