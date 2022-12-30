var MongoClient = require('mongodb').MongoClient;
var mongourl = 'mongodb://192.168.17.236:27050/db_kancolle_senka';
var request = require('request');
var Axios = require('axios');
var fs = require('fs');
var http = require('http');
var gm = require('gm')
var imageMagick = gm.subClass({ imageMagick : true });
var {sendGmImage} = require('../../cq/sendImage');
var path = require('path');
//var {sendGmImage} = require('../../../cq/sendImage');


var monthOfDay=[31,28,31,30,31,30,31,31,30,31,30,31];
var u = {};
var c = {};
var memory = {};
var usermap = {};
var udb;

function connectMongo(){
    MongoClient.connect(mongourl, (err, db) => {
        udb=db;
    })
}
connectMongo();


//for(var i=0;i<2500;i++){rr=rr+','+'"'+($ships[i]?$ships[i].api_name:'')+'"'}

var shipid2name=["","睦月","如月","","","","長月","三日月","","吹雪","白雪","深雪","磯波","綾波","敷波","曙","潮","陽炎","不知火","黒潮","雪風","長良","五十鈴","由良","大井","北上","扶桑","山城","皐月","文月","菊月","望月","初雪","叢雲","暁","響","雷","電","初春","子日","若葉","初霜","白露","時雨","村雨","夕立","五月雨","涼風","霰","霞","島風","天龍","龍田","名取","川内","神通","那珂","大井改","北上改","古鷹","加古","青葉","妙高","那智","足柄","羽黒","高雄","愛宕","摩耶","鳥海","最上","利根","筑摩","最上改","祥鳳","飛鷹","龍驤","伊勢","金剛","榛名","長門","陸奥","伊勢改","赤城","加賀","霧島","比叡","日向","日向改","鳳翔","蒼龍","飛龍","隼鷹","朧","漣","朝潮","大潮","満潮","荒潮","球磨","多摩","木曾","千歳","千代田","千歳改","千代田改","千歳甲","千代田甲","千歳航","千代田航","翔鶴","瑞鶴","瑞鶴改","鬼怒","阿武隈","夕張","瑞鳳","瑞鳳改","大井改二","北上改二","三隈","三隈改","舞風","衣笠","鈴谷","熊野","伊168","伊58","伊8","鈴谷改","熊野改","大和","秋雲","夕雲","巻雲","長波","大和改","阿賀野","能代","矢矧","酒匂","五十鈴改二","衣笠改二","武蔵","夕立改二","時雨改二","木曾改二","Верный","武蔵改","金剛改二","比叡改二","榛名改二","霧島改二","大鳳","香取","伊401","大鳳改","龍驤改二","川内改二","神通改二","那珂改二","あきつ丸","神威","まるゆ","弥生","卯月","あきつ丸改","磯風","浦風","谷風","浜風","Bismarck","Bismarck改","Bismarck zwei","Z1","Z3","Prinz Eugen","Prinz Eugen改","Bismarck drei","Z1 zwei","Z3 zwei","天津風","明石","大淀","大鯨","龍鳳","時津風","明石改","利根改二","筑摩改二","初風","伊19","那智改二","足柄改二","羽黒改二","綾波改二","飛龍改二","蒼龍改二","霰改二","大潮改二","阿武隈改二","吹雪改","白雪改","初雪改","深雪改","叢雲改","磯波改","綾波改","敷波改","金剛改","比叡改","榛名改","霧島改","天龍改","龍田改","球磨改","多摩改","木曾改","長良改","五十鈴改","由良改","名取改","川内改","神通改","那珂改","陽炎改","不知火改","黒潮改","雪風改","島風改","朧改","曙改","漣改","潮改","暁改","響改","雷改","電改","初春改","子日改","若葉改","初霜改","白露改","時雨改","村雨改","夕立改","五月雨改","涼風改","朝潮改","大潮改","満潮改","荒潮改","霰改","霞改","睦月改","如月改","皐月改","文月改","長月改","菊月改","三日月改","望月改","古鷹改","加古改","青葉改","妙高改","那智改","足柄改","羽黒改","高雄改","愛宕改","摩耶改","鳥海改","利根改","筑摩改","長門改","陸奥改","赤城改","加賀改","蒼龍改","飛龍改","龍驤改","祥鳳改","飛鷹改","隼鷹改","鳳翔改","扶桑改","山城改","翔鶴改","鬼怒改","阿武隈改","千歳航改","千代田航改","夕張改","舞風改","衣笠改","千歳航改二","千代田航改二","","Scamp","初風改","秋雲改","夕雲改","巻雲改","長波改","阿賀野改","能代改","矢矧改","弥生改","卯月改","Z1改","Z3改","浜風改","谷風改","酒匂改","","天津風改","浦風改","龍鳳改","妙高改二","磯風改","大淀改","時津風改","春雨改","早霜改","清霜改","初春改二","朝雲改","山雲改","野分改","秋月改","天城","葛城","","U-511改","","","","","","","","","香取改","朝霜改","高波改","照月改","Libeccio改","瑞穂改","風雲改","海風改","江風改","速吸改","Graf Zeppelin改","嵐改","萩風改","鹿島改","初月改","Zara改","沖波改","Iowa改","Pola改","親潮改","春風改","Warspite改","Aquila改","水無月改","伊26改","浦波改","山風改","朝風改","松風改","Commandant Teste改","藤波改","伊13改","伊14改","占守改","国後改","八丈改","石垣改","大鷹改","神鷹改","雲鷹改","択捉改","松輪改","佐渡改","対馬改","旗風改","","","天霧改","狭霧改","Richelieu改","Ark Royal改","Jervis改","Ташкент改","Gambier Bay改","Intrepid改","伊168改","伊58改","伊8改","伊19改","まるゆ改","伊401改","雲龍","春雨","雲龍改","潮改二","隼鷹改二","早霜","清霜","扶桑改二","山城改二","朝雲","山雲","野分","古鷹改二","加古改二","皐月改二","初霜改二","叢雲改二","秋月","照月","初月","高波","朝霜","吹雪改二","鳥海改二","摩耶改二","天城改","葛城改","U-511","Graf Zeppelin","Saratoga","睦月改二","如月改二","呂500","暁改二","Saratoga改","Warspite","Iowa","Littorio","Roma","Libeccio","Aquila","秋津洲","Italia","Roma改","Zara","Pola","秋津洲改","瑞穂","沖波","風雲","嵐","萩風","親潮","山風","海風","江風","速吸","翔鶴改二","瑞鶴改二","朝潮改二","霞改二","鹿島","翔鶴改二甲","瑞鶴改二甲","朝潮改二丁","江風改二","霞改二乙","神風","朝風","春風","松風","旗風","神風改","天龍改二","龍田改二","天霧","狭霧","水無月","","伊26","浜波","藤波","浦波","鬼怒改二","由良改二","満潮改二","荒潮改二","Commandant Teste","Richelieu","伊400","伊13","伊14","Zara due","白露改二","村雨改二","神威改","神威改母","最上改二","","鈴谷改二","熊野改二","","最上改二特","","鈴谷航改二","熊野航改二","","Гангут","Октябрьская революция","Гангут два","Sheffield","Ark Royal","Ташкент","占守","国後","Jervis","Janus","春日丸","八幡丸","","択捉","松輪","大鷹","岸波","早波","大鷹改二","伊504","佐渡","涼月","冬月","神鷹","Luigi Torelli","神鷹改二","涼月改","冬月改","UIT-25","対馬","長門改二","夕雲改二","長波改二","Gambier Bay","Saratoga Mk.II","武蔵改二","多摩改二","文月改二","Intrepid","Saratoga Mk.II Mod.2","日振","大東","伊勢改二","日向改二","瑞鳳改二","浦風丁改","磯風乙改","浜風乙改","谷風丁改","瑞鳳改二乙","Samuel B.Roberts","Johnston","巻雲改二","風雲改二","福江","陽炎改二","不知火改二","黒潮改二","沖波改二","平戸","Nelson","","陸奥改二","Gotland","Maestrale","Nelson改","","朝霜改二","Gotland改","Maestrale改","日進","夏雲","峯雲","八丈","石垣","日進甲","海風改二","山風改二","L.d.S.D.d.Abruzzi","G.Garibaldi","金剛改二丙","比叡改二丙","","赤城改二","Houston","Fletcher","Atlanta","Honolulu","赤城改二戊","Houston改","Colorado","South Dakota","Hornet","De Ruyter","Luigi Torelli改","伊400改","伊47改","","De Ruyter改","加賀改二戊","御蔵","屋代","Perth","Grecale","Helena","御蔵改","屋代改","Perth改","Grecale改","Helena改","神州丸","夕張改二","夕張改二特","夕張改二丁","秋霜","神州丸改","敷波改二","Fletcher改 Mod.2","Fletcher Mk.II","Gotland andra","薄雲","有明","","迅鯨","長鯨","伊47","第四号海防艦","第三〇号海防艦","迅鯨改","長鯨改","松","竹","梅","桃","宗谷","加賀改二護","浦波改二","秋雲改二","高波改二","宗谷","丹陽","球磨改二","Scirocco","Washington","Northampton","雪風改二","球磨改二丁","Scirocco改","Washington改","Northampton改","","能代改二","矢矧改二","","曙改二","磯波改二","山風改二丁","矢矧改二乙","","親潮改二","巻波","","","玉波","涼波","","","日振改","大東改","浜波改","Samuel B.Roberts改","","","平戸改","福江改","岸波改","峯雲改","早波改","Johnston改","日進改","G.Garibaldi改","Fletcher改","L.d.S.D.d.Abruzzi改","","秋霜改","Atlanta改","South Dakota改","加賀改二","宗谷","薄雲改","第四号海防艦改","松改","有明改","Hornet改","Sheffield改","竹改","Gambier Bay Mk.II","桃改","巻波改","涼波改","Honolulu改","第三〇号海防艦改","Victorious改","昭南改","Scamp改","梅改","山汐丸改","玉波改","伊201改","早潮改","夏雲改","Brooklyn改","Ranger改","Jean Bart改","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","Conte di Cavour","Conte di Cavour改","Conte di Cavour nuovo","","伊201","伊203","龍鳳改二戊","雲鷹","Victorious","早潮","伊203改","龍鳳改二","雲鷹改二","","","","Janus改","鳳翔改二","昭南","Brooklyn","","","鳳翔改二戦","山汐丸","","","天霧改二","","倉橋","","","天霧改二丁","","倉橋改","大和改二","","Maryland","","早潮改二","大和改二重","","Maryland改","","Samuel B.Roberts Mk.II","鵜来","","","","Langley","鵜来改","","","","Langley改","Ranger","","Massachusetts","","Jean Bart","","","Massachusetts改","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","Colorado改","","","","","駆逐イ級","駆逐ロ級","駆逐ハ級","駆逐ニ級","軽巡ホ級","軽巡ヘ級","軽巡ト級","雷巡チ級","重巡リ級","軽母ヌ級","戦艦ル級","空母ヲ級","輸送ワ級","駆逐イ級","駆逐ロ級","駆逐ハ級","駆逐ニ級","軽巡ホ級","軽巡ヘ級","軽巡ト級","雷巡チ級","重巡リ級","軽母ヌ級","戦艦ル級","空母ヲ級","輸送ワ級","重巡リ級","空母ヲ級","戦艦ル級","潜水カ級","潜水ヨ級","潜水カ級","潜水ヨ級","潜水カ級","潜水ヨ級","浮遊要塞","浮遊要塞","浮遊要塞","泊地棲鬼","泊地棲姫","戦艦タ級","戦艦タ級","戦艦タ級","装甲空母鬼","装甲空母姫","南方棲鬼","南方棲戦鬼","南方棲戦姫","護衛要塞","護衛要塞","護衛要塞","駆逐ロ級","駆逐ハ級","軽巡ホ級","軽巡ヘ級","飛行場姫","戦艦棲姫","輸送ワ級","雷巡チ級","軽母ヌ級","戦艦レ級","戦艦レ級","","駆逐イ級","空母ヲ級改","重巡リ級改","戦艦ル級改","","","潜水ソ級","潜水ソ級","潜水ソ級","港湾棲姫","離島棲鬼","駆逐イ級後期型","駆逐ロ級後期型","駆逐ハ級後期型","駆逐ニ級後期型","空母ヲ級","","北方棲姫","北方棲姫","中間棲姫","中間棲姫","空母棲鬼","空母棲姫","北方棲姫","北方棲姫","北方棲姫","北方棲姫","軽巡ツ級","軽巡ツ級","","重巡ネ級","重巡ネ級","","駆逐棲姫","駆逐棲姫","空母水鬼","空母水鬼","軽巡棲鬼","軽巡棲鬼","戦艦水鬼","戦艦水鬼","港湾水鬼","港湾水鬼","港湾水鬼","港湾水鬼","泊地水鬼","泊地水鬼","泊地水鬼","泊地水鬼","港湾棲姫","空母ヲ級","空母ヲ級","空母ヲ級改","空母ヲ級改","空母ヲ級改","空母棲鬼","空母棲姫","駆逐イ級後期型","駆逐ロ級後期型","駆逐ハ級後期型","駆逐ニ級後期型","水母棲姫","水母棲姫","水母棲姫","防空棲姫","防空棲姫","防空棲姫","飛行場姫","飛行場姫","飛行場姫","離島棲鬼","離島棲鬼","離島棲鬼","PT小鬼群","PT小鬼群","PT小鬼群","PT小鬼群","軽巡棲姫","軽巡棲姫","軽巡棲姫","潜水棲姫","潜水棲姫","潜水棲姫","駆逐水鬼","駆逐水鬼","駆逐水鬼","飛行場姫","飛行場姫","飛行場姫","集積地棲姫","集積地棲姫","集積地棲姫","集積地棲姫-壊","集積地棲姫-壊","集積地棲姫-壊","重巡棲姫","重巡棲姫","重巡棲姫","重巡棲姫","重巡棲姫","重巡棲姫","砲台小鬼","砲台小鬼","砲台小鬼","離島棲姫","離島棲姫","離島棲姫","離島棲姫","離島棲姫","駆逐古鬼","駆逐古鬼","駆逐古鬼","駆逐水鬼","駆逐水鬼","駆逐水鬼","リコリス棲姫","リコリス棲姫","リコリス棲姫","リコリス棲姫","リコリス棲姫","中枢棲姫","中枢棲姫","中枢棲姫","中枢棲姫-壊","中枢棲姫-壊","中枢棲姫-壊","駆逐古姫","駆逐古姫","駆逐古姫","潜水夏姫","潜水夏姫","潜水夏姫","戦艦夏姫","戦艦夏姫","戦艦夏姫","港湾夏姫","港湾夏姫","港湾夏姫","港湾夏姫-壊","港湾夏姫-壊","港湾夏姫-壊","重巡夏姫","重巡夏姫","重巡夏姫","水母水姫","水母水姫","水母水姫","深海海月姫","深海海月姫","深海海月姫","空母ヲ級改","空母ヲ級改","深海双子棲姫","深海双子棲姫","深海双子棲姫","深海双子棲姫-壊","深海双子棲姫-壊","深海双子棲姫-壊","護衛棲姫","護衛棲姫","護衛棲姫","北端上陸姫","北端上陸姫","北端上陸姫","北方水姫","北方水姫","北方水姫","北方水姫-壊","北方水姫-壊","北方水姫-壊","軽母ヌ級改","軽母ヌ級改","潜水新棲姫","潜水新棲姫","潜水新棲姫","駆逐ナ級","駆逐ナ級","駆逐ナ級","駆逐ナ級後期型","駆逐ナ級後期型","駆逐ナ級後期型","戦艦仏棲姫","戦艦仏棲姫","戦艦仏棲姫","戦艦仏棲姫-壊","戦艦仏棲姫-壊","戦艦仏棲姫-壊","空母夏鬼","空母夏姫","集積地夏姫","集積地夏姫","欧州棲姫","欧州棲姫","欧州棲姫","欧州棲姫-壊","欧州棲姫-壊","欧州棲姫-壊","重巡ネ級","軽母ヌ級","軽母ヌ級","軽母ヌ級","軽母ヌ級改","軽母ヌ級改","海峡夜棲姫","海峡夜棲姫","海峡夜棲姫","海峡夜棲姫-壊","海峡夜棲姫-壊","海峡夜棲姫-壊","防空埋護姫","防空埋護姫","防空埋護姫","軽母ヌ級","軽母ヌ級","軽母ヌ級改","軽母ヌ級改","軽母ヌ級改","空母棲姫","空母棲姫","護衛棲水姫","護衛棲水姫","護衛棲水姫","護衛棲水姫-壊","護衛棲水姫-壊","護衛棲水姫-壊","潜水新棲姫","戦艦棲姫改","戦艦棲姫改","戦艦棲姫改","戦艦水鬼改","戦艦水鬼改","戦艦水鬼改","戦艦水鬼改-壊","戦艦水鬼改-壊","戦艦水鬼改-壊","深海鶴棲姫","深海鶴棲姫","深海鶴棲姫","深海鶴棲姫-壊","深海鶴棲姫-壊","深海鶴棲姫-壊","潜水新棲姫 バカンスmode","潜水新棲姫 バカンスmode","潜水新棲姫 バカンスmode","潜水新棲姫 バカンスmode","集積地棲姫 バカンスmode","集積地棲姫 バカンスmode","集積地棲姫 バカンスmode","集積地棲姫 バカンスmode-壊","集積地棲姫 バカンスmode-壊","集積地棲姫 バカンスmode-壊","泊地水鬼 バカンスmode","泊地水鬼 バカンスmode","泊地水鬼 バカンスmode","泊地水鬼 バカンスmode","泊地水鬼 バカンスmode","泊地水鬼 バカンスmode","護衛独還姫","護衛独還姫","護衛独還姫","護衛独還姫-壊","護衛独還姫-壊","護衛独還姫-壊","船渠棲姫","船渠棲姫","船渠棲姫","船渠棲姫-壊","船渠棲姫-壊","船渠棲姫-壊","","戦艦仏棲姫 バカンスmode","戦艦仏棲姫 バカンスmode","戦艦仏棲姫 バカンスmode","戦艦仏棲姫-壊 バカンスmode","戦艦仏棲姫-壊 バカンスmode","戦艦仏棲姫-壊 バカンスmode","欧州水姫","欧州水姫","欧州水姫","欧州水姫-壊","欧州水姫-壊","欧州水姫-壊","深海雨雲姫","深海雨雲姫","深海雨雲姫","深海雨雲姫-壊","深海雨雲姫-壊","深海雨雲姫-壊","深海日棲姫","深海日棲姫","深海日棲姫","深海日棲姫-壊","深海日棲姫-壊","深海日棲姫-壊","駆逐ニ級改","駆逐ニ級改後期型","駆逐ニ級改後期型","駆逐ニ級改後期型","軽巡ツ級","重巡棲姫","重巡棲姫","北方棲妹","北方棲妹","北方棲妹","北方棲妹-壊","北方棲妹-壊","北方棲妹-壊","太平洋深海棲姫","太平洋深海棲姫","太平洋深海棲姫","太平洋深海棲姫-壊","太平洋深海棲姫-壊","太平洋深海棲姫-壊","深海地中海棲姫","深海地中海棲姫","深海地中海棲姫","深海地中海棲姫-壊","深海地中海棲姫-壊","深海地中海棲姫-壊","アンツィオ沖棲姫","アンツィオ沖棲姫","アンツィオ沖棲姫","アンツィオ沖棲姫-壊","アンツィオ沖棲姫-壊","アンツィオ沖棲姫-壊","飛行場姫","飛行場姫","飛行場姫","飛行場姫","飛行場姫","飛行場姫","重巡ネ級改","重巡ネ級改","重巡ネ級改","バタビア沖棲姫","バタビア沖棲姫","バタビア沖棲姫","バタビア沖棲姫-壊","バタビア沖棲姫-壊","バタビア沖棲姫-壊","軽巡ヘ級改","軽巡ヘ級改","空母棲姫改","空母棲姫改","空母棲姫改","防空巡棲姫","防空巡棲姫","防空巡棲姫","防空巡棲姫-壊","防空巡棲姫-壊","防空巡棲姫-壊","潜水棲姫改","潜水棲姫改","潜水棲姫改","潜水棲姫改-壊","潜水棲姫改-壊","潜水棲姫改-壊","集積地棲姫II","集積地棲姫II","集積地棲姫II","集積地棲姫II-壊","集積地棲姫II-壊","集積地棲姫II-壊","深海千島棲姫","深海千島棲姫","深海千島棲姫","深海千島棲姫-壊","深海千島棲姫-壊","深海千島棲姫-壊","集積地棲姫II 夏季上陸mode","集積地棲姫II 夏季上陸mode","集積地棲姫II 夏季上陸mode","集積地棲姫II 夏季上陸mode-壊","集積地棲姫II 夏季上陸mode-壊","集積地棲姫II 夏季上陸mode-壊","五島沖海底姫","五島沖海底姫","五島沖海底姫","五島沖海底姫-壊","五島沖海底姫-壊","五島沖海底姫-壊","駆逐林棲姫","駆逐林棲姫","駆逐林棲姫","駆逐林棲姫-壊","駆逐林棲姫-壊","駆逐林棲姫-壊","駆逐ナ級後期型II","駆逐ナ級後期型II","重巡ネ級改 夏mode","重巡ネ級改 夏mode","重巡ネ級改 夏mode","重巡ネ級改II 夏mode","軽巡棲姫II","軽巡棲姫II","軽巡棲姫II","軽巡棲姫II","空母夏姫","空母夏姫","空母夏姫","空母夏姫II","南方戦艦新棲姫","南方戦艦新棲姫","南方戦艦新棲姫","南方戦艦新棲姫-壊","南方戦艦新棲姫-壊","南方戦艦新棲姫-壊","南太平洋空母棲姫","南太平洋空母棲姫","南太平洋空母棲姫","南太平洋空母棲姫-壊","南太平洋空母棲姫-壊","南太平洋空母棲姫-壊","潜水夏姫II","潜水夏姫II","戦艦新棲姫","戦艦新棲姫","戦艦新棲姫","戦艦新棲姫-壊","戦艦新棲姫-壊","戦艦新棲姫-壊","潜水棲姫改II","潜水棲姫改II","潜水棲姫改II","深海竹棲姫","深海竹棲姫","深海竹棲姫","深海竹棲姫-壊","深海竹棲姫-壊","深海竹棲姫-壊","集積地棲姫II","集積地棲姫II-壊","潜水棲姫改II","空母棲姫改","軽巡ト級","重巡リ級II","ルンガ沖重巡棲姫","ルンガ沖重巡棲姫","ルンガ沖重巡棲姫","ルンガ沖重巡棲姫-壊","ルンガ沖重巡棲姫-壊","ルンガ沖重巡棲姫-壊","軽巡新棲姫","軽巡新棲姫","軽巡新棲姫","軽巡新棲姫-壊","軽巡新棲姫-壊","軽巡新棲姫-壊","軽巡ト級","輸送ワ級II","輸送ワ級II","集積地棲姫II バカンスmode","集積地棲姫II バカンスmode","集積地棲姫II バカンスmode","集積地棲姫II バカンスmode","集積地棲姫II バカンスmode-壊","集積地棲姫II バカンスmode-壊","集積地棲姫II バカンスmode-壊","集積地棲姫II バカンスmode-壊","港湾夏姫II","港湾夏姫II","港湾夏姫II","港湾夏姫II-壊","港湾夏姫II-壊","港湾夏姫II-壊","地中海弩級水姫","地中海弩級水姫","地中海弩級水姫","地中海弩級水姫-壊","地中海弩級水姫-壊","地中海弩級水姫-壊","深海地中海棲姫 バカンスmode","深海地中海棲姫 バカンスmode","深海地中海棲姫 バカンスmode","深海地中海棲姫 バカンスmode-壊","深海地中海棲姫 バカンスmode-壊","深海地中海棲姫 バカンスmode-壊","欧州装甲空母棲姫","欧州装甲空母棲姫","欧州装甲空母棲姫","欧州装甲空母棲姫-壊","欧州装甲空母棲姫-壊","欧州装甲空母棲姫-壊","飛行場姫","飛行場姫","潜水新棲姫","駆逐ナ級IIe(量産型)","駆逐ナ級IIe(量産型)","駆逐ナ級IIe(量産型)","潜水鮫水鬼","潜水鮫水鬼","潜水鮫水鬼","潜水鮫水鬼-壊","潜水鮫水鬼-壊","潜水鮫水鬼-壊","ヒ船団棲姫","ヒ船団棲姫","ヒ船団棲姫-壊","ヒ船団棲姫-壊","深海梅棲姫","深海梅棲姫","深海梅棲姫","深海梅棲姫-壊","深海梅棲姫-壊","深海梅棲姫-壊","横浜岸壁棲姫","横浜岸壁棲姫","横浜岸壁棲姫-壊","横浜岸壁棲姫-壊","深海玉棲姫","深海玉棲姫","深海玉棲姫-壊","深海玉棲姫-壊","超重爆飛行場姫","超重爆飛行場姫","超重爆飛行場姫","防空埋護冬姫","防空埋護冬姫","防空埋護冬姫-壊","防空埋護冬姫-壊","集積地棲姫III","集積地棲姫III-壊","集積地棲姫III","集積地棲姫III-壊","集積地棲姫III","集積地棲姫III-壊","重巡ネ級改","飛行場姫(哨戒機配備)","飛行場姫(哨戒機配備)","飛行場姫(哨戒機配備)","飛行場姫","飛行場姫","飛行場姫","外南洋駆逐棲姫","外南洋駆逐棲姫","外南洋駆逐棲姫-壊","外南洋駆逐棲姫-壊","軽母ヌ級II","軽母ヌ級II","軽母ヌ級II","軽母ヌ級II","空母棲姫II","空母棲姫II","空母棲姫II","空母棲姫II","近代化戦艦棲姫","近代化戦艦棲姫","近代化戦艦棲姫","近代化戦艦棲姫-壊","近代化戦艦棲姫-壊","近代化戦艦棲姫-壊","空母ヲ級改II","空母ヲ級改II","空母夏姫II","空母夏姫II","空母夏姫II","高速軽空母水鬼","高速軽空母水鬼","高速軽空母水鬼","高速軽空母水鬼-壊","高速軽空母水鬼-壊","高速軽空母水鬼-壊","試作空母姫 バカンスmode","試作空母姫 バカンスmode","試作空母姫 バカンスmode","試作空母姫 バカンスmode-壊","試作空母姫 バカンスmode-壊","試作空母姫 バカンスmode-壊","戦艦未完棲姫","戦艦未完棲姫","戦艦未完棲姫","戦艦未完棲姫-壊","戦艦未完棲姫-壊","戦艦未完棲姫-壊","集積地棲姫III バカンスmode","集積地棲姫III バカンスmode-壊","集積地棲姫III バカンスmode","集積地棲姫III バカンスmode-壊","集積地棲姫III バカンスmode","集積地棲姫III バカンスmode-壊","集積地棲姫III バカンスmode","集積地棲姫III バカンスmode-壊","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","","",""];

