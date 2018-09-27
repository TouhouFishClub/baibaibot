(function () {
    var default_eorzeadb = {
        cdn_prefix: 'http://img.finalfantasyxiv.com/lds/',
        version_js_uri: 'http://img.finalfantasyxiv.com/lds/pc/global/js/eorzeadb/version.js',
        dynamic_tooltip: false
    };
    if (typeof eorzeadb == "undefined") {
        eorzeadb = default_eorzeadb;
    }
    else {
        for (var property in default_eorzeadb) {
            if (typeof eorzeadb[property] === "undefined") {
                eorzeadb[property] = default_eorzeadb[property];
            }
        }
    }

    var version_refresh_interval = 60;
    var refresh_time = Math.floor(new Date().getTime() / 1000 / version_refresh_interval) * version_refresh_interval;

    window.recieve_eorzeadb_version = function (data) {
        eorzeadb.versions = data;
    };

    external_load('js', eorzeadb.version_js_uri + '?' + refresh_time, function () { });
    function external_load(type, src, callback) {
        var el, src_attr;
        var d = document;
        if (type === 'js') {
            el = d.createElement('script');
            el.type = 'text/javascript';
            src_attr = 'src';
        }
        else if (type === 'css') {
            el = d.createElement('link');
            el.type = 'text/css';
            el.rel = 'stylesheet';
            src_attr = 'href';
        }
        el.async = true;
        if (window.ActiveXObject) {
            el.onreadystatechange = function () {
                var state = el.readyState;
                if (state === 'loaded' || state === 'complete') {
                    callback();
                }
            };
        }
        else {
            el.onload = callback;
        }
        el[src_attr] = src;
        var head = d.getElementsByTagName("head")[0] || d.documentElement;
        head.insertBefore(el, head.firstChild);
    }


})();

