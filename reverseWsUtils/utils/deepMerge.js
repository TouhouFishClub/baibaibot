const _ = require('lodash')

module.exports = function deepMerge(obj1, obj2) {
  if (_.isObject(obj1) && _.isObject(obj2)) {
    return _.mergeWith({}, obj1, obj2, (value1, value2) => {
      if (_.isObject(value1) && _.isObject(value2)) {
        return deepMerge(value1, value2);
      }
    });
  } else {
    return obj2;
  }
}