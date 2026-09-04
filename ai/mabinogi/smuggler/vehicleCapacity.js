const calcVehicleLoad = (vehicle, product) => {
  const maxItemsBySlots = vehicle.block * product.boxCount
  const maxItemsByWeight = product.weight > 0
    ? Math.floor(vehicle.weight / product.weight)
    : 0
  const totalItems = Math.max(0, Math.min(maxItemsBySlots, maxItemsByWeight))
  const actualSlots = totalItems > 0
    ? Math.ceil(totalItems / product.boxCount)
    : 0

  return { actualSlots, totalItems }
}

module.exports = { calcVehicleLoad }
