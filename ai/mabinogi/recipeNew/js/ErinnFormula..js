var UseList = [50676, 53150, 93133, 93134, 93135, 93767, 4100030, 4090004, 4090005];
var RareMineralogyList = [64041, 64054, 64055, 64056, 67100, 95310];
var SulienEcologyList = [51101, 51102, 51106, 51109, 67200, 95309];
var FindMaterialList = [50465, 50466, 50467, 50468, 50469, 50470, 50471, 50472, 50473, 50474, 50475, 50476, 50477, 50478, 50479, 50480, 50483, 50484, 50485, 50486, 50487, 50488, 50489, 50490, 51300, 51301, 60023, 60024, 60025, 60026];
var EffectName = ["持续时间", "最大生命值", "最大魔法值", "最大体力值", "力量", "敏捷", "智力", "意志", "幸运", "最小伤害", "最大伤害", "保护", "防御", "魔法保护", "魔法防御", "魔法攻击力", "穿刺等级"];
var CuisineNow = 0;
var TemporaryCuisine = [];

function ChangeSkill(Id) {
  CloseSkillList();
  if (SkillNow != Id) {
    document.getElementById("ItemList").innerHTML = "";
    document.getElementById('MainBodySpan').innerHTML = "";
    CloseItemList(Id)
  }
}

function CloseSkillList() {
  let SkillListHeight = parseInt(document.getElementById("Skill").clientHeight);
  if (SkillListHeight > 23) {
    document.getElementById("Skill").style.height = SkillListHeight - 20 + "px";
    setTimeout("CloseSkillList()", 1)
  } else {
    document.getElementById("Skill").style.height = "23px";
    document.getElementById("SkillListKey").innerHTML = "▲";
    document.getElementById("SkillListKey").onclick = OpenSkillList
  }
}

function OpenSkillList() {
  let SkillListHeight = parseInt(document.getElementById("Skill").clientHeight);
  if (SkillListHeight < 574) {
    document.getElementById("Skill").style.height = SkillListHeight + 20 + "px";
    setTimeout("OpenSkillList()", 1)
  } else {
    document.getElementById("Skill").style.height = "574px";
    document.getElementById("SkillListKey").innerHTML = "▼";
    document.getElementById("SkillListKey").onclick = CloseSkillList
  }
}

function CloseItemList(Id) {
  let ItemListHeight = parseInt(document.getElementById("ItemList").clientHeight);
  if (ItemListHeight > 10) {
    document.getElementById("ItemList").style.height = ItemListHeight - 10 + "px";
    setTimeout("CloseItemList(" + IdAmendJS(Id) + ")", 1)
  } else {
    document.getElementById("ItemList").style.border = "5px solid gold";
    let Skill = eval(Id);
    if (Id > 0) {
      Skill = eval("Skill" + Id)
    }
    ;let NewHeight = Math.min(546, eval(Skill[1] + "List.length") * 25);
    let NewWidth = Skill[2];
    document.getElementById("ItemList").style.width = NewWidth + "px";
    OpenItemList(Id, NewHeight)
  }
}

function OpenItemList(Id, NewHeight) {
  let ItemListHeight = parseInt(document.getElementById("ItemList").clientHeight);
  if (ItemListHeight < NewHeight) {
    document.getElementById("ItemList").style.height = ItemListHeight + 15 + "px";
    setTimeout("OpenItemList(" + IdAmendJS(Id) + "," + NewHeight + ")", 1)
  } else {
    document.getElementById("ItemList").style.height = NewHeight + "px";
    SkillToList(Id)
  }
}

function SkillToList(Id) {
  if (typeof SkillNow != "number") {
    document.getElementById(SkillNow).className = ""
  } else if (SkillNow != 0) {
    document.getElementById("Skill" + SkillNow).className = ""
  }
  let ItemList;
  let IdType = "";
  if (typeof Id != "number") {
    document.getElementById(Id).className = "ListTd";
    ItemList = eval(Id + "List")
  } else {
    if (Id != 0) document.getElementById("Skill" + Id).className = "ListTd";
    ItemList = eval(eval("Skill" + Id + "[1]") + "List");
    IdType = "Item";
    if (Id == 55100) {
      IdType = "Product"
    }
  }
  SkillNow = Id;
  let t = "<table align='center' id='ItemLists' cellspacing=0>";
  let ItemName;
  for (var i = 0; i < ItemList.length; i++) {
    ItemName = eval(IdType + ItemList[i] + "[0]");
    t += "<tr id=Cuisine" + ItemList[i] + " onclick='Cuisine(" + IdAmendHTML(ItemList[i]) + ")'><td onmouseover='MouseOver(this)' onmouseout='MouseOut(this)'>" + ItemName + "</td></tr>"
  }
  t += "</table>";
  CuisineNow = 0;
  document.getElementById("ItemList").innerHTML = t;
  document.getElementById("ItemList").scrollTop = 0
}

function MainBody(Id) {
  let t = "";
  let IdType = "";
  if (SkillNow == 10030) t = ItemDissolution(Id);
  TemporaryCuisine = [0];
  if (ErgEnhanceList.includes(Id)) {
    t += ErgEnhances(Id)
  } else if (SkillNow == 55100) {
    t += Product(Id);
    IdType = "Product"
  } else {
    TemporaryCuisine = [IdAmendJS(Id)];
    t += eval("Item(" + Id + ",1)");
    IdType = "Item"
  }
  if (eval(IdType + Id + "[0].indexOf('兼职')==-1")) {
    for (let i = 1; i < TemporaryCuisine.length; i++) {
      t += eval("Item(" + TemporaryCuisine[i] + ")")
    }
  }
  document.getElementById('MainBodySpan').innerHTML = t;
  document.getElementById("MainBody").scrollTop = "0";
  setTimeout("CheckImg()", 0)
}