var token = 'ecd37b81c06bd22f990c0ba69729bf3cddfa91c6';

function getUserInfo(uuid,callback,noproxy){
  if(!uuid){
    return;
  }
  console.log('now:'+uuid+':'+noproxy);
  var uud = uuid;
  var nn = new Date();
  var year = nn.getFullYear();
  var month = nn.getMonth()+1;
  var dateno = getDateNo(nn.getTime());
  var hour = nn.getHours();
  var key = year+'_'+month+'_'+dateno+'_'+hour;
  var now = nn.getTime();
  var url = 'http://203.104.209.199/kcsapi/api_req_member/get_practice_enemyinfo';
  var req = {
      url: url,
      method: "POST",
      headers:{
          'Content-Type': 'application/x-www-form-urlencoded',
          'Referer':'http://203.104.209.199/kcs2/index.php?api_root=/kcsapi&voice_root=/kcs/sound&osapi_root=osapi.dmm.com&version=5.1.4.1&api_token='+token+'&api_starttime='+now,
          'User-Agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.99 Safari/537.36'
      },
      body:'api_token='+token+'&api_verno=1&api_member_id='+uuid
  }    
  if(noproxy==1){
    req.proxy = 'http://192.168.17.236:2346'
  }else if(noproxy==2){
    req.proxy = 'http://192.168.17.241:2346'
  }else if(noproxy==4){
    req.proxy = 'http://192.168.17.236:2346'
  }else if(noproxy==5){
    req.proxy = 'http://192.168.17.241:2346'
  }else if(noproxy==6){
    callback({});
    return;
  }
    
  request(req, function(error, response, body){
      if(error&&error.code){
        console.log('pipe error catched!')
        console.log(error);
        if(noproxy==undefined){
          noproxy=0;
        }
        var delay = noproxy?(1000*noproxy+2000):1000
        setTimeout(function(){
          getUserInfo(uuid,callback,noproxy+1)
          if(noproxy>6){
            callback({})
            return;
          }
        },delay);
      }else{
        if(body.startsWith("svdata=")){
          body=body.substring(7);
        }
        try {
            try{
                eval('('+body+')')
            }
            catch(ee){
                if(noproxy==undefined){
                  noproxy=0;
                }
                var delay = noproxy?(1000*noproxy+2000):1000
                console.log('bdy:\n'+body)
                setTimeout(function(){
                    getUserInfo(uuid,callback,noproxy+1)
                    if(noproxy>6){
                        callback({})
                    }
                },delay);
                return;
            }
          var dat = eval('('+body+')');
          var data = dat.api_data;
          var uid = data.api_member_id;
          var name = data.api_nickname;
          var exp = data.api_experience[0];
          var exps = (exp*7/10000).toFixed(1);
          var cmt = data.api_cmt;
          var ships = data.api_deck.api_ships;
          var cl_senka_8=udb.collection("cl_senka_8");
          cl_senka_8.find({'_id':uid}).toArray(function(err,arr){
            if(arr&&arr[0]){
              var rr = arr[0];
              var dd = rr.d;
              if(dd[key]){
                cl_senka_8.updateOne({'_id':uid},{'$set':{e:exp,cmt:cmt,ts:now,tse:nn}});
              }else{
                dd[key]=exp;
                cl_senka_8.updateOne({'_id':uid},{'$set':{d:dd,e:exp,cmt:cmt,ts:now,tse:nn}});
              }
            }else{
              var dd = {};
              dd[key]=exp;
              var init = {'_id':uid,e:exp,n:name,d:dd,cmt:cmt,ts:now,tse:nn};
              console.log(init);
              cl_senka_8.insert(init);
            }
          })
          var shipstr = '';
          for(var i=0;i<ships.length;i++){
            var shipid = ships[i].api_id;
            if(shipid>0){
              shipstr=shipstr+shipid2name[ships[i].api_ship_id]+" \t Lv:"+ships[i].api_level+"\n"
            }
          }
          shipstr+shipstr.trim();
          var ret = '';
          //ret = ret + name + "  【ID:"+data.api_member_id+"】\n";
          var rrr = {};
          rrr.exp=exp;
          rrr.ship=shipstr;
          rrr.cmt=cmt;
          ret = ret + name + "  \n";

          ret = ret + '经验值：【'+exp+'】\t 经验战果值：【'+exps+'】\n'
          ret = ret + cmt + '\n';
          ret = ret + shipstr;
          callback(rrr);
        }catch(e){
          console.log('error!!!!'+uuid)
          console.log(body);
          console.log(e);

          callback({})
        }

      }
  })
}






