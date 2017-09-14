function battlePlusBeforeDamage(data1,data2){

}

function battlePlusAfterDamage(data1,data2){

}
//职业job，攻击atk，灵巧ski，速度agi，幸运luck，防御def
var JobInfo=[
['新人',0.5,0.5,0.5,0.5,0.5],
['战士',1.1,0.6,0.6,0.5,0.7],
['骑士',0.8,0.7,0.7,0.5,0.8],
['剑士',0.7,0.8,0.9,0.5,0.6],
['盗贼',0.6,0.6,0.9,0.5,0.5]
]

function LevelUp(data){
	expCost=data.lv*data.lv*data.lv+50;
	if (data.exp>expCost){
		if (data.lv<20){
			data.exp=data.exp-expCost;
			data.lv=data.lv+1;
			var ret="";
			var r=Math.random()*Math.ceil(JobInfo[data.job][1];
			if (r<JobInfo[data.job][1])
				data.atk=data.atk+r;
			ret=ret+",atk+"+r;
			r=Math.random()*Math.ceil(JobInfo[data.job][2];
			if (r<JobInfo[data.job][2])
				data.ski=data.ski+r;
			ret=ret+",ski+"+r;
			r=Math.random()*Math.ceil(JobInfo[data.job][3];
			if (r<JobInfo[data.job][3])
				data.agi=data.agi+r;
			ret=ret+",agi+"+r;
			r=Math.random()*Math.ceil(JobInfo[data.job][4];
			if (r<JobInfo[data.job][4])
				data.luck=data.luck+r;
			ret=ret+",luck+"+r;
			r=Math.random()*Math.ceil(JobInfo[data.job][5];
			if (r<JobInfo[data.job][5])
				data.def=data.def+r;
			ret=ret+",def+"+r;
			
			return '升级到'+data.lv+'级,'+ret.substring(1);
		}else{
		return '不能在升级了,请转生后在升级';
		}
	}
	else{
		return '经验不足,不能升级';
	}
}

module.exports={
  battlePlusBeforeDamage,
  battlePlusAfterDamage
}