function Item(Id, a) {
  let t = TdMain(Id, a);
  let CheckT = t;
  let tt;
  let Length;
  let RowsQuantity;
  let LocaleLimit = "";
  let EventLimit = "";
  let TalentLimit = "";
  let QuestLimit = "";
  let OtherSkill = "";
  let Other = "";
  let AmendQuantity;
  try {
    let MillingItem = eval("MillingItem" + Id);
    for (var i = 0; i < EventMillingList.length; i++) {
      if (EventMillingList[i].includes(Id)) EventLimit += EventMillingList[i][0]
    }
    t += "</tr><tr>" + TdSkill(10012, QuestLimit, LocaleLimit, EventLimit);
    t += "<td width='580'>" + CompleteTable(TdMaterial(MillingItem[0], "×" + MillingItem[1], 160), 560) + "</td>";
    EventLimit = ""
  } catch (e) {
    e
  }
  try {
    let TailoringItem = eval("TailoringItem" + Id);
    if (TalentTailoringList.includes(Id)) TalentLimit = TalentTailoringList[0];
    if (SightOfOtherSideTailoringList.includes(Id)) OtherSkill = 58010;
    t += "</tr><tr>" + TdSkill(10001, QuestLimit, LocaleLimit, EventLimit, TalentLimit, TailoringItem.length - 1, "", TailoringItem[0][0], OtherSkill, TailoringItem[0][1]);
    for (var i = 1; i < TailoringItem.length; i++) {
      if (i != 1) t += "</tr><tr>";
      AmendQuantity = "N";
      tt = TdMaterial(TailoringItem[i][0], "", 50, 2);
      for (var j = 1; j < TailoringItem[i].length; j += 2) {
        if (TailoringItem[i][j] == 0) {
          tt += "</tr><tr>";
          j++;
          AmendQuantity = ""
        }
        tt += TdMaterial(TailoringItem[i][j], "×" + TailoringItem[i][j + 1] + AmendQuantity)
      }
      t += "<td width='580'>" + CompleteTable(tt, 560) + "</td>"
    }
    TalentLimit = "";
    OtherSkill = ""
  } catch (e) {
    e
  }
  try {
    let HandicraftItem = eval("HandicraftItem" + Id);
    for (var i = 0; i < LocaleHandicraftList.length; i++) {
      if (LocaleHandicraftList[i].includes(Id)) {
        if (LocaleLimit != "") LocaleLimit += "、";
        LocaleLimit += LocaleHandicraftList[i][0]
      }
    }
    for (var i = 0; i < EventHandicraftList.length; i++) {
      if (EventHandicraftList[i].includes(Id)) EventLimit += EventHandicraftList[i][0]
    }
    if (SightOfOtherSideHandicraftList.includes(Id)) OtherSkill = 58010;
    t += "</tr><tr>" + TdSkill(10013, QuestLimit, LocaleLimit, EventLimit, TalentLimit, HandicraftItem.length - 1, HandicraftItem[0][0], HandicraftItem[0][1], OtherSkill);
    for (var i = 1; i < HandicraftItem.length; i++) {
      if (i != 1) t += "</tr><tr>";
      tt = "";
      for (var j = 0; j < HandicraftItem[i].length; j += 2) {
        tt += TdMaterial(HandicraftItem[i][j], "×" + HandicraftItem[i][j + 1], 560 / HandicraftItem[i].length)
      }
      t += "<td width='580'>" + CompleteTable(tt, 560) + "</td>"
    }
    LocaleLimit = "";
    EventLimit = ""
  } catch (e) {
    e
  }
  try {
    let WeavingItem = eval("WeavingItem" + Id);
    if (TalentWeavingList.includes(Id)) TalentLimit = TalentWeavingList[0];
    t += "</tr><tr>" + TdSkill(10014, QuestLimit, LocaleLimit, EventLimit, TalentLimit, WeavingItem.length - 1, WeavingItem[0]);
    for (var i = 1; i < WeavingItem.length; i++) {
      if (i != 1) t += "</tr><tr>";
      tt = "";
      for (var j = 0; j < WeavingItem[i].length; j += 2) {
        tt += TdMaterial(WeavingItem[i][j], "×" + WeavingItem[i][j + 1], 160)
      }
      t += "<td width='580'>" + CompleteTable(tt, 560) + "</td>"
    }
    TalentLimit = ""
  } catch (e) {
    e
  }
  try {
    let RefineItem = eval("RefineItem" + Id);
    if (TalentRefineList.includes(Id)) TalentLimit = TalentRefineList[0];
    t += "</tr><tr>" + TdSkill(10015, QuestLimit, LocaleLimit, EventLimit, TalentLimit, RefineItem.length - 1, RefineItem[0]);
    for (var i = 1; i < RefineItem.length; i++) {
      if (i != 1) t += "</tr><tr>";
      tt = "";
      for (var j = 0; j < RefineItem[i].length; j += 2) {
        tt += TdMaterial(RefineItem[i][j], "×" + RefineItem[i][j + 1], 160)
      }
      t += "<td width='580'>" + CompleteTable(tt, 560) + "</td>"
    }
    TalentLimit = ""
  } catch (e) {
    e
  }
  try {
    let BlacksmithItem = eval("BlacksmithItem" + Id);
    if (TalentBlacksmithList.includes(Id)) TalentLimit = TalentBlacksmithList[0];
    if (SightOfOtherSideBlacksmithList.includes(Id)) OtherSkill = 58010;
    t += "</tr><tr>" + TdSkill(10016, QuestLimit, LocaleLimit, EventLimit, TalentLimit, BlacksmithItem.length - 1, "", BlacksmithItem[0][0], OtherSkill, BlacksmithItem[0][1]);
    for (var i = 1; i < BlacksmithItem.length; i++) {
      if (i != 1) t += "</tr><tr>";
      AmendQuantity = "N";
      tt = TdMaterial(BlacksmithItem[i][0], "", 50, 2);
      for (var j = 1; j < BlacksmithItem[i].length; j += 2) {
        if (BlacksmithItem[i][j] == 0) {
          tt += "</tr><tr>";
          j++;
          AmendQuantity = ""
        }
        tt += TdMaterial(BlacksmithItem[i][j], "×" + BlacksmithItem[i][j + 1] + AmendQuantity)
      }
      t += "<td width='580'>" + CompleteTable(tt, 560) + "</td>"
    }
    TalentLimit = "";
    OtherSkill = ""
  } catch (e) {
    e
  }
  try {
    let CookingItem = eval("CookingItem" + Id);
    Length = CookingItem.length;
    RowsQuantity = ((Length - 1) / 6);
    for (var i = 0; i < LocaleCookingList.length; i++) {
      if (LocaleCookingList[i].includes(Id)) {
        if (LocaleLimit != "") LocaleLimit += "、";
        LocaleLimit += LocaleCookingList[i][0]
      }
    }
    for (var i = 0; i < EventCookingList.length; i++) {
      if (EventCookingList[i].includes(Id)) EventLimit += EventCookingList[i][0]
    }
    t += "</tr><tr>" + TdSkill(10020, QuestLimit, LocaleLimit, EventLimit, TalentLimit, RowsQuantity, CookingItem[0]);
    for (var i = 1; i < Length; i += 6) {
      if (i != 1) t += "</tr><tr>";
      t += "<td width='580'>" + CompleteTable(TdMaterial(CookingItem[i], CookingItem[i + 1] + "%", 160) + TdMaterial(CookingItem[i + 2], CookingItem[i + 3] + "%", 160) + TdMaterial(CookingItem[i + 4], CookingItem[i + 5] + "%", 160), 560) + "</td>"
    }
    LocaleLimit = "";
    EventLimit = ""
  } catch (e) {
    e
  }
  try {
    let HerbalismItem = eval("HerbalismItem" + Id);
    t += "</tr><tr>" + TdSkill(10021) + TdText(HerbalismItem[0])
  } catch (e) {
    e
  }
  try {
    let PotionMakingItem = eval("PotionMakingItem" + Id);
    Length = PotionMakingItem.length;
    for (var i = 0; i < LocalePotionMakingList.length; i++) {
      if (LocalePotionMakingList[i].includes(Id)) {
        if (LocaleLimit != "") LocaleLimit += "、";
        LocaleLimit += LocalePotionMakingList[i][0]
      }
    }
    for (var i = 0; i < EventPotionMakingList.length; i++) {
      if (EventPotionMakingList[i].includes(Id)) EventLimit += EventPotionMakingList[i][0]
    }
    if (SightOfOtherSidePotionMakingList.includes(Id)) OtherSkill = 58010;
    tt = "";
    t += "</tr><tr>" + TdSkill(10022, QuestLimit, LocaleLimit, EventLimit, TalentLimit, RowsQuantity, PotionMakingItem[0], "", OtherSkill);
    for (var i = 1; i < Length; i += 2) {
      tt += TdMaterial(PotionMakingItem[i], "×" + PotionMakingItem[i + 1], 560 / Length)
    }
    t += "<td valign='Bottom' width='580'>" + CompleteTable(tt, 560) + "</td>";
    LocaleLimit = "";
    EventLimit = "";
    OtherSkill = ""
  } catch (e) {
    e
  }
  tt = "";
  for (var i = 0; i < FishingItemList.length; i++) {
    if (FishingItemList[i].includes(Id)) {
      if (tt != "") tt += "、";
      tt += FishingItemList[i][0]
    }
  }
  for (var i = 0; i < EventFishingList.length; i++) {
    if (EventFishingList[i].includes(Id)) {
      EventLimit += EventFishingList[i][0]
    }
  }
  if (tt != "") t += "</tr><tr>" + TdSkill(10023, "", "", EventLimit) + TdText(tt);
  EventLimit = "";
  try {
    let MetallurgyItem = eval("MetallurgyItem" + Id);
    if (KillMetallurgyList.includes(Id)) {
      Other = "击杀"
    }
    ;t += "</tr><tr>" + TdSkill(10028, "", "", "", "", "", "", "", "", "", Other) + TdText(MetallurgyItem[0]);
    Other = ""
  } catch (e) {
    e
  }
  try {
    let DissolutionItem = eval("DissolutionItem" + Id);
    t += "</tr><tr>" + TdSkill(10030, QuestLimit, LocaleLimit, EventLimit, TalentLimit, DissolutionItem.length - 1, DissolutionItem[0]);
    for (var i = 1; i < DissolutionItem.length; i++) {
      if (i != 1) t += "</tr><tr>";
      tt = "";
      for (var j = 0; j < DissolutionItem[i].length; j += 2) {
        tt += TdMaterial(DissolutionItem[i][j], "×" + DissolutionItem[i][j + 1], 160)
      }
      t += "<td width='580'>" + CompleteTable(tt, 560) + "</td>"
    }
  } catch (e) {
    e
  }
  try {
    let SynthesisItem = eval("SynthesisItem" + Id);
    t += "</tr><tr>" + TdSkill(10031, QuestLimit, LocaleLimit, EventLimit, TalentLimit, SynthesisItem.length - 1, SynthesisItem[0]);
    for (var i = 1; i < SynthesisItem.length; i++) {
      if (i != 1) t += "</tr><tr>";
      tt = "";
      for (var j = 0; j < SynthesisItem[i].length; j += 2) {
        tt += TdMaterial(SynthesisItem[i][j], "×" + SynthesisItem[i][j + 1], 160)
      }
      t += "<td width='580'>" + CompleteTable(tt, 560) + "</td>"
    }
  } catch (e) {
    e
  }
  try {
    let CarpentryItem = eval("CarpentryItem" + Id);
    if (TalentCarpentryList.includes(Id)) TalentLimit = TalentCarpentryList[0];
    t += "</tr><tr>" + TdSkill(10033, QuestLimit, LocaleLimit, EventLimit, TalentLimit, CarpentryItem.length - 1, CarpentryItem[0]);
    for (var i = 1; i < CarpentryItem.length; i++) {
      if (i != 1) t += "</tr><tr>";
      tt = "";
      for (var j = 0; j < CarpentryItem[i].length; j += 2) {
        tt += TdMaterial(CarpentryItem[i][j], "×" + CarpentryItem[i][j + 1], 560 / (CarpentryItem[i].length))
      }
      t += "<td width='580'>" + CompleteTable(tt, 560) + "</td>"
    }
    TalentLimit = ""
  } catch (e) {
    e
  }
  try {
    let StageTicketMakingItem = eval("StageTicketMakingItem" + Id);
    t += "</tr><tr>" + TdSkill(10036, QuestLimit, LocaleLimit, EventLimit, TalentLimit, StageTicketMakingItem.length - 1);
    for (var i = 1; i < StageTicketMakingItem.length; i++) {
      if (i != 1) t += "</tr><tr>";
      tt = "";
      for (var j = 0; j < StageTicketMakingItem[i].length; j += 2) {
        tt += TdMaterial(StageTicketMakingItem[i][j], "×" + StageTicketMakingItem[i][j + 1], 560 / (StageTicketMakingItem[i].length))
      }
      t += "<td width='580'>" + CompleteTable(tt, 560) + "</td>"
    }
  } catch (e) {
    e
  }
  try {
    let HeulwenEngineeringItem = eval("HeulwenEngineeringItem" + Id);
    tt = "";
    t += "</tr><tr>" + TdSkill(10040, QuestLimit, LocaleLimit, EventLimit, TalentLimit, HeulwenEngineeringItem.length - 1, HeulwenEngineeringItem[0]);
    for (var i = 1; i < HeulwenEngineeringItem.length; i++) {
      if (i != 1) t += "</tr><tr>";
      tt = "";
      for (var j = 0; j < HeulwenEngineeringItem[i].length; j += 2) {
        tt += TdMaterial(HeulwenEngineeringItem[i][j], "×" + HeulwenEngineeringItem[i][j + 1], 560 / HeulwenEngineeringItem[i].length)
      }
      t += "<td width='580'>" + CompleteTable(tt, 560) + "</td>"
    }
  } catch (e) {
    e
  }
  try {
    let MagicCraftItem = eval("MagicCraftItem" + Id);
    if (SightOfOtherSideMagicCraftList.includes(Id)) OtherSkill = 58010;
    tt = "";
    t += "</tr><tr>" + TdSkill(10041, QuestLimit, LocaleLimit, EventLimit, TalentLimit, MagicCraftItem.length - 1, MagicCraftItem[0], "", OtherSkill);
    for (var i = 1; i < MagicCraftItem.length; i++) {
      if (i != 1) t += "</tr><tr>";
      tt = "";
      for (var j = 0; j < MagicCraftItem[i].length; j += 2) {
        tt += TdMaterial(MagicCraftItem[i][j], "×" + MagicCraftItem[i][j + 1], 560 / MagicCraftItem[i].length)
      }
      t += "<td width='580'>" + CompleteTable(tt, 560) + "</td>"
    }
    OtherSkill = ""
  } catch (e) {
    e
  }
  if (RareMineralogyList.includes(Id)) {
    t += "</tr><tr>" + TdSkill(10042) + TdText("希尔文矿山")
  }
  if (SulienEcologyList.includes(Id)) {
    t += "</tr><tr>" + TdSkill(10043) + TdText("希里安生态保护区")
  }
  if (FindMaterialList.includes(Id)) {
    t += "</tr><tr>" + TdSkill(10045) + TdText("击杀任意怪")
  }
  try {
    let StationaryCraftItem = eval("StationaryCraftItem" + Id);
    t += "</tr><tr>" + TdSkill(10104, QuestLimit, LocaleLimit, EventLimit, TalentLimit, StationaryCraftItem.length - 1, StationaryCraftItem[0]);
    for (var i = 1; i < StationaryCraftItem.length; i++) {
      if (i != 1) t += "</tr><tr>";
      tt = "";
      for (var j = 0; j < StationaryCraftItem[i].length; j += 2) {
        tt += TdMaterial(StationaryCraftItem[i][j], "×" + StationaryCraftItem[i][j + 1], 560 / StationaryCraftItem[i].length)
      }
      t += "<td width='580'>" + CompleteTable(tt, 560) + "</td>"
    }
  } catch (e) {
    e
  }
  try {
    let FynnsCraftItem = eval("FynnsCraftItem" + Id);
    t += "</tr><tr>" + TdSkill(27103, QuestLimit, LocaleLimit, EventLimit, TalentLimit, FynnsCraftItem.length - 1, FynnsCraftItem[0]);
    for (var i = 1; i < FynnsCraftItem.length; i++) {
      if (i != 1) t += "</tr><tr>";
      tt = "";
      for (var j = 0; j < FynnsCraftItem[i].length; j += 2) {
        tt += TdMaterial(FynnsCraftItem[i][j], "×" + FynnsCraftItem[i][j + 1], 560 / FynnsCraftItem[i].length)
      }
      t += "<td width='580'>" + CompleteTable(tt, 560) + "</td>"
    }
  } catch (e) {
    e
  }
  try {
    let ManaFormingItem = eval("ManaFormingItem" + Id);
    if (FireballManaFormingList.includes(Id)) {
      OtherSkill = 30202
    } else if (IceSpearManaFormingList.includes(Id)) {
      OtherSkill = 30302
    } else if (ThunderManaFormingList.includes(Id)) {
      OtherSkill = 30102
    }
    t += "</tr><tr>" + TdSkill(35001, QuestLimit, LocaleLimit, EventLimit, TalentLimit, ManaFormingItem.length - 1, ManaFormingItem[0], "", OtherSkill);
    for (var i = 1; i < ManaFormingItem.length; i++) {
      if (i != 1) t += "</tr><tr>";
      tt = "";
      for (var j = 0; j < ManaFormingItem[i].length; j += 2) {
        tt += TdMaterial(ManaFormingItem[i][j], "×" + ManaFormingItem[i][j + 1], 560 / ManaFormingItem[i].length)
      }
      t += "<td width='580'>" + CompleteTable(tt, 560) + "</td>"
    }
    OtherSkill = ""
  } catch (e) {
    e
  }
  try {
    let MetalConversionItem = eval("MetalConversionItem" + Id);
    t += "</tr><tr>" + TdSkill(35012, QuestLimit, LocaleLimit, EventLimit, TalentLimit, MetalConversionItem.length - 1, MetalConversionItem[0], "", OtherSkill);
    for (var i = 1; i < MetalConversionItem.length; i++) {
      if (i != 1) t += "</tr><tr>";
      tt = TdMaterial(MetalConversionItem[i][0], "×" + MetalConversionItem[i][1] + "～" + MetalConversionItem[i][2], 560 / MetalConversionItem[i].length);
      t += "<td width='580'>" + CompleteTable(tt, 560) + "</td>"
    }
  } catch (e) {
    e
  }
  try {
    let MiningItem = eval("MiningItem" + Id);
    t += "</tr><tr>" + TdSkill(55002) + TdText(MiningItem[0])
  } catch (e) {
    e
  }
  tt = "";
  for (var i = 0; i < KillItemList.length; i++) {
    if (KillItemList[i][1].includes(Id)) {
      if (tt != "") tt += "、";
      tt += KillItemList[i][0]
    }
  }
  if (tt != "") {
    for (var i = 0; i < QuestKillList.length; i++) {
      if (QuestKillList[i].includes(Id)) QuestLimit += QuestKillList[i][0]
    }
    t += "</tr><tr>" + TdSkill("击杀", QuestLimit) + TdText(tt)
  }
  QuestLimit = "";
  try {
    let GatherItem = eval("GatherItem" + Id);
    for (var i = 0; i < EventGatherList.length; i++) {
      if (EventGatherList[i].includes(Id)) EventLimit += EventGatherList[i][0]
    }
    let a = "";
    if (["GetWater", 55005].includes(GatherItem[0])) {
      a = TdMaterial(63020, "", 100)
    }
    let b = TdText(GatherItem[1]);
    if (GatherItem[1] + 0 == GatherItem[1]) {
      a = "";
      b = "";
      for (var i = 1; i < GatherItem.length; i += 2) {
        b += TdMaterial(GatherItem[i], "×" + GatherItem[i + 1])
      }
    }
    t += "</tr><tr>" + TdSkill(GatherItem[0], QuestLimit, LocaleLimit, EventLimit) + "<td width='580'>" + CompleteTable(a + b, 560) + "</td>";
    EventLimit = "";
    QuestLimit = ""
  } catch (e) {
    e
  }
  try {
    let MissionScrollItem = eval("MissionScrollItem" + Id);
    tt = "";
    for (var i = 0; i < MissionScrollItem.length; i += 2) {
      tt += TdMaterial(MissionScrollItem[i], "×" + MissionScrollItem[i + 1], 160)
    }
    t += "</tr><tr>" + TdQuest(1) + "<td width='580'>" + CompleteTable(tt, 560) + "</td>";
    QuestLimit = ""
  } catch (e) {
    e
  }
  tt = "";
  RowsQuantity = 0;
  for (var i = 0; i < ExplorationItemList.length; i++) {
    if (ExplorationItemList[i][1].includes(Id)) {
      if (tt != "") tt += "<br>";
      tt += ExplorationItemList[i][0];
      RowsQuantity++;
      if (i > 1) {
        OtherSkill = 23104
      }
    }
  }
  if (tt != "") t += "</tr><tr>" + TdSkill(50014, "", "", "", "", RowsQuantity, "", "", OtherSkill) + TdText(tt);
  OtherSkill = "";
  tt = "";
  RowsQuantity = 0;
  for (var i = 0; i < RelicInvestigationItemList.length; i++) {
    if (RelicInvestigationItemList[i][1].includes(Id)) {
      if (tt != "") tt += "</tr><tr>";
      tt += "<td width='580'>" + CompleteTable(TdMaterial(RelicInvestigationItemList[i][0], "×1"), 300) + "</td>";
      RowsQuantity++
    }
  }
  if (tt != "") t += "</tr><tr>" + TdSkill(57002, "", "", "", "", RowsQuantity) + tt;
  for (var i = 0; i < GiftItemList.length; i++) {
    tt = "";
    RowsQuantity = 0;
    AmendQuantity = "";
    for (var j = 1; j < GiftItemList[i].length; j++) {
      if (GiftItemList[i][j][2].includes(Id)) {
        if (tt != "") tt += "</tr><tr>";
        if (GiftItemList[i][j][3] > 1) AmendQuantity = "×" + GiftItemList[i][j][3];
        tt += "<td width='580'>" + CompleteTable(TdMaterial(GiftItemList[i][j][1], AmendQuantity, 170) + TdText(GiftItemList[i][j][0]), 560) + "</td>";
        RowsQuantity++
      }
    }
    if (tt != "") t += "</tr><tr>" + TdSkill(GiftItemList[i][0], "", "", "", "", RowsQuantity) + tt
  }
  for (var i = 0; i < QuestItemList.length; i++) {
    tt = "";
    for (var j = 1; j < QuestItemList[i].length; j++) {
      if (QuestItemList[i][j].includes(Id)) {
        if (tt != "") tt += "<br>";
        tt += QuestItemList[i][j][0]
      }
    }
    if (tt != "") t += "</tr><tr>" + TdQuest(QuestItemList[i][0]) + TdText(tt)
  }
  try {
    let QuestItem = eval("QuestItem" + Id);
    for (var i = 0; i < QuestItem.length; i++) {
      t += "</tr><tr>" + TdQuest(QuestItem[i][0]) + TdText(QuestItem[i][1])
    }
  } catch (e) {
    e
  }
  try {
    let SellItem = eval("SellItem" + Id);
    for (var i = 0; i < EventSellList.length; i++) {
      if (EventSellList[i].includes(Id)) EventLimit += EventSellList[i][0]
    }
    for (var i = 0; i < SellItem.length; i++) {
      tt = "";
      t += "</tr><tr>" + TdCurrency(SellItem[i][0], SellItem[i][1], EventLimit);
      for (var j = 2; j < SellItem[i].length; j++) {
        if (["NPC", "Pet"].includes(SellItem[i][j][0])) {
          for (var k = 1; k < SellItem[i][j].length; k++) {
            tt += TdCharacter(SellItem[i][j][k], SellItem[i][j][0])
          }
        } else {
          tt += TdText(SellItem[i][j])
        }
      }
      t += "<td width='580'>" + CompleteTable(tt) + "</td>"
    }
    EventLimit = ""
  } catch (e) {
    e
  }
  let UseItem = "";
  tt = "";
  RowsQuantity = 0;
  for (var i = 0; i < UseList.length; i++) {
    UseItem = eval("Item" + UseList[i]);
    if (UseItem[1].includes(Id)) {
      if (tt != "") tt += "</tr><tr>";
      tt += "<td width='580'>" + CompleteTable(TdMaterial(UseList[i]), 560) + "</td>";
      RowsQuantity++
    }
  }
  if (tt != "") t += "</tr><tr>" + TdSkill("使用", "", "", "", "", RowsQuantity) + tt;
  if (CheckT == t) {
    t += "</tr><tr>" + TdText("？", 667)
  }
  return CompleteTable(t, 860, 1)
}