getDateNo = function(now){
  now = new Date(new Date(now).getTime()+(new Date().getTimezoneOffset()+480)*60000)
  var date = now.getDate()
  var hour = now.getHours()
  if(hour<1){
    date = date -1
    hour = hour + 24
  }
  const no = (date-1)*2+((hour>=13)?1:0)
  return no
}

getRankDateNo = function(now){
  now = new Date(new Date(now).getTime()+(new Date().getTimezoneOffset()+480)*60000)
  var date = now.getDate()
  var hour = now.getHours()
  if(hour<2){
    date = date -1
    hour = hour + 24
  }
  const no = (date-1)*2+((hour>=14)?1:0)
  return no
}


module.exports={
    getUserInfo
}


// function go(){
//   setTimeout(function(){
//     getUserInfo(8172923
//       ,function(r){
//
//       })
//     getUserInfo(8177405
//       ,function(r){
//
//       })
//   },2000)
// }

// function rk(){
//   setTimeout(function(){
//     getRank(1,[]);
//   },2000);
// }


function rd(x){
  return Math.floor(Math.random()*x);
}


var PORT_API_SEED = [4173, 9138, 6135, 4753, 5253, 7799, 4321, 2974, 7173, 9863]
function generateRankKey(userid){
  var t=userid;
  var e = PORT_API_SEED[t%10];
  var i = Math.floor(new Date().getTime()/ 1000);
  var n = 1000 * (rd(9) + 1) + t % 1000;
  var o = rd(8999) + 1000;
  var r = rd(32767) + 32768;
  var s = rd(10);
  var a = rd(10);
  var _ = rd(10);
  var u = parseInt((t+"").substring(0, 4));
  var l = (4132653 + r) * (u + 1000) - i + (1875979 + 9 * r);
  var c = l - t;
  var h = c * e;
  var p = ""+n + ""+h+"" + o;
  p = s+"" + p;
  var d = p.substring(0, 8);
  var f = p.substring(8);
  p = d + a + f;
  d = p.substring(0, 18);
  f = p.substring(18);
  p = d + _ + f;
  return p + r;
}


