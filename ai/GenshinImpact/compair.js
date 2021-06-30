function F (A, B, C, D) {
	this.keys = ['A', 'B', 'C', 'D']
	this.A = A
	this.B = B
	this.C = C
	this.D = D

	this.totalArr = [['A', 'B', 'C', 'D']]
	this.result = []
}

F.prototype.execute = function () {
	let index = 1
	while (index < 6) {
		this.iteration()
		index ++
	}
	this.result = this.totalArr[this.totalArr.length - 1]
	return this
}

F.prototype.iteration = function () {
	const lastArr = this.totalArr[this.totalArr.length - 1]
	const curArr = []
	for (let i = 0; i < lastArr.length; i ++) {
		for (let j = 0; j < this.keys.length; j ++) {
			let val = lastArr[i] + this.keys[j]
			val = val.split('').sort((a, b) => a.localeCompare(b))
			curArr.push(val.join(''))
		}
	}

	this.totalArr.push(curArr)
}

F.prototype.getResult = function () {
	console.log('result ===>', this.result)
	console.log('result 去重 ===>', Array.from(new Set(this.result)).length)
}

module.exports = {
	F
}

// new F(10, 20, 30, 40).execute().getResult()