function ItemDissolution(Id) {
  let ItemName = eval("Item" + Id);
  let tt = "";
  let t;
  BreakLabel:for (let i = 0; i < DissolutionItemList.length; i++) {
    if (DissolutionItemList[i][0] == Id) {
      t = "<td title='ClassID：" + AmendId(Id) + "' class='MainTd'><img border='0' src='img/Item/" + AmendId(Id) + ".png'><br>" + ItemName[0] + "<br>×" + DissolutionItemList[i][1][0] + "</td></tr><tr>" + TdSkill(10030, "", "", "", "", 1, DissolutionItemList[i][1][1]);
      for (let j = 0; j < DissolutionItemList[i][2].length; j += 3) {
        tt += TdMaterial(DissolutionItemList[i][2][j], "×" + DissolutionItemList[i][2][j + 1] + "～" + DissolutionItemList[i][2][j + 2], 745 / DissolutionItemList[i][2].length)
      }
      t += "</tr><tr><td>" + CompleteTable(tt, 760) + "</td>";
      break BreakLabel
    }
  }
  return CompleteTable(t, 765, 1)
}

function Product(Id) {
  let Flight = 0;
  let Product = eval("Product" + Id);
  let t = "";
  let tt = "";
  let ttt = "";
  let t0 = "兑换";
  if ((Id + "").charAt(3) == 5) {
    ttt = "<td colspan=2 style='background-color:gold;color:gold'>" + "商团专用" + "</td></tr><tr>";
    t0 = "购买";
    Flight = 1
  }
  if (Product.length > 11) {
    for (let i = 0; i < Product[11].length; i += 2) {
      tt += TdMaterial(Product[11][i], "×" + Product[11][i + 1])
    }
    tt = TdText("交换时需要的材料") + "<td>" + CompleteTable(tt, 440) + "</td></tr><tr>"
  } else {
    t = "<br>信用等级" + Product[2];
    tt = TdText("成本价<br><font color='#AAAAAA'>(折扣另算)</font>") + "<td>" + Product[6] + " <font color='#AAAAAA'>(满库存时)</font>～" + Product[7] + " <font color='#AAAAAA'>(零库存时)</font>" + "</td></tr><tr>"
  }
  if (Product.length > 10) {
    tt += TdText("每周" + t0 + "次数") + TdText(Product[10])
  }
  t = "<td class='MainTd' rowspan=6 width=200><img border='0' src='img/Product/" + Id + ".png'><br>" + Product[0] + "</td><td colspan=2>" + CompleteTable(ttt + "<td><img border='0' src='img/Post/" + Product[1] + ".png'></td><td width=200>" + eval("Post" + Product[1] + "[0]") + t + "</td>", 200) + "</tr><tr>" + TdText("单个重量", 100) + "<td width=450>" + Product[3] + "</td></tr><tr>" + TdText("每个箱位可容数量") + "<td>" + Product[4] + "</td></tr><tr>" + TdText("库存上限") + "<td>" + Product[5] + "</td></tr><tr>" + tt;
  if (Math.floor(Id / 10000) != 2) {
    t += "</tr><tr><td colspan=3><br>" + Capacity(Product[3], Product[4], Flight) + "</td>"
  }
  return CompleteTable(t, 830, 1)
}