var MAGIC_R_NUMS = [8931, 1201, 1156, 5061, 4569, 4732, 3779, 4568, 5695, 4619, 4912, 5669, 6586 ];
function getRank(page,retarr,proxy){
  console.log('will get rank:'+page+':'+proxy);
  var url = 'http://203.104.209.199/kcsapi/api_req_ranking/mxltvkpyuklh';
  var nn = new Date();
  var now = new Date().getTime();
  var userid = 8156938;
  var ranking = generateRankKey(userid)

  var year = nn.getFullYear();
  var month = nn.getMonth()+1;
  var dateno = getRankDateNo(nn.getTime());
  var keym = year+"_"+month;
  var key = year+'_'+month+'_'+dateno;
  cl_o_senka_8 = udb.collection("cl_o_8_senka_"+keym);
  cl_o_senka_8.find({"_id":dateno}).toArray(function(err,rarr){
    if(rarr&&rarr[0]){
      console.log('333');
      var rret = rarr[0].d;
      saveRank(rret,nn);
    }else{
        var req = {
            url: url,
            method: "POST",
            headers:{
              'Content-Type': 'application/x-www-form-urlencoded',
              'Referer':'http://203.104.209.199/kcs2/index.php?api_root=/kcsapi&voice_root=/kcs/sound&osapi_root=osapi.dmm.com&version=5.1.4.1&api_token='+token+'&api_starttime='+now,
              'User-Agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.99 Safari/537.36'
            },
            body:"api%5Fpageno="+page+"&api%5Fverno=1&api%5Franking="+ranking+"&api%5Ftoken="+token
      };
      if(proxy==undefined){
        proxy=0;
      }
      if(proxy==1){
        req.proxy = 'http://192.168.17.236:2346'
      }else if(proxy==2){
        req.proxy = 'http://192.168.17.241:2346'
      }else if(proxy==4){
        req.proxy = 'http://192.168.17.236:2346'
      }else if(proxy==5){
        req.proxy = 'http://192.168.17.241:2346'
      }else if(proxy>=6){
        return;
      }else{
          
      }
      request(req, function(error, response, body) {
        if (error && error.code) {
          console.log('pipe error catched!')
          var delay = proxy?(2000*proxy+3000):2000
          setTimeout(function(){
            getRank(page,retarr,proxy+1)
          },delay);
        } else {
          if (body.startsWith("svdata=")) {
            body = body.substring(7);
          }
          //console.log(body);
            try{
                eval('('+body+')');
            }catch(ee){
                var delay = proxy?(2000*proxy+3000):2000
                if(proxy>6){
                  return;
                }else{
                  setTimeout(function(){
                    getRank(page,retarr,proxy+1)
                  },delay);
                }
                return;
            }
          var data = eval('('+body+')');
          var list = data.api_data.api_list;
          var rret = retarr.concat(list);
          if(page<100){
            getRank(page+1,rret);
          }else{
            var init = {'_id':dateno,d:rret,ts:now,tse:nn}
            console.log(init);
            cl_o_senka_8.save(init);
            saveRank(rret,nn);
          }
        }
      });
    }
  })
}

