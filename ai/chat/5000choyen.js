// source https://github.com/yurafuca/5000choyen
const fs = require('fs-extra')
const path = require('path-extra')
const { sendImageMsgBuffer } = require('../../cq/sendImage')
const {createCanvas, registerFont} = require('canvas')
const MAX_SIZE = 30
const GLOBAL_MARGIN = 40
const FONT_INIT = ['notobk', 'notoserifbk']
const LINE_INDENT = 200

const renderRedText = (ctx, text, x, y) => {

	ctx.setTransform(1, 0, -0.45, 1, 0, 0)
	ctx.font = `100px ${FONT_INIT[0]}`

	//黒色
	{
		ctx.strokeStyle = "#000";
		ctx.lineWidth = 22;
		ctx.strokeText(text, x + 4, y + 4);
	}

	//銀色
	{
		// const grad = ctx.createLinearGradient(0, 24, 0, 122);
		const grad = ctx.createLinearGradient(0, 44, 0, 142);
		grad.addColorStop(0.0, 'rgb(0,15,36)');
		grad.addColorStop(0.10, 'rgb(255,255,255)');
		grad.addColorStop(0.18, 'rgb(55,58,59)');
		grad.addColorStop(0.25, 'rgb(55,58,59)');
		grad.addColorStop(0.5, 'rgb(200,200,200)');
		grad.addColorStop(0.75, 'rgb(55,58,59)');
		grad.addColorStop(0.85, 'rgb(25,20,31)');
		grad.addColorStop(0.91, 'rgb(240,240,240)');
		grad.addColorStop(0.95, 'rgb(166,175,194)');
		grad.addColorStop(1, 'rgb(50,50,50)');
		ctx.strokeStyle = grad;
		ctx.lineWidth = 20;
		ctx.strokeText(text, x + 4, y + 4);
	}

	//黒色
	{
		ctx.strokeStyle = "#000000";
		ctx.lineWidth = 16;
		ctx.strokeText(text, x, y);
	}

	//金色
	{
		// const grad = ctx.createLinearGradient(0, 20, 0, 100);
		const grad = ctx.createLinearGradient(0, 40, 0, 140);
		grad.addColorStop(0, 'rgb(253,241,0)');
		grad.addColorStop(0.25, 'rgb(245,253,187)');
		grad.addColorStop(0.4, 'rgb(255,255,255)');
		grad.addColorStop(0.75, 'rgb(253,219,9)');
		grad.addColorStop(0.9, 'rgb(127,53,0)');
		grad.addColorStop(1, 'rgb(243,196,11)');
		ctx.strokeStyle = grad;
		ctx.lineWidth = 10;
		ctx.strokeText(text, x, y);
	}

	//黒
	ctx.lineWidth = 6;
	ctx.strokeStyle = '#000';
	ctx.strokeText(text, x + 2, y - 3);

	//白
	ctx.lineWidth = 6;
	ctx.strokeStyle = '#FFFFFF';
	ctx.strokeText(text, x, y - 3);

	//赤
	{
		// const grad = ctx.createLinearGradient(0, 20, 0, 100);
		const grad = ctx.createLinearGradient(0, 40, 0, 140);
		grad.addColorStop(0, 'rgb(255, 100, 0)');
		grad.addColorStop(0.5, 'rgb(123, 0, 0)');
		grad.addColorStop(0.51, 'rgb(240, 0, 0)');
		grad.addColorStop(1, 'rgb(5, 0, 0)');
		ctx.lineWidth = 4;
		ctx.strokeStyle = grad;
		ctx.strokeText(text, x, y - 3);
	}

	//赤
	{
		// const grad = ctx.createLinearGradient(0, 20, 0, 100);
		const grad = ctx.createLinearGradient(0, 40, 0, 140);
		grad.addColorStop(0, 'rgb(230, 0, 0)');
		grad.addColorStop(0.5, 'rgb(123, 0, 0)');
		grad.addColorStop(0.51, 'rgb(240, 0, 0)');
		grad.addColorStop(1, 'rgb(5, 0, 0)');
		ctx.fillStyle = grad;
		ctx.fillText(text, x, y - 3);
	}

}

