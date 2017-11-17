const constants = {
    "(无)": {
        chineseName: "",
        nameForSearch: "",
        shipType: "",
        rare: false
    },
    "長門": {
        chineseName: "长门",
        nameForSearch: "长门,changmen,chang men,Nagato,nagato",
        shipType: "战舰",
        rare: true
    },
    "陸奥": {
        chineseName: "陆奥",
        nameForSearch: "陆奥,luao,lu ao,Mutsu,mutsu",
        shipType: "战舰",
        rare: true
    },
    "伊勢": {
        chineseName: "伊势",
        nameForSearch: "伊势,yishi,yi shi,Ise,ise",
        shipType: "战舰",
        rare: false
    },
    "日向": {
        chineseName: "日向",
        nameForSearch: "日向,rixiang,ri xiang,Hyuuga,hyuuga",
        shipType: "战舰",
        rare: false
    },
    "雪風": {
        chineseName: "雪风",
        nameForSearch: "雪风,xuefeng,xue feng,Yukikaze,yukikaze",
        shipType: "驱逐舰",
        rare: true
    },
    "赤城": {
        chineseName: "赤城",
        nameForSearch: "赤城,chicheng,chi cheng,Akagi,akagi",
        shipType: "空母",
        rare: true
    },
    "加賀": {
        chineseName: "加贺",
        nameForSearch: "加贺,jiahe,jia he,Kaga,kaga",
        shipType: "空母",
        rare: false
    },
    "蒼龍": {
        chineseName: "苍龙",
        nameForSearch: "苍龙,canglong,cang long,Souryuu,souryuu",
        shipType: "空母",
        rare: false
    },
    "飛龍": {
        chineseName: "飞龙",
        nameForSearch: "飞龙,feilong,fei long,Hiryuu,hiryuu",
        shipType: "空母",
        rare: true
    },
    "島風": {
        chineseName: "岛风",
        nameForSearch: "岛风,daofeng,dao feng,Shimakaze,shimakaze",
        shipType: "驱逐舰",
        rare: true
    },
    "吹雪": {
        chineseName: "吹雪",
        nameForSearch: "吹雪,chuixue,chui xue,Fubuki,fubuki",
        shipType: "驱逐舰",
        rare: false
    },
    "白雪": {
        chineseName: "白雪",
        nameForSearch: "白雪,baixue,bai xue,Shirayuki,shirayuki",
        shipType: "驱逐舰",
        rare: false
    },
    "初雪": {
        chineseName: "初雪",
        nameForSearch: "初雪,chuxue,chu xue,Hatsuyuki,hatsuyuki",
        shipType: "驱逐舰",
        rare: false
    },
    "深雪": {
        chineseName: "深雪",
        nameForSearch: "深雪,shenxue,shen xue,Miyuki,miyuki",
        shipType: "驱逐舰",
        rare: false
    },
    "叢雲": {
        chineseName: "丛云",
        nameForSearch: "丛云,congyun,cong yun,Murakumo,murakumo",
        shipType: "驱逐舰",
        rare: false
    },
    "磯波": {
        chineseName: "矶波",
        nameForSearch: "矶波,jibo,ji bo,Isonami,isonami",
        shipType: "驱逐舰",
        rare: false
    },
    "綾波": {
        chineseName: "绫波",
        nameForSearch: "绫波,lingbo,ling bo,Ayanami,ayanami",
        shipType: "驱逐舰",
        rare: false
    },
    "敷波": {
        chineseName: "敷波",
        nameForSearch: "敷波,fubo,fu bo,Shikinami,shikinami",
        shipType: "驱逐舰",
        rare: false
    },
    "大井": {
        chineseName: "大井",
        nameForSearch: "大井,dajing,da jing,Ooi,ooi",
        shipType: "轻巡洋舰",
        rare: true
    },
    "北上": {
        chineseName: "北上",
        nameForSearch: "北上,beishang,bei shang,Kitakami,kitakami",
        shipType: "轻巡洋舰",
        rare: false
    },
    "金剛": {
        chineseName: "金刚",
        nameForSearch: "金刚,jingang,jin gang,Kongou,kongou",
        shipType: "战舰",
        rare: false
    },
    "比叡": {
        chineseName: "比睿",
        nameForSearch: "比睿,birui,bi rui,Hiei,hiei",
        shipType: "战舰",
        rare: false
    },
    "榛名": {
        chineseName: "榛名",
        nameForSearch: "榛名,zhenming,zhen ming,Haruna,haruna",
        shipType: "战舰",
        rare: false
    },
    "霧島": {
        chineseName: "雾岛",
        nameForSearch: "雾岛,wudao,wu dao,Kirishima,kirishima",
        shipType: "战舰",
        rare: false
    },
    "鳳翔": {
        chineseName: "凤翔",
        nameForSearch: "凤翔,fengxiang,feng xiang,Houshou,houshou",
        shipType: "轻空母",
        rare: false
    },
    "扶桑": {
        chineseName: "扶桑",
        nameForSearch: "扶桑,fusang,fu sang,Fusou,fusou",
        shipType: "战舰",
        rare: false
    },
    "山城": {
        chineseName: "山城",
        nameForSearch: "山城,shancheng,shan cheng,Yamashiro,yamashiro",
        shipType: "战舰",
        rare: false
    },
    "天龍": {
        chineseName: "天龙",
        nameForSearch: "天龙,tianlong,tian long,Tenryuu,tenryuu",
        shipType: "轻巡洋舰",
        rare: false
    },
    "龍田": {
        chineseName: "龙田",
        nameForSearch: "龙田,longtian,long tian,Tatsuta,tatsuta",
        shipType: "轻巡洋舰",
        rare: false
    },
    "龍驤": {
        chineseName: "龙骧",
        nameForSearch: "龙骧,longxiang,long xiang,Ryuujou,ryuujou",
        shipType: "轻空母",
        rare: false
    },
    "睦月": {
        chineseName: "睦月",
        nameForSearch: "睦月,muyue,mu yue,Mutsuki,mutsuki",
        shipType: "驱逐舰",
        rare: false
    },
    "如月": {
        chineseName: "如月",
        nameForSearch: "如月,ruyue,ru yue,Kisaragi,kisaragi",
        shipType: "驱逐舰",
        rare: false
    },
    "皐月": {
        chineseName: "皋月",
        nameForSearch: "皋月,gaoyue,gao yue,Satsuki,satsuki",
        shipType: "驱逐舰",
        rare: false
    },
    "文月": {
        chineseName: "文月",
        nameForSearch: "文月,wenyue,wen yue,Fumizuki,fumizuki",
        shipType: "驱逐舰",
        rare: false
    },
    "長月": {
        chineseName: "长月",
        nameForSearch: "长月,changyue,chang yue,Nagatsuki,nagatsuki",
        shipType: "驱逐舰",
        rare: false
    },
    "菊月": {
        chineseName: "菊月",
        nameForSearch: "菊月,juyue,ju yue,Kikuzuki,kikuzuki",
        shipType: "驱逐舰",
        rare: false
    },
    "三日月": {
        chineseName: "三日月",
        nameForSearch: "三日月,sanriyue,san ri yue,Mikazuki,mikazuki",
        shipType: "驱逐舰",
        rare: false
    },
    "望月": {
        chineseName: "望月",
        nameForSearch: "望月,wangyue,wang yue,Mochizuki,mochizuki",
        shipType: "驱逐舰",
        rare: false
    },
    "球磨": {
        chineseName: "球磨",
        nameForSearch: "球磨,qiumo,qiu mo,Kuma,kuma",
        shipType: "轻巡洋舰",
        rare: false
    },
    "多摩": {
        chineseName: "多摩",
        nameForSearch: "多摩,duomo,duo mo,Tama,tama",
        shipType: "轻巡洋舰",
        rare: false
    },
    "木曾": {
        chineseName: "木曾",
        nameForSearch: "木曾,muzeng,mu zeng,Kiso,kiso",
        shipType: "轻巡洋舰",
        rare: false
    },
    "長良": {
        chineseName: "长良",
        nameForSearch: "长良,changliang,chang liang,Nagara,nagara",
        shipType: "轻巡洋舰",
        rare: false
    },
    "五十鈴": {
        chineseName: "五十铃",
        nameForSearch: "五十铃,wushiling,wu shi ling,500,Isuzu,isuzu",
        shipType: "轻巡洋舰",
        rare: false
    },
    "名取": {
        chineseName: "名取",
        nameForSearch: "名取,mingqu,ming qu,Natori,natori",
        shipType: "轻巡洋舰",
        rare: false
    },
    "由良": {
        chineseName: "由良",
        nameForSearch: "由良,youliang,you liang,Yura,yura",
        shipType: "轻巡洋舰",
        rare: false
    },
    "川内": {
        chineseName: "川内",
        nameForSearch: "川内,chuannei,chuan nei,Sendai,sendai",
        shipType: "轻巡洋舰",
        rare: false
    },
    "神通": {
        chineseName: "神通",
        nameForSearch: "神通,shentong,shen tong,Jintsuu,jintsuu",
        shipType: "轻巡洋舰",
        rare: false
    },
    "那珂": {
        chineseName: "那珂",
        nameForSearch: "那珂,nake,na ke,Naka,naka",
        shipType: "轻巡洋舰",
        rare: false
    },
    "千歳": {
        chineseName: "千岁",
        nameForSearch: "千岁,qiansui,qian sui,Chitose,chitose",
        shipType: "水母",
        rare: false
    },
    "千代田": {
        chineseName: "千代田",
        nameForSearch: "千代田,qiandaitian,qian dai tian,Chiyoda,chiyoda",
        shipType: "水母",
        rare: false
    },
    "最上": {
        chineseName: "最上",
        nameForSearch: "最上,zuishang,zui shang,Mogami,mogami",
        shipType: "重巡洋舰",
        rare: false
    },
    "古鷹": {
        chineseName: "古鹰",
        nameForSearch: "古鹰,guying,gu ying,Furutaka,furutaka",
        shipType: "重巡洋舰",
        rare: false
    },
    "加古": {
        chineseName: "加古",
        nameForSearch: "加古,jiagu,jia gu,Kako,kako",
        shipType: "重巡洋舰",
        rare: false
    },
    "青葉": {
        chineseName: "青叶",
        nameForSearch: "青叶,qingye,qing ye,Aoba,aoba",
        shipType: "重巡洋舰",
        rare: false
    },
    "妙高": {
        chineseName: "妙高",
        nameForSearch: "妙高,miaogao,miao gao,Myoukou,myoukou",
        shipType: "重巡洋舰",
        rare: false
    },
    "那智": {
        chineseName: "那智",
        nameForSearch: "那智,nazhi,na zhi,Nachi,nachi",
        shipType: "重巡洋舰",
        rare: false
    },
    "足柄": {
        chineseName: "足柄",
        nameForSearch: "足柄,zubing,zu bing,Ashigara,ashigara",
        shipType: "重巡洋舰",
        rare: false
    },
    "羽黒": {
        chineseName: "羽黑",
        nameForSearch: "羽黑,yuhei,yu hei,Haguro,haguro",
        shipType: "重巡洋舰",
        rare: false
    },
    "高雄": {
        chineseName: "高雄",
        nameForSearch: "高雄,gaoxiong,gao xiong,Takao,takao",
        shipType: "重巡洋舰",
        rare: false
    },
    "愛宕": {
        chineseName: "爱宕",
        nameForSearch: "爱宕,aidang,ai dang,Atago,atago",
        shipType: "重巡洋舰",
        rare: false
    },
    "摩耶": {
        chineseName: "摩耶",
        nameForSearch: "摩耶,moye,mo ye,Maya,maya",
        shipType: "重巡洋舰",
        rare: false
    },
    "鳥海": {
        chineseName: "鸟海",
        nameForSearch: "鸟海,niaohai,niao hai,Choukai,choukai",
        shipType: "重巡洋舰",
        rare: false
    },
    "利根": {
        chineseName: "利根",
        nameForSearch: "利根,ligen,li gen,Tone,tone",
        shipType: "重巡洋舰",
        rare: false
    },
    "筑摩": {
        chineseName: "筑摩",
        nameForSearch: "筑摩,zhumo,zhu mo,Chikuma,chikuma",
        shipType: "重巡洋舰",
        rare: false
    },
    "飛鷹": {
        chineseName: "飞鹰",
        nameForSearch: "飞鹰,feiying,fei ying,Hiyou,hiyou",
        shipType: "轻空母",
        rare: false
    },
    "隼鷹": {
        chineseName: "隼鹰",
        nameForSearch: "隼鹰,sunying,sun ying,Junyou,junyou",
        shipType: "轻空母",
        rare: false
    },
    "朧": {
        chineseName: "胧",
        nameForSearch: "胧,long,Oboro,oboro",
        shipType: "驱逐舰",
        rare: false
    },
    "曙": {
        chineseName: "曙",
        nameForSearch: "曙,shu,Akebono,akebono",
        shipType: "驱逐舰",
        rare: false
    },
    "漣": {
        chineseName: "涟",
        nameForSearch: "涟,lian,Sazanami,sazanami",
        shipType: "驱逐舰",
        rare: false
    },
    "潮": {
        chineseName: "潮",
        nameForSearch: "潮,chao,Ushio,ushio",
        shipType: "驱逐舰",
        rare: false
    },
    "暁": {
        chineseName: "晓",
        nameForSearch: "晓,xiao,Akatsuki,akatsuki",
        shipType: "驱逐舰",
        rare: false
    },
    "響": {
        chineseName: "响",
        nameForSearch: "响,xiang,Hibiki,hibiki",
        shipType: "驱逐舰",
        rare: false
    },
    "雷": {
        chineseName: "雷",
        nameForSearch: "雷,lei,Ikazuchi,ikazuchi",
        shipType: "驱逐舰",
        rare: false
    },
    "電": {
        chineseName: "电",
        nameForSearch: "电,dian,Inazuma,inazuma",
        shipType: "驱逐舰",
        rare: false
    },
    "初春": {
        chineseName: "初春",
        nameForSearch: "初春,chuchun,chu chun,Hatsuharu,hatsuharu",
        shipType: "驱逐舰",
        rare: false
    },
    "子日": {
        chineseName: "子日",
        nameForSearch: "子日,ziri,zi ri,Nenohi,nenohi",
        shipType: "驱逐舰",
        rare: false
    },
    "若葉": {
        chineseName: "若叶",
        nameForSearch: "若叶,ruoye,ruo ye,Wakaba,wakaba",
        shipType: "驱逐舰",
        rare: false
    },
    "初霜": {
        chineseName: "初霜",
        nameForSearch: "初霜,chushuang,chu shuang,Hatsushimo,hatsushimo",
        shipType: "驱逐舰",
        rare: false
    },
    "白露": {
        chineseName: "白露",
        nameForSearch: "白露,bailu,bai lu,Shiratsuyu,shiratsuyu",
        shipType: "驱逐舰",
        rare: false
    },
    "時雨": {
        chineseName: "时雨",
        nameForSearch: "时雨,shiyu,shi yu,Shigure,shigure",
        shipType: "驱逐舰",
        rare: false
    },
    "村雨": {
        chineseName: "村雨",
        nameForSearch: "村雨,cunyu,cun yu,Murasame,murasame",
        shipType: "驱逐舰",
        rare: false
    },
    "夕立": {
        chineseName: "夕立",
        nameForSearch: "夕立,xili,xi li,poi,Yuudachi,yuudachi",
        shipType: "驱逐舰",
        rare: false
    },
    "五月雨": {
        chineseName: "五月雨",
        nameForSearch: "五月雨,wuyueyu,wu yue yu,Samidare,samidare",
        shipType: "驱逐舰",
        rare: false
    },
    "涼風": {
        chineseName: "凉风",
        nameForSearch: "凉风,liangfeng,liang feng,Suzukaze,suzukaze",
        shipType: "驱逐舰",
        rare: false
    },
    "朝潮": {
        chineseName: "朝潮",
        nameForSearch: "朝潮,zhaochao,zhao chao,Asashio,asashio",
        shipType: "驱逐舰",
        rare: false
    },
    "大潮": {
        chineseName: "大潮",
        nameForSearch: "大潮,dachao,da chao,Ooshio,ooshio",
        shipType: "驱逐舰",
        rare: false
    },
    "満潮": {
        chineseName: "满潮",
        nameForSearch: "满潮,manchao,man chao,Michishio,michishio",
        shipType: "驱逐舰",
        rare: false
    },
    "荒潮": {
        chineseName: "荒潮",
        nameForSearch: "荒潮,huangchao,huang chao,Arashio,arashio",
        shipType: "驱逐舰",
        rare: false
    },
    "霰": {
        chineseName: "霰",
        nameForSearch: "霰,xian,Arare,arare",
        shipType: "驱逐舰",
        rare: false
    },
    "霞": {
        chineseName: "霞",
        nameForSearch: "霞,xia,Kasumi,kasumi",
        shipType: "驱逐舰",
        rare: false
    },
    "陽炎": {
        chineseName: "阳炎",
        nameForSearch: "阳炎,yangyan,yang yan,Kagerou,kagerou",
        shipType: "驱逐舰",
        rare: false
    },
    "不知火": {
        chineseName: "不知火",
        nameForSearch: "不知火,buzhihuo,bu zhi huo,Shiranui,shiranui",
        shipType: "驱逐舰",
        rare: false
    },
    "黒潮": {
        chineseName: "黑潮",
        nameForSearch: "黑潮,heichao,hei chao,Kuroshio,kuroshio",
        shipType: "驱逐舰",
        rare: false
    },
    "祥鳳": {
        chineseName: "祥凤",
        nameForSearch: "祥凤,xiangfeng,xiang feng,Shouhou,shouhou",
        shipType: "轻空母",
        rare: false
    },
    "翔鶴": {
        chineseName: "翔鹤",
        nameForSearch: "翔鹤,xianghe,xiang he,Shoukaku,shoukaku",
        shipType: "空母",
        rare: true
    },
    "瑞鶴": {
        chineseName: "瑞鹤",
        nameForSearch: "瑞鹤,ruihe,rui he,Zuikaku,zuikaku",
        shipType: "空母",
        rare: true
    },
    "鬼怒": {
        chineseName: "鬼怒",
        nameForSearch: "鬼怒,guinu,gui nu,Kinu,kinu",
        shipType: "轻巡洋舰",
        rare: true
    },
    "阿武隈": {
        chineseName: "阿武隈",
        nameForSearch: "阿武隈,awuwei,a wu wei,aww,Abukuma,abukuma",
        shipType: "轻巡洋舰",
        rare: true
    },
    "夕張": {
        chineseName: "夕张",
        nameForSearch: "夕张,xizhang,xi zhang,Yuubari,yuubari",
        shipType: "轻巡洋舰",
        rare: true
    },
    "瑞鳳": {
        chineseName: "瑞凤",
        nameForSearch: "瑞凤,ruifeng,rui feng,Zuihou,zuihou",
        shipType: "轻空母",
        rare: true
    },
    "三隈": {
        chineseName: "三隈",
        nameForSearch: "三隈,sanwei,san wei,Mikuma,mikuma",
        shipType: "重巡洋舰",
        rare: true
    },
    "初風": {
        chineseName: "初风",
        nameForSearch: "初风,chufeng,chu feng,Hatsukaze,hatsukaze",
        shipType: "驱逐舰",
        rare: true
    },
    "舞風": {
        chineseName: "舞风",
        nameForSearch: "舞风,wufeng,wu feng,Maikaze,maikaze",
        shipType: "驱逐舰",
        rare: true
    },
    "衣笠": {
        chineseName: "衣笠",
        nameForSearch: "衣笠,yili,yi li,Kinugasa,kinugasa",
        shipType: "重巡洋舰",
        rare: true
    },
    "伊19": {
        chineseName: "伊19",
        nameForSearch: "伊19,I19,i19,Iku,iku,I-19,i-19",
        shipType: "潜水舰",
        rare: true
    },
    "鈴谷": {
        chineseName: "铃谷",
        nameForSearch: "铃谷,linggu,ling gu,Suzuya,suzuya",
        shipType: "重巡洋舰",
        rare: true
    },
    "熊野": {
        chineseName: "熊野",
        nameForSearch: "熊野,xiongye,xiong ye,Kumano,kumano",
        shipType: "重巡洋舰",
        rare: true
    },
    "伊168": {
        chineseName: "伊168",
        nameForSearch: "伊168,I168,i168,Imuya,imuya,I-168,i-168",
        shipType: "潜水舰",
        rare: true
    },
    "伊58": {
        chineseName: "伊58",
        nameForSearch: "伊58,I58,i58,Goya,goya,I-58,i-58",
        shipType: "潜水舰",
        rare: true
    },
    "伊8": {
        chineseName: "伊8",
        nameForSearch: "伊8,I8,i8,Hachi,hachi,I-8,i-8",
        shipType: "潜水舰",
        rare: true
    },
    "秋雲": {
        chineseName: "秋云",
        nameForSearch: "秋云,qiuyun,qiu yun,Akigumo,akigumo",
        shipType: "驱逐舰",
        rare: true
    },
    "夕雲": {
        chineseName: "夕云",
        nameForSearch: "夕云,xiyun,xi yun,Yuugumo,yuugumo",
        shipType: "驱逐舰",
        rare: true
    },
    "巻雲": {
        chineseName: "卷云",
        nameForSearch: "卷云,juanyun,juan yun,Makigumo,makigumo",
        shipType: "驱逐舰",
        rare: true
    },
    "長波": {
        chineseName: "长波",
        nameForSearch: "长波,changbo,chang bo,Naganami,naganami",
        shipType: "驱逐舰",
        rare: true
    },
    "阿賀野": {
        chineseName: "阿贺野",
        nameForSearch: "阿贺野,aheye,a he ye,Agano,agano",
        shipType: "轻巡洋舰",
        rare: true
    },
    "能代": {
        chineseName: "能代",
        nameForSearch: "能代,nengdai,neng dai,Noshiro,noshiro",
        shipType: "轻巡洋舰",
        rare: true
    },
    "矢矧": {
        chineseName: "矢矧",
        nameForSearch: "矢矧,shishen,shi shen,Yahagi,yahagi",
        shipType: "轻巡洋舰",
        rare: true
    },
    "酒匂": {
        chineseName: "酒匂",
        nameForSearch: "酒匂,jiuxiong,jiu xiong,Sakawa,sakawa",
        shipType: "轻巡洋舰",
        rare: true
    },
    "香取": {
        chineseName: "香取",
        nameForSearch: "香取,xiangqu,xiang qu,Katori,katori",
        shipType: "练习巡洋舰",
        rare: true
    },
    "伊401": {
        chineseName: "伊401",
        nameForSearch: "伊401,I401,i401,Iona,iona,I-401,i-401",
        shipType: "潜水空母",
        rare: true
    },
    "あきつ丸": {
        chineseName: "秋津丸",
        nameForSearch: "秋津丸,qiujinwan,qiu jin wan,Akitsu Maru,akitsu maru",
        shipType: "扬陆舰",
        rare: true
    },
    "まるゆ": {
        chineseName: "丸输",
        nameForSearch: "丸输,wanshu,wan shu,maluyou,ma lu you,Maruyu,maruyu",
        shipType: "潜水舰",
        rare: true
    },
    "弥生": {
        chineseName: "弥生",
        nameForSearch: "弥生,misheng,mi sheng,Yayoi,yayoi",
        shipType: "驱逐舰",
        rare: true
    },
    "卯月": {
        chineseName: "卯月",
        nameForSearch: "卯月,maoyue,mao yue,Uzuki,uzuki",
        shipType: "驱逐舰",
        rare: true
    },
    "磯風": {
        chineseName: "矶风",
        nameForSearch: "矶风,jifeng,ji feng,Isokaze,isokaze",
        shipType: "驱逐舰",
        rare: true
    },
    "浦風": {
        chineseName: "浦风",
        nameForSearch: "浦风,pufeng,pu feng,Urakaze,urakaze",
        shipType: "驱逐舰",
        rare: true
    },
    "谷風": {
        chineseName: "谷风",
        nameForSearch: "谷风,gufeng,gu feng,Tanikaze,tanikaze",
        shipType: "驱逐舰",
        rare: true
    },
    "浜風": {
        chineseName: "滨风",
        nameForSearch: "滨风,binfeng,bin feng,Hamakaze,hamakaze",
        shipType: "驱逐舰",
        rare: true
    },
    "Z1": {
        chineseName: "Z1",
        nameForSearch: "Z1",
        shipType: "驱逐舰",
        rare: true
    },
    "Z3": {
        chineseName: "Z3",
        nameForSearch: "Z3",
        shipType: "驱逐舰",
        rare: true
    },
    "Prinz Eugen": {
        chineseName: "Prinz Eugen",
        nameForSearch: "Prinz Eugen,prinz eugen,prinzeugen,欧根亲王,ougenqinwang,ou gen qin wang",
        shipType: "重巡洋舰",
        rare: true
    },
    "天津風": {
        chineseName: "天津风",
        nameForSearch: "天津风,tianjinfeng,tian jin feng,Amatsukaze,amatsukaze",
        shipType: "驱逐舰",
        rare: true
    },
    "明石": {
        chineseName: "明石",
        nameForSearch: "明石,mingshi,ming shi,Akashi,akashi",
        shipType: "工作舰",
        rare: true
    },
    "大淀": {
        chineseName: "大淀",
        nameForSearch: "大淀,dadian,da dian,Ooyodo,ooyodo",
        shipType: "轻巡洋舰",
        rare: true
    },
    "大鯨": {
        chineseName: "大鲸",
        nameForSearch: "大鲸,dajing,da jing,Taigei,taigei",
        shipType: "潜水母舰",
        rare: true
    },
    "時津風": {
        chineseName: "时津风",
        nameForSearch: "时津风,shijinfeng,shi jin feng,Tokitsukaze,tokitsukaze",
        shipType: "驱逐舰",
        rare: true
    },
    "雲龍": {
        chineseName: "云龙",
        nameForSearch: "云龙,yunlong,yun long,Unryuu,unryuu",
        shipType: "空母",
        rare: true
    },
    "天城": {
        chineseName: "天城",
        nameForSearch: "天城,tiancheng,tian cheng,Amagi,amagi",
        shipType: "空母",
        rare: true
    },
    "葛城": {
        chineseName: "葛城",
        nameForSearch: "葛城,gecheng,ge cheng,Katsuragi,katsuragi",
        shipType: "空母",
        rare: true
    },
    "春雨": {
        chineseName: "春雨",
        nameForSearch: "春雨,chunyu,chun yu,Harusame,harusame",
        shipType: "驱逐舰",
        rare: true
    },
    "早霜": {
        chineseName: "早霜",
        nameForSearch: "早霜,zaoshuang,zao shuang,Hayashimo,hayashimo",
        shipType: "驱逐舰",
        rare: true
    },
    "清霜": {
        chineseName: "清霜",
        nameForSearch: "清霜,qingshuang,qing shuang,Kiyoshimo,kiyoshimo",
        shipType: "驱逐舰",
        rare: true
    },
    "朝雲": {
        chineseName: "朝云",
        nameForSearch: "朝云,zhaoyun,zhao yun,Asagumo,asagumo",
        shipType: "驱逐舰",
        rare: true
    },
    "山雲": {
        chineseName: "山云",
        nameForSearch: "山云,shanyun,shan yun,Yamagumo,yamagumo",
        shipType: "驱逐舰",
        rare: true
    },
    "野分": {
        chineseName: "野分",
        nameForSearch: "野分,yefen,ye fen,Nowaki,nowaki",
        shipType: "驱逐舰",
        rare: true
    },
    "秋月": {
        chineseName: "秋月",
        nameForSearch: "秋月,qiuyue,qiu yue,Akizuki,akizuki",
        shipType: "驱逐舰",
        rare: true
    },
    "高波": {
        chineseName: "高波",
        nameForSearch: "高波,gaobo,gao bo,Takanami,takanami",
        shipType: "驱逐舰",
        rare: true
    },
    "朝霜": {
        chineseName: "朝霜",
        nameForSearch: "朝霜,zhaoshuang,zhao shuang,Asashimo,asashimo",
        shipType: "驱逐舰",
        rare: true
    },
    "U-511": {
        chineseName: "U-511",
        nameForSearch: "U-511,u-511,U511,u511",
        shipType: "潜水舰",
        rare: true
    },
    "Littorio": {
        chineseName: "Littorio",
        nameForSearch: "Littorio,littorio,利托里奥,lituoliao,li tuo li ao",
        shipType: "战舰",
        rare: true
    },
    "Roma": {
        chineseName: "Roma",
        nameForSearch: "Roma,roma,罗马,luoma,luo ma",
        shipType: "战舰",
        rare: true
    },
    "秋津洲": {
        chineseName: "秋津洲",
        nameForSearch: "秋津洲,qiujinzhou,qiu jin zhou,Akitsushima,akitsushima",
        shipType: "水母",
        rare: true
    },
    "瑞穂": {
        chineseName: "瑞穗",
        nameForSearch: "瑞穗,ruisui,rui sui,Mizuho,mizuho",
        shipType: "水母",
        rare: true
    },
    "風雲": {
        chineseName: "风云",
        nameForSearch: "风云,fengyun,feng yun,Kazagumo,kazagumo",
        shipType: "驱逐舰",
        rare: true
    },
    "海風": {
        chineseName: "海风",
        nameForSearch: "海风,haifeng,hai feng,Umikaze,umikaze",
        shipType: "驱逐舰",
        rare: true
    },
    "江風": {
        chineseName: "江风",
        nameForSearch: "江风,jiangfeng,jiang feng,Kawakaze,kawakaze",
        shipType: "驱逐舰",
        rare: true
    },
    "速吸": {
        chineseName: "速吸",
        nameForSearch: "速吸,suxi,su xi,Hayasui,hayasui",
        shipType: "补给舰",
        rare: true
    },
    "Libeccio": {
        chineseName: "Libeccio",
        nameForSearch: "利伯齐奥,liboqiao,li bo qi ao,libeccio",
        shipType: "驱逐舰",
        rare: true
    },
    "照月": {
        chineseName: "照月",
        nameForSearch: "照月,zhaoyue,zhao yue,Teruzuki,teruzuki",
        shipType: "驱逐舰",
        rare: true
    },
    "Graf Zeppelin": {
        chineseName: "Graf Zeppelin",
        nameForSearch: "齐柏林,qibolin,qi bo lin",
        shipType: "空母",
        rare: true
    },
    "萩風": {
        chineseName: "萩风",
        nameForSearch: "萩风,qiufeng,qiu feng",
        shipType: "驱逐舰",
        rare: true
    },
    "嵐": {
        chineseName: "岚",
        nameForSearch: "岚,lan",
        shipType: "驱逐舰",
        rare: true
    }
};