function saveRank(rret,nn){
  var magic = calMagic(rret);
  console.log('m:'+magic)
  for(var i=0;i<rret.length;i++){
    var rd = rret[i];
    nr(rd,nn,magic);

  }
}

function nr(rd,nn,magic){
  var now = nn.getTime();
  var year = nn.getFullYear();
  var month = nn.getMonth()+1;
  var dateno = getRankDateNo(nn.getTime());
  var keym = year+"_"+month;
  var key = year+'_'+month+'_'+dateno;
  var now = nn.getTime();
  var cmt = rd.api_itbrdpdbkynm;
  var name = rd.api_mtjmdcwtvhdr;
  var no = rd.api_mxltvkpyuklh;
  var osenka = rd.api_wuhnhojjxmke;
  var lrate = Math.floor(osenka / MAGIC_R_NUMS[no%13]);
  var senka = lrate/magic - 91;
  //console.log('sk:'+senka)
  var cl_n_senka_8 = udb.collection("cl_n_8_senka_"+keym);
  var dd = {};
  dd['d.'+dateno]=senka;
  dd.cmt=cmt;
  dd.ts=now;
  dd.tse=nn;
  var id = dateno + "_" + no;
  cl_n_senka_8.find({'_id':id}).toArray(function(err,arr) {
    if (arr && arr[0]) {
      var odd = arr[0].d;
      odd[dateno] = senka;
      cl_n_senka_8.updateOne({'_id': id}, {'$set': {d: odd, cmt: cmt,dd:senka,no:no,ts: now, tse: nn}});
    } else {
      var dd = {}
      dd[dateno] = senka;
      var init = {'_id': id, n: name, d: dd,dd:senka,no:no, cmt: cmt, ts: now, tse: nn};
      console.log(init);
      cl_n_senka_8.insert(init);
    }
  });
}