const renderWhiteText = (ctx, text, x, y) => {
	ctx.setTransform(1, 0, -0.45, 1, 0, 0)
	ctx.font = `100px ${FONT_INIT[1]}`

	//黒色
	{
		ctx.strokeStyle = "#000";
		ctx.lineWidth = 22;
		ctx.strokeText(text, x + 5, y + 2);
	}

	// 銀
	{
		const grad = ctx.createLinearGradient(0, y-80, 0, y+18);
		// const grad = ctx.createLinearGradient(0, y-60, 0, y+38);
		grad.addColorStop(0, 'rgb(0,15,36)');
		grad.addColorStop(0.25, 'rgb(250,250,250)');
		grad.addColorStop(0.5, 'rgb(150,150,150)');
		grad.addColorStop(0.75, 'rgb(55,58,59)');
		grad.addColorStop(0.85, 'rgb(25,20,31)');
		grad.addColorStop(0.91, 'rgb(240,240,240)');
		grad.addColorStop(0.95, 'rgb(166,175,194)');
		grad.addColorStop(1, 'rgb(50,50,50)');
		ctx.strokeStyle = grad;
		ctx.lineWidth = 19;
		ctx.strokeText(text, x + 5, y + 2);
	}

	//黒色
	{
		ctx.strokeStyle = "#10193A";
		ctx.lineWidth = 17;
		ctx.strokeText(text, x, y);
	}

	// 白
	{
		ctx.strokeStyle = "#DDD";
		ctx.lineWidth = 8;
		ctx.strokeText(text, x, y);
	}

	//紺
	{
		const grad = ctx.createLinearGradient(0, y-80, 0, y);
		// const grad = ctx.createLinearGradient(0, y-60, 0, y+20);
		grad.addColorStop(0, 'rgb(16,25,58)');
		grad.addColorStop(0.03, 'rgb(255,255,255)');
		grad.addColorStop(0.08, 'rgb(16,25,58)');
		grad.addColorStop(0.2, 'rgb(16,25,58)');
		grad.addColorStop(1, 'rgb(16,25,58)');
		ctx.strokeStyle = grad;
		ctx.lineWidth = 7;
		ctx.strokeText(text, x, y);
	}

	//銀
	{
		const grad = ctx.createLinearGradient(0, y-80, 0, y);
		// const grad = ctx.createLinearGradient(0, y-60, 0, y+20);
		grad.addColorStop(0, 'rgb(245,246,248)');
		grad.addColorStop(0.15, 'rgb(255,255,255)');
		grad.addColorStop(0.35, 'rgb(195,213,220)');
		grad.addColorStop(0.5, 'rgb(160,190,201)');
		grad.addColorStop(0.51, 'rgb(160,190,201)');
		grad.addColorStop(0.52, 'rgb(196,215,222)');
		grad.addColorStop(1.0, 'rgb(255,255,255)');
		ctx.fillStyle = grad;
		ctx.fillText(text, x, y - 3);
	}

}

const fiveThousandTrillionYen = (content, callback) => {
	let sp = content.split('#')
	if(sp.length < 2)
		return
	if(sp[0].length > MAX_SIZE || sp[1].length > MAX_SIZE)
		return
	if(sp[0].lastIndexOf('[CQ:') > -1 || sp[1].lastIndexOf('[CQ:') > -1)
		return

	registerFont(path.join(__dirname, './font/NotoSansCJK-Black.otf'), { family: FONT_INIT[0] })
	registerFont(path.join(__dirname, './font/NotoSansSC-heavy.otf'), { family: FONT_INIT[1] })

	let canvasTmp = createCanvas(2000, 400), ctxTmp = canvasTmp.getContext('2d')
	ctxTmp.setTransform(1, 0, -0.45, 1, 0, 0)
	ctxTmp.font = `100px ${FONT_INIT[0]}`
	let line1w = ctxTmp.measureText(sp[0]).width

	ctxTmp.setTransform(1, 0, -0.45, 1, 0, 0)
	ctxTmp.font = `100px ${FONT_INIT[1]}`
	let line2w = ctxTmp.measureText(sp[1]).width + LINE_INDENT

	let canvasWidth = (line2w > line1w ? line2w : line1w) + GLOBAL_MARGIN * 2
	let cavasHeight = 200 + GLOBAL_MARGIN * 2 + 20

	let canvas = createCanvas(canvasWidth, cavasHeight)
		, ctx = canvas.getContext('2d')

	ctx.fillStyle = `white`
	ctx.fillRect(0, 0, canvasWidth, cavasHeight)

	renderRedText(ctx, sp[0], GLOBAL_MARGIN + 50, GLOBAL_MARGIN + 100 - 20)
	renderWhiteText(ctx, sp[1], GLOBAL_MARGIN + LINE_INDENT + 50, GLOBAL_MARGIN + 100 + 100 - 20 + 20)


	let imgData = canvas.toDataURL()
	let base64Data = imgData.replace(/^data:image\/\w+;base64,/, "")
	let dataBuffer = new Buffer(base64Data, 'base64')

	sendImageMsgBuffer(dataBuffer, content, 'other', msg => {
		callback(msg)
	})

	// fs.writeFile(path.join(__dirname, `test.png`), dataBuffer, (err) => {
	//   if(err){
	//     console.log(err)
	//   }else{
	//     console.log("保存成功！");
	//   }
	// });




}

module.exports = {
  fiveThousandTrillionYen
}