function Capacity(Weight, MaxBundle, Flight) {
  let t1 = "";
  let t2 = "</tr><tr>";
  let t3 = "</tr><tr>";
  let Transport;
  let Capacity;
  let MaxCapacity = 0;
  for (let i = 1; i < [45, 1002][Flight]; i++) {
    while ([15, 16, 20, 27, 28, 29, 30, 31, 32, 33, 34, 35].includes(i)) {
      i++
    }
    if (i == 45) {
      i = 1001
    }
    Transport = eval("Transport" + i);
    t1 += "<td onmouseover='ShowTransportData(this," + i + ")' onmouseout='ShowTransportData(this)'><img border='0' src='img/Transport/" + Transport[1] + ".png'></td>";
    t2 += "<td>" + Math.min(MaxBundle * Transport[2], Math.trunc(Transport[3] / Weight)) + "</td>";
    Capacity = Math.min(MaxBundle * (Transport[2] + 1), Math.trunc((Transport[3] + 100) / Weight));
    t3 += "<td name=Capacity" + Capacity + ">" + Capacity + "</td>";
    MaxCapacity = Math.max(MaxCapacity, Capacity);
    if ([44, 1001].includes(i)) {
      setTimeout("MaxCapacity(" + MaxCapacity + ")", 0)
    }
  }
  let t = "<td height=53></td><td rowspan=3><div class='Capacity' id='Capacity'>" + CompleteTable(t1 + t2 + t3, 1152, 1) + "</div></td></tr><tr><td>装载量</td></tr><tr><td>装载量<br>宗师级商人</td>";
  return CompleteTable(t, 780, 1)
}

function MaxCapacity(Capacity) {
  let MaxCapacity = document.getElementsByName("Capacity" + Capacity);
  for (var i = 0; i < MaxCapacity.length; i++) {
    MaxCapacity[i].className = "MainTd"
  }
}

function ErgEnhances(Id) {
  let ErgEnhanceItem = eval(Id);
  let Limit = "";
  let tt = "";
  let t = "<td style='font-size:30pt' class='MainTd'>" + ErgEnhanceItem[0] + "</td><td>开放尔格最高等级<br>成功率：" + ErgEnhanceItem[1] + "%</td></tr><tr>";
  for (var i = 0; i < ErgEnhanceItem[2].length; i++) {
    if (i > 3) Limit = ErgEnhanceItem[2][i][2];
    if (Limit != "") Limit += "<br>";
    tt += TdMaterial(ErgEnhanceItem[2][i][0], Limit + "×" + ErgEnhanceItem[2][i][1])
  }
  t += "</tr><tr><td colspan=2>" + CompleteTable(tt, 845) + "</td>";
  return CompleteTable(t, 850, 1)
}

function CompleteTable(t, Width = "", Type = 0) {
  if (Width != "") {
    Width = " width='" + Width + "'"
  }
  let TableTop = "<table cellspacing=0 border=1 align='center' style='text-align:center;' bgColor=black " + Width + " bordercolor=";
  let TableBottom = "</tr></table>";
  if (Type == 0) {
    TableTop += "black id='MaterialLists'><tr>"
  } else {
    TableTop += "gold><tr>";
    TableBottom += "<br>"
  }
  return TableTop + t + TableBottom
}

function GetRandom(Min, Max) {
  return Math.floor(Math.random() * (Max - Min + 1)) + Min
}

function ItemColor(Id, t) {
  let ItemId = document.getElementsByName("Item" + Id);
  if (t.style.background == "") {
    let ColorId = "hsl(" + GetRandom(0, 360) + "," + GetRandom(0, 50) + "%," + GetRandom(50, 60) + "%)";
    for (var j = 0; j < ItemId.length; j++) {
      ItemId[j].style.background = ColorId
    }
  } else {
    for (var j = 0; j < ItemId.length; j++) {
      ItemId[j].style.background = ""
    }
  }
}

function Cuisine(Id) {
  if (CuisineNow != 0) document.getElementById("Cuisine" + CuisineNow).className = "";
  document.getElementById("Cuisine" + Id).className = "ListTd";
  CuisineNow = Id;
  MainBody(Id)
}