function calMagic(tdata){
  var la = []
  while(la.length<28){
    var jd = tdata[la.length];
    var no=jd.api_mxltvkpyuklh;
    var key=jd.api_wuhnhojjxmke;
    if(key%MAGIC_R_NUMS[no%13]==0){
      la.push(key/MAGIC_R_NUMS[no%13]);
    }else{
      la.push(0);
    }
  }
  console.log(la);
  return EA(la);
}

function EA(list){
  if(list.length==0){
    return 1;
  }
  var ret = list[0]
  for(var i=1;i<list.length;i++){
    ret = EA2(ret,list[i]);
  }
  return ret;
}
function EA2(max,min){
  if(max%min==0){
    return min;
  }else{
    return EA2(min, max%min);
  }
}

function timer1(){
  var left = (43200000 - new Date().getTime()%43200000 + 3600000*5)%43200000+5000
  var leftmin = left/60000;
  console.log('leftmin:'+leftmin);
  setTimeout(function(){
      try{
      timer();
      }catch(e){}
      setTimeout(function(){
        timer1();
      },100000)
  },left)
}

function timer2(){
  var left2 = (43200000 - new Date().getTime()%43200000 + 3600000*6)%43200000+5000
  var leftmin2 = left2/60000;
  console.log('leftmin2:'+leftmin2);
  setTimeout(function(){
            try{
      getRank(1,[]);
      }catch(e){}
    
    setTimeout(function(){
      try{
      timer();
      }catch(e){}
    },60000);
      
          
    setTimeout(function(){
      timer2();
    },200000)  
  },left2)
}

function timer3(){
  var left3 = 3600000 - new Date().getTime()%3600000+10000
  var leftmin3 = left3/60000;
  console.log('leftmin3:'+leftmin3);
  setTimeout(function(){
    var nowdate = new Date().getDate();
    var nowmonth = new Date().getMonth();
    if(nowdate==monthOfDay[nowmonth]){
      var nowhour = new Date().getHours();
      if(nowhour>=15&&nowhour<=20){
        console.log('hour task:ok15')
        timer();
      }else if(nowhour==7){
        console.log('hour task:ok7')
        timer();
      }else if(nowhour==11){
        console.log('hour task:ok11')
        timer();
      }else if(nowhour==21){
        console.log('hour task:ok21')
        monthCollect();
      }else if(nowhour==22){
        console.log('hour task:ok22')
        timer();
      }else if(nowhour==23){
        console.log('hour task:ok23')
        timer();
      }else{
        console.log('hour task:no1')
      }
    }else{
      console.log('hour task:no2')
    }
      
    setTimeout(function(){
      timer3();
    },200000)        
  },left3)
}


function gotimer(){
    timer1();
    timer2();
    timer3();
}

function timer(){
  var nn = new Date();
  var now = nn.getTime();
  var year = nn.getFullYear();
  var month = nn.getMonth()+1;
  var dateno = getRankDateNo(nn.getTime());
  var keym = year+"_"+month;
  var kml = year+'_'+(month-1);
  if(month==1){
    kml = (year-1)+'_'+12;
  }
  var key = year+'_'+month+'_'+dateno;
  var cl_n_senka_8 = udb.collection("cl_n_8_senka_"+keym);
  var cl_n_senka_8_l = udb.collection("cl_n_8_senka_"+kml);
  var cl_senka_8 = udb.collection("cl_senka_8");
  var cl_lst = udb.collection("cl_lst");
  cl_n_senka_8.find().toArray(function(err,arr){
    cl_n_senka_8_l.find().toArray(function(err3,arr3){
      cl_lst.save({'_id':1,ts:now,tse:nn});
      var nl = {};
      for(var i=0;i<arr.length;i++){
        nl[arr[i].n]=1
      }
      for(var i=0;i<arr3.length;i++){
        nl[arr3[i].n]=1
      }
      var nk = Object.keys(nl);
      console.log(nk);
      cl_senka_8.find({n:{'$in':nk}}).toArray(function(err2,arr2){
        var glist = [];
        for(var i=0;i<arr2.length;i++){
          var e = arr2[i].e;
          var nt = (now - arr2[i].ts)/500
          if(e+nt>4000000){
            glist.push(arr2[i]._id);
          }
        }
        console.log('============nlist:'+nk.length+'===========glist:'+glist.length+'============');

        getInfoFromListA(glist);
      })
    });
  })
}




function getInfoFromListA(glist){
  var thread = glist.length/300+1;
  for(var i=0;i<thread;i++){
    var galist = glist.slice(i*300,(i+1)*300);
    getInfoFromList(galist);
  }
}

function getInfoFromListB(glist){
  console.log('all:'+glist.length)
  var maxthread = 8;
  var listperthread = Math.floor(glist.length/8);
  for(var i=0;i<maxthread;i++){
    var galist = glist.slice(i*listperthread,(i+1)*listperthread);
    console.log(galist.length);
    getInfoFromList(galist);
  }
}

function getInfoFromList(glist){
    console.log(glist.length);
    var uid = glist.pop();
    getUserInfo(uid,function(){
      if(glist.length>0){
        getInfoFromList(glist)
      }
    });
}

gotimer();

function monthCollect(){
  var nn = new Date();
  var now = nn.getTime();
  var year = nn.getFullYear();
  var month = nn.getMonth()+1;
  var dateno = getRankDateNo(nn.getTime());
  var keym = year+"_"+month;
  var kml = year+'_'+(month-1);
  if(month==1){
    kml = (year-1)+'_'+12;
  }
  var key = year+'_'+month+'_'+dateno;
  var cl_n_senka_8 = udb.collection("cl_n_8_senka_"+keym);
  var cl_n_senka_8_l = udb.collection("cl_n_8_senka_"+kml);
  var cl_senka_8 = udb.collection("cl_senka_8");
  cl_senka_8.find({e:{'$gt':4000000}}).toArray(function(err,arr){
    var alllist = [];
    for(var i=0;i<arr.length;i++){
      alllist.push(arr[i]._id);
    }
    getInfoFromListB(alllist);
  })
}