var nounList =
    {
        "Unique": { "chs": "珍稀", "jp": "珍稀" },
        "Untradable": { "chs": "独占", "jp": "独占" },
        "Strength": { "chs": "力量", "jp": "Strength" },
        "Dexterity": { "chs": "灵巧", "jp": "Dexterity" },
        "Vitality": { "chs": "耐力", "jp": "Vitality" },
        "Intelligence": { "chs": "智力", "jp": "Intelligence" },
        "Mind": { "chs": "精神", "jp": "Mind" },
        "Piety": { "chs": "信仰", "jp": "Piety" },
        "HP": { "chs": "体力", "jp": "HP" },
        "MP": { "chs": "魔力", "jp": "MP" },
        "TP": { "chs": "技力", "jp": "TP" },
        "GP": { "chs": "采集力", "jp": "GP" },
        "CP": { "chs": "制作力", "jp": "CP" },
        "Auto-attack": { "chs": "自动攻击", "jp": "自动攻击" },
        "Critical Hit": { "chs": "暴击", "jp": "クリティカル" },
        "Item Level": { "chs": "装备品级", "jp": "装备品级" },
        "Physical Damage": { "chs": "物理基本性能", "jp": "物理基本性能" },
        "Magic Damage": { "chs": "魔法基本性能", "jp": "魔法基本性能" },
        "Delay": { "chs": "攻击间隔", "jp": "攻撃間隔" },
        "Additional Effect: ": { "chs": "附加效果", "jp": "追加効果" },
        "Attack Speed": { "chs": "攻击次数", "jp": "攻撃回数" },
        "Block Rate": { "chs": "格挡发动力", "jp": "ブロック発動力" },
        "Block Strength": { "chs": "格挡性能", "jp": "ブロック性能" },
        "Parry": { "chs": "招架发动力", "jp": "受け流し発動力" },
        "Attack Power": { "chs": "物理攻击力", "jp": "物理オートアタック" },
        "Accuracy": { "chs": "命中力", "jp": "命中力" },
        "Evasion": { "chs": "回避力", "jp": "回避力" },
        "Magic Defense": { "chs": "魔法防御力", "jp": "魔法防御力" },
        "Defense": { "chs": "物理防御力", "jp": "物理防御力" },
        "Critical Hit Power": { "chs": "暴击攻击力", "jp": "クリティカル攻撃力" },
        "Critical Hit Resilience": { "chs": "暴击防御力", "jp": "クリティカル防御力" },
        "Critical Hit Rate": { "chs": "暴击", "jp": "クリティカル" },
        "Critical Hit Evasion": { "chs": "暴击回避力", "jp": "クリティカル回避力" },
        "Slashing Resistance": { "chs": "斩击耐性", "jp": "斬耐性" },
        "Piercing Resistance": { "chs": "突刺耐性", "jp": "突耐性" },
        "Blunt Resistance": { "chs": "打击耐性", "jp": "打耐性" },
        "Projectile Resistance": { "chs": "射击耐性", "jp": "射耐性" },
        "Attack Magic Potency": { "chs": "攻击魔法威力", "jp": "攻撃魔法威力" },
        "Healing Magic Potency": { "chs": "治疗魔法威力", "jp": "回復魔法威力" },
        "Enhancement Magic Potency": { "chs": "强化魔法威力", "jp": "強化魔法威力" },
        "Enfeebling Magic Potency": { "chs": "弱化魔法威力", "jp": "弱体魔法威力" },
        "Fire Resistance": { "chs": "火", "jp": "火" },
        "Ice Resistance": { "chs": "冰", "jp": "氷" },
        "Wind Resistance": { "chs": "风", "jp": "風" },
        "Earth Resistance": { "chs": "土", "jp": "土" },
        "Lightning Resistance": { "chs": "雷", "jp": "雷" },
        "Water Resistance": { "chs": "水", "jp": "水" },
        "Magic Resistance": { "chs": "全魔法耐性", "jp": "全魔法耐性" },
        "Determination": { "chs": "信念", "jp": "意思力" },
        "Skill Speed": { "chs": "技能速度", "jp": "スキルスピード" },
        "Spell Speed": { "chs": "咏唱速度", "jp": "スペルスピード" },
        "速度": { "chs": "速度", "jp": "速度" },
        "Morale": { "chs": "斗志", "jp": "モラル" },
        "Enmity": { "chs": "仇恨", "jp": "敵視" },
        "Enmity Reduction": { "chs": "降低仇恨", "jp": "敵視-" },
        "Careful Desynthesis": { "chs": "分解精度", "jp": "分解精度" },
        "Movement Speed": { "chs": "移动速度", "jp": "移動速度" },
        "Direct Hit Rate": { "chs": "直击", "jp": "Direct Hit Rate" },
        "Tenacity": { "chs": "坚韧", "jp": "Tenacity" },

        "Reduced Durability Loss": { "chs": "装备损耗耐性", "jp": "装備消耗耐性" },
        "Increased Spiritbond Gain": { "chs": "精炼度提升量", "jp": "錬精度上昇量" },
        "Craftsmanship": { "chs": "作业精度", "jp": "作業精度" },
        "Control": { "chs": "加工精度", "jp": "加工精度" },
        "Gathering": { "chs": "获得力", "jp": "獲得力" },
        "Perception": { "chs": "鉴别力", "jp": "識質力" },
        "All Classes": { "chs": "所有职业", "jp": "全クラス" },
        "Carpenter": { "chs": "刻木匠", "jp": "木工師" },
        "Blacksmith": { "chs": "锻铁匠", "jp": "鍛冶師" },
        "Armorer": { "chs": "铸甲匠", "jp": "甲冑師" },
        "Goldsmith": { "chs": "雕金匠", "jp": "彫金師" },
        "Leatherworker": { "chs": "制革匠", "jp": "革細工師" },
        "Weaver": { "chs": "裁衣匠", "jp": "裁縫師" },
        "Alchemist": { "chs": "炼金术士", "jp": "錬金術師" },
        "Culinarian": { "chs": "烹调师", "jp": "調理師" },
        "GLA": { "chs": "剑术师", "jp": "剣術士" },
        "PLD": { "chs": "骑士", "jp": "ナイト" },
        "PGL": { "chs": "格斗家", "jp": "格闘士" },
        "MNK": { "chs": "武僧", "jp": "モンク" },
        "MRD": { "chs": "斧术师", "jp": "斧術士" },
        "WAR": { "chs": "战士", "jp": "戦士" },
        "LNC": { "chs": "枪术师", "jp": "槍術士" },
        "DRG": { "chs": "龙骑士", "jp": "竜騎士" },
        "ARC": { "chs": "弓箭手", "jp": "弓術士" },
        "BRD": { "chs": "吟游诗人", "jp": "吟遊詩人" },
        "ROG": { "chs": "双剑师", "jp": "双剣士" },
        "NIN": { "chs": "忍者", "jp": "忍者" },
        "DRK": { "chs": "暗黒骑士", "jp": "暗黒騎士" },
        "MCH": { "chs": "机工士", "jp": "機工士" },
        "CNJ": { "chs": "幻术师", "jp": "幻術士" },
        "WHM": { "chs": "白魔法师", "jp": "白魔道士" },
        "THM": { "chs": "咒术师", "jp": "呪術士" },
        "BLM": { "chs": "黑魔法师", "jp": "黒魔道士" },
        "ACN": { "chs": "秘术师", "jp": "巴術士" },
        "SMN": { "chs": "召唤师", "jp": "召喚士" },
        "AST": { "chs": "占星术士", "jp": "占星術師" },
        "SAM": { "chs": "武士", "jp": "侍" },
        "RDM": { "chs": "赤魔法师", "jp": "赤魔道士" },

        "Repair Level": { "chs": "修理等级", "jp": "修理レベル" },
        "Materials": { "chs": "修理材料", "jp": "修理資材" },
        "Grade 1 Dark Matter": { "chs": "1级暗物质", "jp": "ダークマターG1" },
        "Grade 2 Dark Matter": { "chs": "2级暗物质", "jp": "ダークマターG2" },
        "Grade 3 Dark Matter": { "chs": "3级暗物质", "jp": "ダークマターG3" },
        "Grade 4 Dark Matter": { "chs": "4级暗物质", "jp": "ダークマターG4" },
        "Grade 5 Dark Matter": { "chs": "5级暗物质", "jp": "ダークマターG5" },
        "Grade 6 Dark Matter": { "chs": "6级暗物质", "jp": "ダークマターG6" },
        "Grade 7 Dark Matter": { "chs": "7级暗物质", "jp": "ダークマターG7" },
        "Convertible": { "chs": "魔晶石化", "jp": "マテリア化" },
        "Projectable": { "chs": "武具投影", "jp": "投影" },
        "Desynthesizable": { "chs": "装备分解", "jp": "アイテム分解" },
        "Crest-Worthy": { "chs": "部队徽章装饰", "jp": "クレスト装飾" },
        "Dyeable": {"chs": "染色", "jp": "染色"},
        "Sells for": { "chs": "收购价格", "jp": "買取価格" },
        "Materia Melding": { "chs": "镶嵌魔晶石等级", "jp": "マテリア装着レベル" },
        "Advanced Melding Forbidden": { "chs": "无法禁断镶嵌", "jp": "禁断装着不可" },
        "Unsellable": { "chs": "不可出售 ", "jp": "マーケット" },
        "Market Prohibited": { "chs": "无法在市场出售", "jp": "取引不可" },
        "gil": {"chs":"金币", "jp": "金币"},
        "Yes": { "chs": "可", "jp": "Yes" },
        "No": { "chs": "不可", "jp": "No" },

        "Bonuses": { "chs": "特殊", "jp": "Bonuses" },
        "Crafting & Repairs": { "chs": "制作&修理", "jp": "Crafting & Repairs" },
        "Materia": { "chs": "魔晶石工艺", "jp": "Materia" },
    }