function TdEffect(Item) {
  let Effect = "";
  let Effect1 = "";
  let Effect2 = "";
  for (var i = 1; i < Item.length; i++) {
    Effect = eval(Item[i][0] + "Effect(Item[i])");
    if (i >= 2) {
      Effect1 += "<td width=10 rowspan=2></td>"
    }
    Effect1 += "<td style='border: 1px solid gold;' class='EffectTitle' colspan=" + (Effect.length - 1) + ">" + Effect[0] + "</td>";
    for (var j = 1; j < Effect.length; j++) {
      Effect2 += "<td style='border: 1px solid gold;padding: 5px;'>" + Effect[j] + "</td>"
    }
  }
  if (Item.length > 1) {
    Effect = "<br>" + CompleteTable(Effect1 + "</tr><tr>" + Effect2) + "<br>"
  }
  return Effect
}

function EffectAmend(Effect) {
  if (Effect + 0 != Effect) {
    Effect = Effect.replace(/[(]/, "<font color='#FFFFFF' size='1px'>+(");
    Effect = Effect.replace(/[)]/, ")</font>")
  }
  return Effect
}

function OHSwordEffect(Effect) {
  let Effect1 = EffectWeapon(Effect[1]);
  if (Effect[3]) {
    Effect1 += EffectOther(Effect[3])
  }
  let Effect2 = EffectWeapon0(Effect[2]);
  Effect = ["单手剑", Effect1, Effect2];
  return Effect
}

function THSwordEffect(Effect) {
  let Effect1 = EffectWeapon(Effect[1]);
  if (Effect[3]) {
    Effect1 += EffectOther(Effect[3])
  }
  let Effect2 = EffectWeapon0(Effect[2]);
  Effect = ["双手剑", Effect1, Effect2];
  return Effect
}

function OHAxeEffect(Effect) {
  let Effect1 = EffectWeapon(Effect[1]);
  let Effect2 = EffectWeapon0(Effect[2]);
  Effect = ["单手斧", Effect1, Effect2];
  return Effect
}

function THAxeEffect(Effect) {
  let Effect1 = EffectWeapon(Effect[1]);
  let Effect2 = EffectWeapon0(Effect[2]);
  Effect = ["双手斧", Effect1, Effect2];
  return Effect
}

function OHBluntEffect(Effect) {
  let Effect1 = EffectWeapon(Effect[1]);
  let Effect2 = EffectWeapon0(Effect[2]);
  Effect = ["单手钝器", Effect1, Effect2];
  return Effect
}

function THBluntEffect(Effect) {
  let Effect1 = EffectWeapon(Effect[1]);
  let Effect2 = EffectWeapon0(Effect[2]);
  Effect = ["双手钝器", Effect1, Effect2];
  return Effect
}

function WandEffect(Effect) {
  let Effect1 = EffectWeapon(Effect[2]);
  if (Effect[4]) {
    Effect1 += EffectOther(Effect[4])
  }
  let Effect2 = EffectWeapon0(Effect[3]);
  Effect = [["特拉伊", "雷箭", "冰箭", "火箭", "治疗", "打击用"][Effect[1]] + "魔杖", Effect1, Effect2];
  return Effect
}

function StaffEffect(Effect) {
  let Effect1 = EffectWeapon(Effect[1]);
  if (Effect[3]) {
    Effect1 += EffectOther(Effect[3])
  }
  let Effect2 = EffectWeapon0(Effect[2]);
  Effect = ["法杖", Effect1, Effect2];
  return Effect
}

function CylinderEffect(Effect) {
  let Effect1 = EffectWeapon(Effect[1]);
  if (Effect[3]) {
    Effect1 += EffectOther(Effect[3])
  }
  let Effect2 = EffectWeapon0(Effect[2]);
  for (var i = 4; i < Effect[2].length; i++) {
    Effect2 += "<font color='#" + ["FF0000", "FFFF00", "0000FF", "FFFFFF"][i - 4] + "'>" + ["火", "土", "水", "风"][i - 4] + "炼金术 " + Effect[2][i] + "%</font><br>"
  }
  Effect = ["铳炮", Effect1, Effect2];
  return Effect
}

function KnuckleEffect(Effect) {
  let Effect1 = EffectWeapon(Effect[1]);
  if (Effect[3]) {
    Effect1 += EffectOther(Effect[3])
  }
  let Effect2 = EffectWeapon0(Effect[2]);
  if (Effect[4]) {
    Effect2 += EffectOther(Effect[4])
  }
  Effect = ["拳套", Effect1, Effect2];
  return Effect
}

function HeavyArmorEffect(Effect) {
  let Effect0 = EffectArmors(Effect[1]);
  if (Effect[2]) {
    Effect0 += EffectOther(Effect[2])
  }
  Effect = ["重甲", Effect0];
  return Effect
}

function HelmEffect(Effect) {
  let Effect0 = EffectArmors(Effect[1]);
  if (Effect[2]) {
    Effect0 += EffectOther(Effect[2])
  }
  Effect = ["重甲头盔", Effect0];
  return Effect
}

function GauntletEffect(Effect) {
  let Effect0 = EffectArmors(Effect[1]);
  Effect = ["重甲手套", Effect0];
  return Effect
}

function ArmorbootsEffect(Effect) {
  let Effect0 = EffectArmors(Effect[1]);
  Effect = ["重甲鞋子", Effect0];
  return Effect
}

function ShieldEffect(Effect) {
  let Effect1 = EffectArmors(Effect[1]);
  let Effect2 = EffectShield(Effect[2]);
  Effect = ["盾牌", Effect1, Effect2];
  return Effect
}

function GuardCylinderEffect(Effect) {
  let Effect1 = EffectArmors(Effect[1]);
  if (Effect[3]) {
    Effect1 += EffectOther(Effect[3])
  }
  let Effect2 = EffectWeapon0(Effect[2][1]) + EffectShield(Effect[2][0]);
  Effect = ["盾铳", Effect1, Effect2];
  return Effect
}

function LightArmorEffect(Effect) {
  let Effect0 = EffectArmors(Effect[1]);
  if (Effect[2]) {
    Effect0 += EffectOther(Effect[2])
  }
  Effect = ["轻甲", Effect0];
  return Effect
}

function HeadgearEffect(Effect) {
  let Effect0 = EffectArmors(Effect[1]);
  if (Effect[2]) {
    Effect0 += EffectOther(Effect[2])
  }
  Effect = ["帽子", Effect0];
  return Effect
}

function GloveEffect(Effect) {
  let Effect0 = EffectArmors(Effect[1]);
  Effect = ["手套", Effect0];
  return Effect
}

function ShoesEffect(Effect) {
  let Effect0 = EffectArmors(Effect[1]);
  Effect = ["鞋子", Effect0];
  return Effect
}

function ClothArmorEffect(Effect) {
  let Effect0 = EffectArmors(Effect[1]);
  if (Effect[2]) {
    Effect0 += EffectOther(Effect[2])
  }
  Effect = ["布衣", Effect0];
  return Effect
}

function RobeEffect(Effect) {
  let Effect0 = EffectArmors(Effect[1]);
  if (Effect[2]) {
    Effect0 += EffectOther(Effect[2])
  }
  Effect = ["长袍", Effect0];
  return Effect
}

function AccessaryEffect(Effect) {
  let Effect0 = "";
  for (var i = 3; i < Effect[1].length; i += 2) {
    Effect0 += `${EffectName[Effect[1][i]]}${EffectAmend(Effect[1][i + 1])}<br>`
  }
  Effect0 = `防御力 ${EffectAmend(Effect[1][0])}<br>保护 ${EffectAmend(Effect[1][1])}<br>${Effect0}耐久力 ${Effect[1][2]}<br>`;
  if (Effect[2]) {
    Effect0 += EffectOther(Effect[2])
  }
  Effect = ["首饰", Effect0];
  return Effect
}

function InstrumentEffect(Effect) {
  let Effect1 = EffectWeapon(Effect[1]);
  if (Effect[3]) {
    Effect1 += EffectOther(Effect[3])
  }
  try {
    let Effect2 = EffectWeapon0(Effect[2]);
    Effect = ["乐器", Effect1, Effect2]
  } catch (e) {
    Effect = ["乐器", Effect1]
  }
  return Effect
}

function MagicAssistanceBookEffect(Effect) {
  let Effect1 = EffectArmors(Effect[1]);
  if (Effect[2]) {
    Effect1 += EffectOther(Effect[2])
  }
  Effect = ["魔法书", Effect1];
  return Effect
}

function HandleEffect(Effect) {
  let Effect1 = EffectWeapon(Effect[1]);
  if (Effect[3]) {
    Effect1 += EffectOther(Effect[3])
  }
  let Effect2 = EffectWeapon0(Effect[2]);
  Effect = ["操纵杆", Effect1, Effect2];
  return Effect
}

function DualgunEffect(Effect) {
  let Effect1 = `${EffectWeapon(Effect[1])}子弹 ${EffectAmend(Effect[1][9])}<br>`;
  let Effect2 = `体力消耗 ${Effect[2][0]}<br>`;
  Effect = ["双枪", Effect1, Effect2];
  return Effect
}

function ShurikenEffect(Effect) {
  let Effect1 = EffectWeapon(Effect[1]);
  if (Effect[3]) {
    Effect1 += EffectOther(Effect[3])
  }
  let Effect2 = `体力消耗 ${Effect[2][0]}<br>`;
  Effect = ["手里剑", Effect1, Effect2];
  return Effect
}

function DreamcatcherEffect(Effect) {
  let Effect1 = EffectWeapon(Effect[1]);
  Effect1 += "变身收集几率增加 " + Effect[1][9] + "%";
  let Effect2 = EffectWeapon0(Effect[2]);
  Effect = ["逐梦者", Effect1, Effect2];
  return Effect
}

function ChainbladeEffect(Effect) {
  let Effect1 = EffectWeapon(Effect[1]);
  if (Effect[3]) {
    Effect1 += EffectOther(Effect[3])
  }
  let Effect2 = EffectWeapon0(Effect[2]);
  Effect = ["链刃", Effect1, Effect2];
  return Effect
}