function handleSenkaReply(content,gid,qq,callback){
  content=content.trim();
  var nn = new Date();
  var now = nn.getTime();
  var year = nn.getFullYear();
  var month = nn.getMonth()+1;
  var dateno = getRankDateNo(nn.getTime());
  var keym = year+"_"+month;
  var key = year+'_'+month+'_'+dateno;
  var cl_n_senka_8 = udb.collection("cl_n_8_senka_"+keym);
  var cl_senka_8 = udb.collection("cl_senka_8");
  var ca = content.split('-');
  var cd = ca[1];
  var pcd = parseInt(cd);
  var cf = ca[0];
  if(ca.length==2&&!pcd){
    console.log(pcd);
    if(cd==1){

    }else if(cd==2){

    }else if(cd==3){

    }else{
      console.log('cd:'+cd)
      cl_n_senka_8.find({n:new RegExp(cd)}).toArray(function(err,arr){
        var m = {};
        for(var i=0;i<arr.length;i++){
          var name = arr[i].n;
          if(m[name]){
            m[name].push(arr[i])
          }else{
            m[name]=[arr[i]];
          }
        }
        var namelist = Object.keys(m);
        for(var i=0;i<namelist.length;i++){
            if(namelist[i]==cd){
                namelist = [cd];
                break;
            }
        }
        if(namelist.length==1){
          var ranklist = m[namelist[0]];
          ranklist.sort(function(a,b){
            return parseInt(a._id.split('_')[0]) - parseInt(b._id.split('_')[0])
          })
          var lstrk = ranklist[ranklist.length-1];
          var rkcmt = lstrk.cmt;
          cl_senka_8.find({n:namelist[0]}).toArray(function(err2,arr2){
            arr2.sort(function(a,b){
                if(b.cmt&&b.cmt==rkcmt){
                    return 1;
                }
                if(a.cmt&&a.cmt==rkcmt){
                    return -1;
                }
                return b.e-a.e
            })
            var user = arr2[0];

            var ud = user.d;
            var culist = [];
            for(var i=0;i<ranklist.length;i++){
              var rankDateNo = ranklist[i]._id.split('_')[0];
              var uk = keym+'_'+rankDateNo+'_'+(rankDateNo%2==0?1:13);
              if(ud[uk]){
                culist.push({rd:parseInt(rankDateNo),exp:ud[uk],sk:ranklist[i].dd});
              }
            }
            var eostr = '';
            for(var i=1;i<culist.length;i++){
              var eo=(culist[i].sk-culist[i-1].sk) - Math.round((culist[i].exp-culist[i-1].exp)/10000*7)

              culist[i].eo=eo;
              culist[i].es=((culist[i].exp-culist[i-1].exp)/10000*7).toFixed(1)
              if(eo>3){
                eostr = eostr + Math.ceil(culist[i].rd/2)+'日'+(culist[i].rd%2==0?'下午':'上午')+':'+eo+'\n';
              }
            }

            culist.sort(function(a,b){return a.rd-b.rd});

            var fcu = culist[0];
            var lcu = culist[culist.length-1];
            var addsk = lcu.sk-fcu.sk;
            var addexp = lcu.exp-fcu.exp;
            var allex = Math.round(addsk - addexp*7/10000);
            var fdt = Math.floor((fcu.rd+1)/2)
            var edt = Math.floor((lcu.rd+1)/2);
            var exstr = '【'+allex+'】【'+fdt+'~'+edt+'日】';
            var dailystr = (addexp*2 / (lcu.rd-fcu.rd) *7/10000).toFixed(1);




            var userid = user._id;
            var lsenka = ranklist[ranklist.length-1];
            var td = lsenka.dd;
            var ton = lsenka.no;
            var tno = parseInt(lsenka._id.split('_')[0])
            var tk
            var tk2;
            if(tno%2==0){
              tk = keym+'_'+tno+'_1'
                tk2 = keym+'_'+tno+'_2'
                tk3 = keym+'_'+tno+'_19'
            }else{
              tk = keym+'_'+tno+'_13'
                tk2 = keym+'_'+tno+'_14'
                tk3 = keym+'_'+tno+'_19'
            }
            var thenexp = user.d[tk];
              var ddstr =''
              if(!thenexp){
                  ddstr = '?'
                thenexp = user.d[tk2];
                                
                  if(!thenexp){
                    ddstr = '?'
                    thenexp = user.d[tk3];
                    }
              }
              if(cf.startsWith("s")){
                callback({o:ton,ex:exstr,dly:dailystr})
              }else{
                getUserInfo(userid,function(rrr){
                  var addsenka = ((rrr.exp-thenexp)/10000*7).toFixed(1);
                  var ret = namelist[0]+'\n';
                  ret = ret + '当前战果：【'+ton+'位】【'+td+'(+'+addsenka+')'+ddstr+'】\n'
                  ret = ret + 'EX:'+exstr+'  日均:【'+dailystr+'】\n';
                  if(rrr.exp>200000000){
                    //ret = ret + '【exp：'+(rrr.exp/100000000).toFixed(1)+'亿】'
                  }
                  ret = ret + '\n'
                  ret = ret + rrr.ship + '\n';
                  culist[culist.length] = {rd:tno+1,exp:rrr.exp,sk:-1,eo:0,es:addsenka};
                  generateImage(culist,ret.trim(),callback);
                })
              }


          })

        }else{
          var ret = '请选择\n';
          for(var i=0;i<namelist.length;i++){
            ret = ret + namelist[i]+'\n';
          }
          callback(ret.trim());
        }
      })
    }
  }else if(ca.length==1||(ca.length==2&&pcd&&pcd<25)){
    var query = {'_id':{'$gt':dateno+'','$lt':dateno+'~'}};
    cl_n_senka_8.find(query).toArray(function(err,arr){
      var namemap = [];
      var rankmap = {};
      for(var i=0;i<arr.length;i++){
        namemap[arr[i].n]=1;
        var rno = arr[i]._id.split('_')[1];
        rankmap[parseInt(rno)]=arr[i];
      }
      var namelist = Object.keys(namemap);
      //console.log(namemap);
      var nnn = new  Date();
      var k1;
      var k2;
      if(dateno%2==0){
        nnn.setHours(2)
        nnn.setMinutes(0);
        nnn.setSeconds(0);
          if(nn.getHours()==13){
        k1 = keym+'_'+dateno+'_'+1;
              k2 = keym+'_'+dateno+'_'+13;
          }else{
        k1 = keym+'_'+dateno+'_'+1; 
              k2 = keym+'_'+dateno+'_'+2;
          }
      }else{
        nnn.setHours(13)
        nnn.setMinutes(0);
        nnn.setSeconds(0);
        k1 = keym+'_'+dateno+'_'+13;
        k2 = keym+'_'+dateno+'_'+14;
      }
      var cl_lst = udb.collection("cl_lst");
      cl_lst.find({'_id':1}).toArray(function(err3,arr3){
        if(arr3&&arr3[0]){
          var lst = arr3[0].ts;
          var lnn = new Date(lst);
          var lh = lnn.getHours();
          var lno = getDateNo(lnn);
          var kk = keym + '_' + lno + '_' + lh;

          cl_senka_8.find({n:{'$in':namelist}}).toArray(function(err2,arr2){
            var emap = {};
            for(var i=0;i<arr2.length;i++){
              if(emap[arr2[i].n]){
                emap[arr2[i].n] = emap[arr2[i].n].concat([arr2[i]]);
              }else{
                emap[arr2[i].n]=[arr2[i]]
              }
            }
            for(var i=1;i<990;i++){
              var rk = rankmap[i];
              var rkn = rk.n;
              var rkea = emap[rkn];
              var rkcmt = rk.cmt;
              var rke;
              if(rkea.length==1){
                rke = rkea[0]
              }else{
                rkea.sort(function(a,b){
                  if(a.cmt==rkcmt){
                    return -1;
                  }else if(b.cmt==rkcmt){
                    return 1;
                  }else{
                    return b.ts-a.ts;
                  }
                })
                rke = rkea[0];
              }
              if(rke.d[k1]&&rke.d[kk]){
                rk.rss = (rke.d[kk] - rke.d[k1])/10000*7 + rk.dd
              }else{
                rk.rss=rk.dd;
              }
            }
            var rks = Object.keys(rankmap);
            rks.sort(function(a,b){
              return rankmap[b].rss-rankmap[a].rss
            })

            var m = {};
            var ret = '';
            var r1,r5,r20,r100,r500=0
            for(var i=0;i<arr.length;i++){
              if(arr[i].no==1){
                r1=arr[i].dd;
              }
              if(arr[i].no==5){
                r5=arr[i].dd;
              }
              if(arr[i].no==20){
                r20=arr[i].dd;
              }
              if(arr[i].no==100){
                r100=arr[i].dd;
              }
              if(arr[i].no==500){
                r500=arr[i].dd;
              }
            }
            console.log('p:'+pcd)
            if(pcd>=1&&pcd<=25){
              var rlist = [];
              for(var i=(pcd-1)*25;i<pcd*25;i++){
                rlist.push(rankmap[rks[i]])
              }
              loopFront(rlist,[],callback,lst,pcd);
              return;
            }

            ret = ret + '\t\t【榜单】\t【当前】\t\n'
            ret = ret + '\t1位【'+r1+'】\t【'+rankmap[rks[0]].rss+'】\t\n';
            ret = ret + '\t5位【'+r5+'】\t【'+rankmap[rks[4]].rss+'】\t\n';
            ret = ret + '\t20位【'+r20+'】\t【'+rankmap[rks[19]].rss+'】\t\n';
            ret = ret + '\t100位【'+r100+'】\t【'+rankmap[rks[99]].rss+'】\t\n';
            ret = ret + '\t500位【'+r500+'】\t【'+rankmap[rks[499]].rss+'】\t\n';
            ret = ret + '统计时间：'+new Date(lst).toLocaleString();
            callback(ret.trim())
          })
        }
      });
    });
  }
}