function modifyHtml(html)
{
    for (var i in nounList) {
        if (i == "Bonuses")
        {
            var reg = new RegExp(i);
            html = html.replace(reg, nounList[i]["chs"]);
            html = html.replace(reg, nounList[i]["chs"] + "[HQ]");
        }
        else
        {
            var reg = new RegExp(i, "g");
            html = html.replace(reg, nounList[i]["chs"]);
        }
    }
    html = $(html);
    
    html.find(".db-tooltip__external_header").remove();
    html.find(".db-tooltip__bt_item_detail").remove();
    html.children().first().children().first().children().last().remove();
    return html;
}
(function () {
    var eorzeadb_klass = {
        cdn_prefix: 'http://img.finalfantasyxiv.com/lds/',
        $: null,
        versions: { data: 0, js: 0, css: 0 },
        dynamic_tooltip: false,
        is_tooltip_show: false,
        popup_contents: {},
        popup_content_last_key: null,
        pushup: function (data) {
            var data_key = data.subdomain + '/' + data.path + '/' + data.key;

            eorzeadb.popup_contents[data_key] = modifyHtml(data.html);
        },
        init_after_domready: function ($) {
            eorzeadb.init_tooltip_frame($);
            eorzeadb.init_db_links($);
        },
        init_tooltip_frame: function ($) {
            var $tooltip = $('#eorzeadb_tooltip');
            if (!$tooltip.length) {
                $tooltip = $(document.createElement('div'));
                $tooltip.attr('id', 'eorzeadb_tooltip');
                $tooltip.hide();
                $('body').append($tooltip);
                $tooltip.css({
                    position: 'absolute',
                    top: 0,
                    left: 0
                });
                $tooltip.hover(
					function () {
					    $tooltip.stop().css({ opacity: 1 }).show();
					    eorzeadb.is_tooltip_show = true;
					},
					function () {
					    eorzeadb.hide_tooltip();
					}
				).click(
					function () {
					    if (eorzeadb.is_tooltip_show) {
					        eorzeadb.hide_tooltip();
					    }
					    else {
					        eorzeadb.is_tooltip_show = true;
					    }
					}
				);
            }
            eorzeadb.$tooltip = $tooltip;
        },
        init_db_links: function ($) {
            var hover_timer;
            $('.eorzeadb_link')
				.hover(
					function () {
					    var $this = $(this);
					    if (hover_timer) {
					        clearTimeout(hover_timer);
					        hover_timer = null;
					    }
					    hover_timer = setTimeout(function () {
					        eorzeadb.show_tooltip($this);
					    }, 300);
					},
					function () {
					    if (hover_timer) {
					        clearTimeout(hover_timer);
					        hover_timer = null;
					    }
					    eorzeadb.hide_tooltip($(this));
					}
				)
            ;
        },
        show_tooltip: function ($db_link) {
            eorzeadb.get_popup_content($db_link, function (this_popup_content) {
                if (!this_popup_content) {
                    return;
                }

                eorzeadb.$tooltip
					.stop()
					.css({
					    opacity: 1
					})
					.html(this_popup_content)
					.show(0, function () {
					    eorzeadb.set_tooltip_position($db_link);
					    eorzeadb.is_tooltip_show = true;
					    eorzeadb.init_tooltip_html();
					})
                ;
            });
        },
        hide_tooltip: function () {
            eorzeadb.$tooltip.fadeOut(500);
            eorzeadb.is_tooltip_show = false;
        },
        init_tooltip_html: function () {
            eorzeadb.$tooltip.find('.eorzeadb_tooltip_this_year').text(new Date().getFullYear());
            var $column1 = eorzeadb.$tooltip.find('.tooltip_view .table_black .column1');
            if ($column1.length > 0) {
                $column1.find('td .no_th tr:nth-child(odd) td').css({ backgroundColor: '#2e2e2e' });
                $column1.find('td .no_th tr:nth-child(even) td').css({ backgroundColor: '#333333' });
                $column1.find('tr:nth-child(even) td').css({ backgroundColor: '#2e2e2e' });
                $column1.find('tr:nth-child(odd) td').css({ backgroundColor: '#333333' });
                $column1.find('.inr_table tr:nth-child(even) td').css({ backgroundColor: '#2e2e2e' });
                $column1.find('.inr_table tr:nth-child(odd) td').css({ backgroundColor: '#333333' })
            }
        },
        get_url_info: function ($db_link) {
            var ldst_href;
            if ($db_link.data('ldst-href')) {
                ldst_href = $db_link.data('ldst-href');
            }
            else {
                ldst_href = $db_link.attr('data-href');
            }
            var matchs = ldst_href.match(/^http:\/\/([^\.]+)\..*playguide\/db\/(.*?)\/?(#.+)?$/);
            var subdomain = matchs[1];
            var path = matchs[2];
            if (!eorzeadb.dynamic_tooltip && eorzeadb.versions.data) {
                url = eorzeadb.cdn_prefix + 'pc/tooltip/' + eorzeadb.versions.data + '/' + subdomain + '/' + path + '.js';
            }
            else {
                url = ldst_href + '/jsonp/';
            }
            return {
                'url': url,
                'data_key': subdomain + '/' + path
            };
        },
        get_popup_content: function ($db_link, cb) {
            var url_info = eorzeadb.get_url_info($db_link);
            eorzeadb.popup_content_last_key = url_info.data_key;
            if (eorzeadb.popup_contents.hasOwnProperty(url_info.data_key)) {
                if (cb) { cb(eorzeadb.popup_contents[url_info.data_key]) }
                return;
            }
            eorzeadb.popup_contents[url_info.data_key] = '';

            eorzeadb.$.ajax({
                cache: true,
                type: 'GET',
                url: url_info.url,
                dataType: 'script',
                success: function () {
                    if (cb && eorzeadb.popup_content_last_key === url_info.data_key) {
                        cb(eorzeadb.popup_contents[url_info.data_key])
                    }
                }
            });
        },
        set_tooltip_position: function ($db_link) {
            var $ = eorzeadb.$;
            var $window = $(window);
            var $tooltip = eorzeadb.$tooltip;
            var $tooltip_child = $tooltip.children(':first');
            var tooltip_height = $tooltip_child.height() + 26;
            var link_offset = $db_link.offset();
            var link_offset_top = Math.round(link_offset.top);
            var link_offset_left = link_offset.left;
            var window_width = $(window).innerWidth();
            var window_height = $window.height();
            var window_center = Math.round(window_width / 2);
            var window_scroll_top = $window.scrollTop();
            var tooltip_under_pos = link_offset_top - window_scroll_top + tooltip_height;

            var top_pos, left_pos;

            if ((window_width - link_offset_left - $db_link.width() - 10) > $tooltip_child.width()) {
                left_pos = ($db_link.width() + link_offset_left + 10);
            } else {
                left_pos = (link_offset_left - 10 - $tooltip_child.width() - 20);
                if (left_pos < 0) {
                    left_pos = ($db_link.width() + link_offset_left + 10);
                }
            }


            if (tooltip_under_pos > window_height) {
                if (window_height < tooltip_height) {
                    top_pos = window_scroll_top;
                }
                else {
                    top_pos = link_offset_top - (tooltip_under_pos - window_height);
                }
            }
            else if (link_offset_top > window_scroll_top && window_height > tooltip_height) {
                top_pos = link_offset_top;
            }
            else {
                top_pos = window_scroll_top - link_offset_top;
            }

            $tooltip.css({
                top: top_pos + 'px',
                left: left_pos + 'px'
            });
        }
    };
    eorzeadb.init = function ($) {
        $.extend(eorzeadb_klass, eorzeadb);
        eorzeadb = eorzeadb_klass;
        eorzeadb.$ = $;
        $(eorzeadb.init_after_domready);
    };

})();