function FynnbellEffect(Effect) {
  let Effect1 = EffectWeapon(Effect[1]);
  Effect1 += eval("`" + ["菲尼宝珠掉落率 +{0}%", "菲恩工艺制作成功时，获得相当于生产经验值 {0}% 的探险经验值"][Effect[1][9]].replace("{0}", "${EffectAmend(Effect[1][10])}") + "<br>`");
  let Effect2 = EffectWeapon0(Effect[2]);
  Effect = ["菲恩铃", Effect1, Effect2];
  return Effect
}

function BowEffect(Effect) {
  let Effect1 = EffectWeapon(Effect[1]);
  if (Effect[3]) {
    Effect1 += EffectOther(Effect[3])
  }
  let Effect2 = EffectWeapon0(Effect[2]);
  Effect = ["弓", Effect1, Effect2];
  return Effect
}

function CrossbowEffect(Effect) {
  let Effect1 = EffectWeapon(Effect[1]);
  if (Effect[3]) {
    Effect1 += EffectOther(Effect[3])
  }
  let Effect2 = EffectWeapon0(Effect[2]);
  Effect = ["弩", Effect1, Effect2];
  return Effect
}

function LanceEffect(Effect) {
  let Effect1 = EffectWeapon(Effect[1]);
  if (Effect[3]) {
    Effect1 += EffectOther(Effect[3])
  }
  let Effect2 = `刺击范围 ${Effect[2][4]}~ ${Effect[2][5]}<br>滑动幅度 ${Effect[2][6]}<br>${EffectWeapon0(Effect[2])}`;
  if (Effect[4]) {
    Effect2 += EffectOther(Effect[4])
  }
  Effect = ["骑士枪", Effect1, Effect2];
  return Effect
}

function MagicalKnuckleEffect(Effect) {
  let Effect1 = EffectWeapon(Effect[1]);
  if (Effect[3]) {
    Effect1 += EffectOther(Effect[3])
  }
  let Effect2 = EffectWeapon0(Effect[2]);
  Effect = ["魔力拳套", Effect1, Effect2];
  return Effect
}

function MarionetteEffect(Effect) {
  let Effect1 = EffectArmors(Effect[1]);
  if (Effect[2]) {
    Effect1 += EffectOther(Effect[2])
  }
  Effect = ["人偶", Effect1];
  return Effect
}

function ArrowEffect(Effect) {
  let Effect1 = `${EffectName[9]}+${EffectAmend(Effect[1][0])}<br>${EffectName[10]}+${EffectAmend(Effect[1][1])}<br>`;
  if (Effect[1][2]) {
    Effect1 += `命中率+${Effect[1][2]}%<br>`
  }
  if (Effect[1][3]) {
    Effect1 += `暴击率+${Effect[1][3]}%<br>`
  }
  if (Effect[2]) {
    Effect1 += Effect[2]
  }
  Effect = ["弓箭", Effect1];
  return Effect
}

function BoltEffect(Effect) {
  let Effect1 = `${EffectName[9]}+${EffectAmend(Effect[1][0])}<br>${EffectName[10]}+${EffectAmend(Effect[1][1])}<br>`;
  if (Effect[1][2]) {
    Effect1 += `命中率+${Effect[1][2]}%<br>`
  }
  if (Effect[1][3]) {
    Effect1 += `暴击率+${Effect[1][3]}%<br>`
  }
  Effect = ["弩箭", Effect1];
  return Effect
}

function BallistaBoltEffect(Effect) {
  let Effect1 = `攻击 ${Effect[1][0]}~ ${Effect[1][1]}<br>负伤率 ${Effect[1][2]}~ ${Effect[1][3]}%<br>暴击率 ${Effect[1][4]}%<br>平衡性 ${Effect[1][5]}%<br>`;
  if (Effect[1][6]) {
    Effect1 += `命中率+${Effect[1][6]}%<br>`
  }
  Effect = ["弩炮弹药", Effect1];
  return Effect
}

function BulletEffect(Effect) {
  let Effect1 = `${EffectName[9]}+${EffectAmend(Effect[1][0])}<br>${EffectName[10]}+${EffectAmend(Effect[1][1])}<br>`;
  Effect = ["魔力弹", Effect1];
  return Effect
}

function EffectWeapon(Effect) {
  let Effect0 = `远距离(射程 ${Effect[1]})`;
  if (Effect[1] < 10) {
    Effect0 = `${Effect[1]}攻击次数`
  }
  Effect0 = `${["非常快", "快", "普通", "慢", "非常慢"][Effect[0]]}${Effect0}<br>攻击 ${EffectAmend(Effect[2])}~ ${EffectAmend(Effect[3])}<br>负伤率 ${EffectAmend(Effect[4])}~ ${EffectAmend(Effect[5])}%<br>暴击率 ${EffectAmend(Effect[6])}%<br>平衡性 ${EffectAmend(Effect[7])}%<br>耐久力 ${EffectAmend(Effect[8])}<br>`;
  return Effect0
}

function EffectWeapon0(Effect) {
  let Effect0 = "";
  for (var i = 0; i < Effect.length & i < 4; i++) {
    Effect0 += eval("`" + ["溅射半径{0}", "溅射角度{0}", "溅射伤害{0}%", "体力消耗{0}"][i].replace("{0}", ' ${Effect[i]} ') + "<br>`")
  }
  return Effect0
}

function EffectArmors(Effect) {
  let Effect0 = "";
  if (Effect.length > 3) {
    Effect0 = "魔法防御力 " + EffectAmend(Effect[3]) + "<br>";
    if (Effect[4]) {
      Effect0 += "魔法保护 " + EffectAmend(Effect[4]) + "<br>"
    }
  }
  Effect0 = "防御力 " + EffectAmend(Effect[0]) + "<br>保护 " + EffectAmend(Effect[1]) + "<br>" + Effect0;
  if (Effect[2]) {
    Effect0 += "耐久力 " + EffectAmend(Effect[2]) + "<br>"
  }
  ;
  return Effect0
}

function EffectShield(Effect) {
  let Effect0 = "";
  for (var i = 0; i < Effect.length; i++) {
    Effect0 = eval("`" + ["防御时，远程防御力增加{0}", "防御时，近战防御力增加{0}", "暴击抵抗率增加{0}%", "近战防御力增加{0}"][i].replace("{0}", " ${Effect[i]}") + "<br>${Effect0}`")
  }
  return Effect0
}

function EffectOther(Effect) {
  let Effect0 = "";
  for (var i = 0; i < Effect.length; i += 2) {
    Effect0 += eval("`" + [["最大生命值增加{0}", "最大魔法值增加{0}", "最大体力值增加{0}", "力量增加{0}", "敏捷增加{0}", "智力增加{0}", "意志增加{0}", "幸运增加{0}", "防御增加{0}", "保护增加{0}", "魔法攻击力{0} 增加", "魔法防御力增加{0}", "魔法保护增加{0}", "穿刺等级{0}", "魔法恢复{0}% 增加", "魔法消耗减少{0}%"], ["近距离攻击自动防御率：{0}.00%", "远距离攻击自动防御率：{0}.00%", "魔法攻击自动防御率：{0}.00%", "使攻击目标陷入冰冻状态几率{0}.00%", "冰冻状态持续时间{0} 秒"], ["爆破箭碎片伤害增加{0}%", "爆破箭碎片范围增加{0}m", "穿心箭伤害增加{0}%"], ["电磁风暴冷却时间减少{0} 秒", "流星冷却时间减少{0} 秒"], ["链式铳炮冷却时间减少{0} 秒", "炼金术结晶保存功能"], ["连续技伤害增加{0}%", "连续技：飞身踢溅射范围增加{0}%", "猛袭伤害增加{0}%"], ["音乐技能的增益效果{0} 增加", "音乐技能增益效果的持续时间{0}增加"], ["人偶操纵术范围增加{0}", "人偶死亡时以{0}% 概率复活"], ["", "", "", ""], ["", "", "", ""]] [Effect[i][0]][Effect[i][1]].replace("{0}", ' ${EffectAmend(Effect[i+1])}') + "<br>`")
  }
  return "<font color='#0088FF'>" + Effect0 + "</font>"
}

function FoodEffect(Effect) {
  let Effect0 = EffectName[0] + " " + Effect[1] + " " + "秒";
  for (var i = 2; i < Effect.length; i++) {
    if (Effect[i] != 0) {
      if (Effect[i] > 0) {
        Effect0 += "<br>" + "<font color='#0000FF' class='EffectTd'>" + EffectName[i - 1] + " " + Effect[i] + " 增加</font>"
      } else if (Effect[i] < 0) {
        Effect0 += "<br>" + "<font color='#FF0000' class='EffectTd'>" + EffectName[i - 1] + " " + Math.abs(Effect[i]) + " 减少</font>"
      } else if (Effect[i] + 0 != Effect[i]) {
        Effect0 += "<br>" + Effect[i]
      }
    }
  }
  Effect = ["食物", Effect0];
  return Effect
}

function PetFoodEffect(Effect) {
  let Effect0 = "";
  for (var i = 1; i < Effect.length; i++) {
    if (Effect != 0) {
      if (Effect[i] > 0) {
        Effect0 += "<font color='#0000FF' class='EffectTd'>" + EffectName[i] + " " + Effect[i] + " 增加</font><br>"
      } else if (Effect[i] + 0 != Effect[i]) {
        Effect0 += "<br>" + Effect[i]
      }
    }
  }
  Effect = ["宠物食物", Effect0];
  return Effect
}