function loopFront(list,ret,callback,lst,pcd){
  if(list.length==0){
    ret.sort(function(a,b){return b.rss-a.rss});
    var rr = '';
    var img1 = new imageMagick("static/blank.png");
    img1.autoOrient()
      .resize(1000,880,'!')
      .fontSize(20)
      .fill('blue')
      .font('./font/STXIHEI.TTF')

    img1.drawText(50, 0, '当前排名', 'NorthWest')
    img1.drawText(150, 0, '提督', 'NorthWest')
    img1.drawText(400, 0, '当前战果', 'NorthWest')
    img1.drawText(500, 0, '榜单排名', 'NorthWest')
    img1.drawText(600, 0, '榜单战果', 'NorthWest')
    img1.drawText(700, 0, 'EX', 'NorthWest')
    img1.drawText(900, 0, '日均', 'NorthWest')
    for(var i=0;i<ret.length;i++){
      var rd=ret[i];
      img1.drawText(50, 50+i*30, (pcd*25+i-24)+'位', 'NorthWest')
      img1.drawText(150, 50+i*30, rd.n, 'NorthWest')
      img1.drawText(400, 50+i*30, rd.rss.toFixed(1), 'NorthWest')
      img1.drawText(500, 50+i*30, rd.no+'位', 'NorthWest')
      img1.drawText(600, 50+i*30, rd.dd, 'NorthWest')
      img1.drawText(700, 50+i*30, rd.ex, 'NorthWest')
      img1.drawText(900, 50+i*30, rd.dly, 'NorthWest')
    }
    img1.drawText(50, 80+ret.length*30, '统计时间：'+new Date(lst).toLocaleString(), 'NorthWest')
    sendGmImage(img1,'',callback);
  }else{
    var m = list[0];
    var slist = list.slice(1);
    var nm = m.n;
    handleSenkaReply('s8-'+nm,'','',function(r){
      m.o=r.o;
      m.ex=r.ex;
      m.dly=r.dly;
      var nret = ret.concat([m]);
      loopFront(slist,nret,callback,lst,pcd);
    })
  }
}





function fixCollect(id){
  //console.log('id:'+id)
  var cl_senka_8=udb.collection("cl_senka_8");
  cl_senka_8.find({'_id':id}).toArray(function(err,arr){
    if(arr&&arr[0]){
      //console.log('ok:'+id)
      fixCollect(id+1)
    }else{
      console.log('no:'+id)
      getUserInfo(id,function(r){
        console.log(r)
        fixCollect(id+1)
      },1);
    }
  })
}


module.exports={
  handleSenkaReply
}


var weekStr = '日一二三四五六';
function generateImage(arr,str,callback){
  var img1 = new imageMagick("static/blank.png");
  img1.autoOrient()
    .resize(900,950,'!')
    .fontSize(25)
    .fill('blue')
    .font('./font/STXIHEI.TTF')

  var nn = new Date();
  nn.setDate(1)
  nn.setHours(10);
  var day = nn.getDay();
  var ed = monthOfDay[nn.getMonth()];
  var wd = 120;
  var hd = 100
  var m={};
  var mx={};
  for(var i=0;i<arr.length;i++){
    var rd = arr[i].rd;
    var da = Math.ceil(rd/2);
    if(m[da]){
      m[da]=m[da].trim()+'\n'+arr[i].es;
    }else{
      m[da]=arr[i].es;
    }
    if(arr[i].eo&&arr[i].eo>3){
      if(mx[da]){
        mx[da]=mx[da]+'\n'+arr[i].eo;
      }else{
        mx[da]=arr[i].eo;
      }
    }

  }
  for(var i=0;i<7;i++){
    img1.drawText(50+i*wd,30,weekStr[i],'NorthWest')
  }
  img1.drawLine(0,65,1200,65)
  img1.drawLine(0,165,1200,165)
  img1.drawLine(0,265,1200,265)
  img1.drawLine(0,365,1200,365)
  img1.drawLine(0,465,1200,465)
  img1.drawLine(0,565,1200,565)

  for(var i=0;i<6;i++){
    img1.drawLine(130+i*wd,0,130+i*wd,565)
  }



  for(var i=-day+1;i<=ed;i++){
    if(i<1){
      continue;
    }
    var ii = i+day-1;
    var x = ii%7;
    var y = Math.floor(ii/7);
    img1.fontSize(25)
    img1.fill('blue')
    img1.drawText(50+x*wd,80+hd*y,i,'NorthWest')
    if(m[i]){
      img1.fontSize(18)
      img1.fill('red')
      if(mx[i]) {
        img1.drawText(50 + x * wd - 30, 110 + hd * y, m[i], 'NorthWest')
      }else{
        img1.drawText(50 + x * wd, 110 + hd * y, m[i], 'NorthWest')
      }
    }
    if(mx[i]){
      img1.fontSize(18)
      img1.fill('dark')
      img1.drawText(50+x*wd+30 ,110+hd*y,mx[i],'NorthWest')
    }
  }

  img1.fontSize(25)
  img1.fill('blue')
  img1.drawText(50,570,str,'NorthWest')
  //img1.write('5.png',function(){});
  sendGmImage(img1,'',callback);
}








setTimeout(function(){
  //handleSenkaReply('z8-7','','',function(r){console.log(r)})
  //timer();
},1500)















