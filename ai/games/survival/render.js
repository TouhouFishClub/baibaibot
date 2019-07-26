const MARGIN = 5
const BLOCK_SIDE = 100
const {createCanvas, loadImage} = require('canvas')

module.exports = function(mapOption) {
  let width = mapOption[0].length, height = mapOption.length,
    canvasWidth = width * BLOCK_SIDE + (width + 1) * MARGIN,
    canvasHeight = height * BLOCK_SIDE + (height + 1) * MARGIN
  let canvas = createCanvas(canvasWidth, canvasHeight)

}