function FishEffect(Effect) {
  Effect = ["水产", "基础大小 " + Effect[1].toFixed(2) + " cm"];
  return Effect
}

function TrainingBaitEffect(Effect) {
  Effect = ["兽饵", "驯兽加成 " + Effect[1]];
  return Effect
}

function ElementEffect(Effect) {
  let Effect0 = "";
  for (var i = 1; i < Effect.length; i += 2) {
    Effect0 += ["毒免疫", "石化免疫", "减少魔法消耗", "减少体力消耗", "爆炸抵抗", "践踏抵抗", "增加魔法消耗", "增加体力消耗", "攻击速度增加", "半神化 强化", "重击 强化", "跳斩 强化", "冲撞 强化", "冰箭 强化", "火箭 强化", "治疗 强化", "火焰喷射 强化", "水炮 强化", "吸取生命 强化", "穿心箭 强化", "助攻箭 强化", "钓鱼 强化", "冶炼 强化", "打铁 强化", "淘金术 强化", "强化千金一掷", "获得变身情报的几率增加", "风车技能强化", "吸收伤害", "任务经验值强化", "跳斩强化", "跑调防止效果", "贸易移动速度", "提升料理生产经验值", "移动速度增加", "影子任务经验值强化", "水瓶座效果", "双鱼座效果", "白羊座效果", "金牛座效果", "双子座效果", "巨蟹座效果", "狮子座效果", "处女座效果", "天秤座效果", "天蝎座效果", "射手座效果", "摩羯座效果", "增加暴击伤害", "无限连击强化", "耐久度减少完善", "料理修炼值", "料理修炼值", "料理品质", "料理BUFF持续时间", "审判之刃强化", "骑士枪冲刺强化", "달콤한 향기", "사랑스러운 향기", "쌉싸름한 향기", "移动速度增加", "攻击延迟时间减少", "最大伤害增加", "魔法攻击力增加", "魔法消耗减少", "体力消耗减少", "暴击伤害增加", "探险经验值增加", "增加链击的多尔卡获得量", "增加死亡锁定伤害", "水瓶座效果", "双鱼座效果", "白羊座效果", "金牛座效果", "双子座效果", "巨蟹座效果", "狮子座效果", "处女座效果", "天秤座效果", "天蝎座效果", "射手座效果", "摩羯座效果", "神圣经验值强化", "起死回生发动几率增加", "坚定意志持续时间增加", "超越 : 生命持续时间增加", "连击发动几率增加", "致命穿透持续时间增加", "疾速持续时间增加", "起死回生发动几率增加", "坚定意志持续时间增加", "超越 : 生命持续时间增加", "连击发动几率增加", "致命穿透持续时间增加", "疾速持续时间增加", "채집 성공 확률 증가", "野蛮冲撞强化", "无限挥击强化", "战斗炼金术强化", "炼成炼金术强化", "英雄炼金术强化", "人偶抵抗僵直概率", "人偶暴击伤害倍率", "人偶术技能冷却时间减少", "战斗经验值增加", "电磁风暴强化", "增加有效射程", "정령 강화", "冰雹强化", "电磁风暴蓄力加速", "流星强化", "梦幻合唱效果强化", "音乐增益效果持续时间增加", "活跃进行曲增益效果增加", "战争序曲增益效果增加", "忍耐之歌增益效果增加", "丰收之歌增益效果增加", "摇篮曲增益效果增加", "行进曲增益效果增加", "风车强化", "无限斩强化", "无限挥击强化", "骑士枪冲刺乘骑冲撞强化", "爆破箭强化", "冲锋射击强化", "箭魔法组合强化", "连续技 : 飞身踢强化", "第2幕: 怒气上涌强化", "巨人冲击波强化", "冰雹强化", "飓风之链强化", "链刃突刺强化", "手里剑风暴强化", "狂乱强化", "无影箭强化", "樱时雨强化", "中级魔法强化", "增加贸易移动速度", "增加属性精通伤害", "魔法盾强化", "移动施法强化", "多尔卡精通强化", "连续技精通强化", "无限斩强化", "无限连击强化", "无限挥击强化", "暴击伤害增加", "耐久度减少完善", "巨人冲击波强化", "野蛮冲撞强化", "箭魔法组合强化", "魔法攻击力增加", "冰雹强化", "中级魔法强化", "爆破箭强化", "无影箭强化", "链式铳炮冷却时间减少", "所有属性炼金术伤害增加", "连续技伤害增加", "触发暴击时重置连续技冷却时间概率", "人偶术冷却时间减少", "人偶暴击伤害倍率", "人偶死亡时概率复活", "樱时雨强化", "手里剑风暴强化", "狂乱强化", "冲锋射击强化", "链刃突刺强化", "飓风之链强化", "双手武器无限斩强化", "最大伤害强化", "愤怒狂暴强化", "不屈斗志强化", "暴击增加", "炼金术伤害增加", "穿刺抵抗增加", "穿刺抵抗增加", "最大伤害增加", "最大伤害增加", "最大伤害增加", "非凡的连接强化", "永恒祈祷强化"][Effect[i]] + " " + Effect[i + 1] + " 增加<br>"
  }
  Effect = ["套装", Effect0];
  return Effect
}

function TdMain(Id, a) {
  let Effect = "";
  let ItemName = eval("Item" + Id);
  let c = " class='MainTd'";
  if (a == 1) Effect = TdEffect(ItemName);
  Effect = TdText(Effect, 0, 2);
  if (a != 1) {
    c = " name='Item" + Id + "' onclick='ItemColor(" + Id + ",this)' style='border:gold solid 5px;'";
    Effect = ""
  }
  let t = "<td title='ClassID：" + AmendId(Id) + "' width=180 rowspan=30" + c + "><img border='0' src='img/Item/" + AmendId(Id) + ".png'><br>" + ItemName[0] + "</td>" + Effect;
  return t
}

function TdSkill(Id, QuestLimit = "", LocaleLimit = "", EventLimit = "", TalentLimit = "", Rows, Lv, Difficulty = "", OtherSkillId = "", Progress = "", Other = "") {
  let t = "";
  let SkillLv = "";
  let SkillLevelName = ["练习级", "F级", "E级", "D级", "C级", "B级", "A级", "9级", "8级", "7级", "6级", "5级", "4级", "3级", "2级", "1级", "1段", "2段", "3段"];
  if (typeof Lv == "number") SkillLv = SkillLevelName[Lv];
  if (typeof Difficulty == "number") Difficulty = "\n难度：" + SkillLevelName[Difficulty];
  if (typeof Progress == "number") Progress = "\n单次完成度：" + Math.min(99.9, Progress * 100).toFixed(1) + "%";
  if (QuestLimit != "") t += "<td style='background-color:gold;color:silver' title='" + QuestLimit + "'>副本限定</td></tr><tr>";
  if (LocaleLimit != "") t += "<td style='background-color:gold;color:pink' title='" + LocaleLimit + "'>区服限定</td></tr><tr>";
  if (EventLimit != "") t += "<td style='background-color:gold;color:white' title='" + EventLimit + "活动'>活动限定</td></tr><tr>";
  if (TalentLimit != "") t += "<td style='background-color:gold;color:cyan'>" + TalentLimit + "专用</td></tr><tr>";
  if (Other != "") t += "<td>" + Other + "</td></tr><tr>";
  if (["GetWater", "AlpacaShearing", "AlpacaPaperSheep", "GetFireElemental", "GetIceElemental", "GetLightningElemental", "GetSilverVineBerry"].includes(Id)) {
    t += "<td><img border='0' src='img/Skill/" + Id + ".png'></td>"
  } else if ((Id + 0) != Id) {
    t += "<td>" + Id + "</td>"
  } else if (Id == 10020 & Lv >= 0) {
    let CookingActionNames = ["混合", "煎(火)", "煮(火)", "烧(火)", "炸(火)", "炒(火)", "和面", "做面条", "制作意大利面", "制做果酱(火)", "制做派", "蒸煮(火)", "制作披萨", "发酵", "水浴法(火)", "切片"];
    t += "<td onmouseover='ShowCookingTool(" + Lv + ",this)' onmouseout='ShowCookingTool()'><img border='0' title='" + eval("Skill" + Id + "[0]") + " " + SkillLv + "&#10;" + CookingActionNames[Lv] + "' src='img/Skill/" + Id + CookingActionNames[Lv] + ".png'></td>"
  } else {
    t += "<td><img border='0' title='" + eval("Skill" + Id + "[0]") + " " + SkillLv + Difficulty + Progress + "' src='img/Skill/" + Id + ".png'></td>"
  }
  if (OtherSkillId != "") t += "</tr><tr><td><img border='0' title='" + eval("Skill" + OtherSkillId + "[0]") + "' src='img/Skill/" + OtherSkillId + ".png'></td>";
  return "<td width=80 rowspan=" + Rows + ">" + CompleteTable(t, 70) + "</td>"
}

function TdQuest(Id) {
  let t = "<td width=80><img border='0' src='img/Quest/" + Id + ".png'></td>";
  return t
}

function TdCurrency(Id, Quantity, EventLimit = "") {
  let t = "";
  if (EventLimit != "") t += "<td style='background-color:gold;color:white' title='" + EventLimit + "活动'>活动限定</td></tr><tr>";
  if (Quantity > 9999) {
    if (Quantity % 10000 == 0) {
      Quantity = Math.floor(Quantity / 10000) + "万"
    } else {
      Quantity = Math.floor(Quantity / 10000) + "万" + Quantity % 10000
    }
  }
  if (Id == Id + 0) {
    if (Id == 2000) {
      Quantity += " Gold"
    } else if (Id == 72015) {
      Quantity += " 杜卡特"
    } else if (Id == 72016) {
      Quantity += " 赛季杜卡特"
    } else {
      Quantity += " 个"
    }
    t += "<td width=80 title='" + eval("Item" + Id + "[0]") + "' valign='Bottom'><img border='0' src='img/Item/" + Id + ".png'><br>" + Quantity + "<br>"
  } else {
    t += "<td width=80 valign='Bottom'>" + Id + "<br>" + Quantity + "分<br>"
  }
  return "<td width=80>" + CompleteTable(t, 70) + "</td>"
}

