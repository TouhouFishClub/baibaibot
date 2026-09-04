const assert = require('node:assert/strict')
const { calcVehicleLoad } = require('./vehicleCapacity')

const rescueTool = { weight: 3, boxCount: 38 }

assert.deepEqual(
  calcVehicleLoad({ block: 11, weight: 1200 }, rescueTool),
  { actualSlots: 11, totalItems: 400 }
)

assert.deepEqual(
  calcVehicleLoad({ block: 9, weight: 2000 }, rescueTool),
  { actualSlots: 9, totalItems: 342 }
)

console.log('vehicle capacity tests passed')
