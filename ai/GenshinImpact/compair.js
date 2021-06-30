function F (A, B, C, D) {
	this.keys = ['A', 'B', 'C', 'D']
	this.A = A
	this.B = B
	this.C = C
	this.D = D

	this.parentNode = 0
	this.childNode = 0

	this.totalArr = [['A', 'B', 'C', 'D']]
	this.result
}

F.prototype.execute = function () {
	let index = 0
	while (index < 6) {
		this.iteration()
		index ++
	}
	return this
}

F.prototype.iteration = function () {
	const lastArr = this.totalArr[this.totalArr.length - 1]
	const curArr = []
	for (let i = 0; i < lastArr.length; i ++) {
		for (let j = 0; j < this.keys.length; j ++) {
			// val = val.split('').sort((a, b) => a.localeCompare(b))
			curArr.push(lastArr[i] + this.keys[j])
		}
	}

	this.totalArr.push(curArr)
}

F.prototype.getResult = function () {
	console.log('total ===>', this.totalArr)
}


F.prototype.setCurNode = function (parentNode, childNode) {
	this.parentNode = parentNode
	if (childNode < 0) {
		new Error ('干，能不能正经点')
	} else if (childNode >= (this.keys.length ** (parentNode + 1))) {
		new Error('子二叉树索引超出子二叉树有效范围')
	} else {
		this.childNode = childNode
	}
	return this
}
F.prototype.getCurNode = function () {
	this.result = new Array(this.parentNode + 1)
	const prevlen = this.parentNode ** 4

	for (let i = 0; i < this.result.length; i ++) {
		const prevlen = 4 ** (this.parentNode - i)
		const curlen = 4 ** (this.parentNode + 1 - i)
		this.result[i] = this.keys.find((item, index) => {
			let childNode = this.childNode
			while (childNode > curlen) {
				childNode -= curlen
			}
			return childNode <= prevlen * (index + 1)
		})
	}
	console.log(this.result, this.result.join(''))
	return this
}

// new F(10, 20, 30, 40).execute().getResult()
// new F(10, 20, 30, 40).setCurNode(5, 7).getCurNode()


module.exports = {
	F
}

// new F(10, 20, 30, 40).execute().getResult()
