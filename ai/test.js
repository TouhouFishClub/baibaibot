var all=getStore().const.$equips;
var c={};
for(var p in all){if(p<300){c[p]=all[p]}};
var e=getStore("info.equips");
for(var p in e){delete(c[e[p].api_slotitem_id])};
for(var p in c){console.log(c[p].api_name)};