const searchTag = {
    "驱逐舰": ":dd",
    "轻巡洋舰": ":cl",
    "重巡洋舰": ":ca",
    "空母": ":cv",
    "轻空母": ":cvl",
    "战舰": ":bb",
    "潜水舰": ":ss",
    "潜水空母": ":ssv",
    "水母": ":av",
    "扬陆舰": ":lha",
    "工作舰": ":ar",
    "潜水母舰": ":as",
    "练习巡洋舰": ":clp",
    "补给舰": ":ao",
    "稀有": ":稀有,:rare,:sr,:ur"
};

const mapContants = {
    '鎮守府正面海域': '1-1',
    '南西諸島沖': '1-2',
    '製油所地帯沿岸': '1-3',
    '南西諸島防衛線': '1-4',
    '鎮守府近海': '1-5',
    '鎮守府近海航路': '1-6',
    'カムラン半島': '2-1',
    'バシー島沖': '2-2',
    '東部オリョール海': '2-3',
    '沖ノ島海域': '2-4',
    '沖ノ島沖': '2-5',
    'モーレイ海': '3-1',
    'キス島沖': '3-2',
    'アルフォンシーノ方面': '3-3',
    '北方海域全域': '3-4',
    '北方AL海域': '3-5',
    'ジャム島攻略作戦': '4-1',
    'カレー洋制圧戦': '4-2',
    'リランカ島空襲': '4-3',
    'カスガダマ沖海戦': '4-4',
    'カレー洋リランカ島沖': '4-5',
    '南方海域前面': '5-1',
    '珊瑚諸島沖': '5-2',
    'サブ島沖海域': '5-3',
    'サーモン海域': '5-4',
    'サーモン海域北方': '5-5',
    '中部海域哨戒線': '6-1',
    'MS諸島沖': '6-2',
    'グアノ環礁沖海域': '6-3',
    'ショートランド沖': '2015年夏季活动/主作战#E-1',
    'ソロモン海': '2015年夏季活动/主作战#E-2',
    '南太平洋海域': '2015年夏季活动/主作战#E-3',
    'アイアンボトムサウンド': '2015年夏季活动/主作战#E-4',
    '西方海域戦線 カレー洋': '2015年夏季活动/扩展作战#E-5',
    'ソロモン海東部海域': '2015年夏季活动/扩展作战#E-6',
    'FS方面海域': '2015年夏季活动/扩展作战#E-7',
    'ショートランド泊地沖': '2015年秋季活动/E-1',
    'コロネハイカラ島沖': '2015年秋季活动/E-2',
    'コロネハイカラ島東方沖': '2015年秋季活动/E-3',
    '西方海域戦線 ステビア海': '2015年秋季活动/E-4',
    'バニラ湾沖': '2015年秋季活动/E-5',
};

const getShipRare = ship => ship == null ? false : constants[ship] ? constants[ship].rare : true;

module.exports={
  getShipRare
}