function TdMaterial(Id, Proportion = "", Width = 100, Rows = 1) {
  CheckCuisines(Id);
  let t;
  Width = " width=" + Width;
  if (Id == "") {
    t = "<td" + Width + "><br>"
  } else if (Id > 0) {
    let ItemName = eval("Item" + Id)[0];
    t = "<td title='ClassID：" + AmendId(Id) + "'" + Width + " name='Item" + Id + "' onclick='ItemColor(" + Id + ",this)' valign='Bottom' rowspan=" + Rows + "><img border='0' src='img/Item/" + AmendId(Id) + ".png'><br>" + ItemName + "<br>" + Proportion + "</td>"
  } else {
    t = "<td title='" + eval("Item" + Id + "[0][0]") + "' height='" + eval("Item" + Id + "[0][1]") + "'" + Width + " valign='Bottom' bgColor=#AAAAAA><div name='Item" + Id + "'></div>" + Proportion + "</td>";
    try {
      if (eval("Item" + Id + "On==0")) {
        setTimeout("ItemCategory('" + Id + "')", 100);
        eval("Item" + Id + "On= 1")
      }
    } catch (e) {
      e
    }
  }
  return t
}

function TdCharacter(CharacterId, CharacterType) {
  let Character = eval(CharacterType + CharacterId);
  let t = "<td onmouseover='ShowCharacterData(this," + CharacterId + ",&quot;" + CharacterType + "&quot;)' onmouseout='ShowCharacterData(this)'><img border='0' src='img/" + CharacterType + "/" + CharacterId + ".png'></td>";
  return t
}

function TdText(a, Width = "", Cols = 1) {
  if (Width != "") {
    Width = " width=" + Width
  }
  let t = "<td " + Width + " colspan=" + Cols + ">" + a + "</td>";
  return t
}

function ItemCategory(Categorys, n = 0) {
  let ItemList = eval("Item" + Categorys + "[1]");
  let ItemId = document.getElementsByName("Item" + Categorys);
  for (var j = 0; j < ItemId.length; j++) {
    ItemId[j].innerHTML = "<img border='0' src='img/Item/" + ItemList[n] + ".png'><br>" + eval("Item" + ItemList[n])[0];
    if (Categorys == "Fossil") {
      n = (n + GetRandom(1, ItemList.length - 1)) % ItemList.length
    }
  }
  n = (n + 1) % ItemList.length;
  CheckImg();
  setTimeout("ItemCategory('" + Categorys + "'," + n + ")", 1000)
}

function InitializeTemp() {
  document.getElementById("Temp").innerHTML = "";
  document.getElementById("Temp").className = "Temp";
  document.getElementById("Temp").style = ""
}

function GetPosition(th) {
  let AbsoluteLeft = th.offsetLeft;
  let AbsoluteTop = th.offsetTop;
  while (th.offsetParent != "[object HTMLDivElement]") {
    th = th.offsetParent;
    AbsoluteLeft += th.offsetLeft;
    AbsoluteTop += th.offsetTop
  }
  return [AbsoluteLeft, AbsoluteTop]
}

function ShowCharacterData(th, CharacterId, CharacterType) {
  if (typeof CharacterId != "number") {
    InitializeTemp();
    th.style = ""
  } else {
    th.style = "border:1px solid gold;";
    let Character = eval(CharacterType + CharacterId);
    if (CharacterType == "Pet") {
      CharacterType = "宠物";
      if ([730201, 730202, 730206, 730207, 730208, 730209, 730210].includes(CharacterId)) {
        CharacterType = "伙伴"
      }
    }
    let t = TdText(CharacterType) + "</tr><tr>" + TdText(Character[0]);
    if (CharacterType == "NPC") {
      t += "</tr><tr>" + TdText(Character[1])
    }
    document.getElementById("Temp").innerHTML = CompleteTable(t);
    document.getElementById("Temp").className = "ShowData";
    let AbsolutePosition = GetPosition(th);
    let TopPosition = AbsolutePosition[1] + 48;
    let TempHeight = parseInt(document.getElementById("Temp").clientHeight);
    if ((TopPosition + TempHeight) > (parseInt(document.getElementById("MainBody").scrollTop) + 560)) {
      TopPosition = AbsolutePosition[1] - 8 - TempHeight
    }
    document.getElementById("Temp").style.left = AbsolutePosition[0] - parseInt(document.getElementById("Temp").clientWidth) + 40 + "px";
    document.getElementById("Temp").style.top = TopPosition + "px"
  }
}

function ShowCookingTool(Lv, th) {
  if (typeof Lv != "number") {
    InitializeTemp()
  } else {
    let t;
    let AbsolutePosition = GetPosition(th);
    let CookingToolProject = [[0, 0], [1, 1], [1, 1], [1, 1], [1, 1], [1, 1], [2, 0], [2, 0], [2, 0], [1, 1], [2, 0], [1, 1], [2, 0], [3, 0], [4, 0], [5, 0]];
    let RighthandCookingTool = [40042, 40044, 40043, 41406, 41407, 41408];
    let LefhandCookingTool = [46005, 46004];
    document.getElementById("Temp").className = "ShowData";
    t = TdMaterial(RighthandCookingTool[CookingToolProject[Lv][0]], "", 80) + TdMaterial(LefhandCookingTool[CookingToolProject[Lv][1]], "", 80);
    if ([1, 2, 3, 4, 5, 9, 11, 14].includes(Lv)) {
      t += "</tr><tr><td colspan=2 align='center'>" + CompleteTable("<div class='Fire'></div>") + "</td>"
    }
    let MainBodyScrollTop = parseInt(document.getElementById("MainBody").scrollTop);
    document.getElementById("Temp").innerHTML = CompleteTable(t);
    document.getElementById("Temp").style.left = AbsolutePosition[0] + 85 + "px";
    document.getElementById("Temp").style.top = Math.max(Math.min(AbsolutePosition[1] + 3, MainBodyScrollTop + 556 - parseInt(document.getElementById("Temp").clientHeight)), MainBodyScrollTop + 2) + "px"
  }
}

function ShowTransportData(th, TransportId) {
  if (typeof TransportId != "number") {
    InitializeTemp();
    th.style = ""
  } else {
    th.style = "border:1px solid black;";
    let Transport = eval("Transport" + TransportId);
    let t = TdText(Transport[0], "", 2) + "</tr><tr>" + TdText("跑速：" + TransportSpeed[Transport[1] - 1], "", 2);
    if ([14, 36, 37, 38, 39, 40, 41, 42, 43, 44].includes(TransportId)) {
      t += "</tr><tr>" + TdText("活动限定", "", 2)
    }
    if (Transport.length == 5) {
      for (let i = 0; i < Transport[4].length; i++) {
        if (i % 3 == 0) {
          t += "</tr><tr>"
        }
        t += "<td><img border='0' src='img/Pet/" + Transport[4][i] + ".png'></td><td>" + eval("Pet" + Transport[4][i] + "[0]") + "</td>"
      }
    }
    document.getElementById("Temp").innerHTML = CompleteTable(t);
    document.getElementById("Temp").className = "ShowData";
    let AbsolutePosition = GetPosition(th);
    document.getElementById("Temp").style.left = Math.max(15, AbsolutePosition[0] - parseInt(document.getElementById("Temp").clientWidth) - parseInt(document.getElementById("Capacity").scrollLeft) + 41) + "px";
    document.getElementById("Temp").style.top = AbsolutePosition[1] + 56 + "px"
  }
}

function CheckCuisines(Id) {
  if (!TemporaryCuisine.includes(Id) & Id > 0) {
    TemporaryCuisine.push(Id)
  }
}

function IdAmendHTML(Id) {
  if (typeof Id != "number") Id = "&quot;" + Id + "&quot;";
  return Id
}

function IdAmendJS(Id) {
  if (typeof Id != "number") Id = "'" + Id + "'";
  return Id
}

function AmendId(Id) {
  if (["60000", "60044", "60081", "60600", "64500", "64581", "64582", "60800", "70023", "70070"].includes((Id + " ").substring(0, 5))) {
    Id = (Id + " ").substring(0, 5)
  }
  ;
  return Id
}

function CheckImg() {
  let AllImg = document.getElementsByTagName("img");
  for (i = 0; i < AllImg.length; i++) AllImg[i].onerror = function () {
    this.src = "img/onerror.png"
  }
}

function NPCTime() {
  GetTime();
  let SeatNPC1237 = ["艾明马恰南部桥中央岛", "仙魔平原三岔路口窝棚地带", "龙遗迹5点方向的房屋", "巴里地下城周围", "敦巴伦学校前面", "杜加德走廊伐木场窝棚", "迪尔科内尔旅馆", "杜加德走廊伐木场窝棚", "敦巴伦东部土豆田帐篷", "龙遗迹5点方向的房屋", "班格酒店", "仙魔平原三岔路口陨石坑", "艾明马恰武器店后街", "凯欧岛"];
  try {
    document.getElementById("NPC1237").innerHTML = SeatNPC1237[Math.floor((Today - 0 + 8 * 60 * 60 * 1000) / 2160000) % 14]
  } catch (e) {
    e
  }
}

// setInterval('NPCTime()', 200);
