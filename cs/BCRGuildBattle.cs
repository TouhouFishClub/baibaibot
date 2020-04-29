using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;

namespace HttpServer.BCR
{
    public static class BCRGuildBattle
    {
        static string tip = "提示：\n" +
            "R 10 20 30 40 50 5 ——— 重置boss信息，前5数字为血量，最后一个为每人刀数\n" +
            "K 50 ——— 出刀并对boss造成伤害\n" +
            "W ——— 查询能否出刀" +
            "C ——— 查询当前boss血量\n" +
            "T ——— 上树\n" +
            "Q ——— 树上有谁\n" +
            "P ——— 伤害统计\n" +
            "E ——— 结束工会战";
        static int groupId = -1;
        static int[] bossHps=new int[5];
        static int maxChance;

        static int[] bossNowHps = new int[5];
        static int round = 1;
        static int bossId = 1;
        static Player nowKiller;
        static List<Player> players = new List<Player>();
        class Player
        {
            public int Id;
            public int[] Damage = new int[5];
            public bool Tree = false;
            public int Chance = maxChance;
            public string Name;
            public Player(int id, string name)
            {
                this.Id = id;
                this.Name = name;
            }
        }

        static void Clear()
        {
            nowKiller = null;
            players.Clear();
            round = 1;
        }

        static Player getPlayer(int id,string name)
        {
            var p = players.Find(x => x.Id == id);
            if (p == null)
            {
                p = new Player(id, name);
                players.Add(p);
            }
            return p;
        }

        public static string Handle(string chat,int gId,string name,int qqId)
        {
            try
            {
                if (groupId == -1)
                {
                    groupId = gId;
                }
                else if (groupId != gId)
                {
                    return "其他群组正在使用此功能";
                }
                if (chat.Length == 0) return tip;
                char head = chat[0];
                if (chat.Length >= 2)
                    chat = chat.Substring(2, chat.Length - 2);
                switch (head)
                {
                    case 'R':
                        Clear();
                        string[] vs = chat.Split(' ');
                        for (int i = 0; i < 5; i++)
                        {
                            bossHps[i] = bossNowHps[i] = int.Parse(vs[i]);
                        }
                        maxChance = int.Parse(vs[5]);
                        return "设置boss信息成功";
                    case 'K':
                        vs = chat.Split(' ');
                        int damage = int.Parse(vs[0]);
                        var p = getPlayer(qqId, name);
                        int nowBossId = bossId;
                        if (p.Chance == 0)
                        {
                            return $"{p.Name}没刀了，爬";
                        }
                        else if (p.Tree)
                        {
                            return $"{p.Name}在树上，爬";
                        }
                        else
                        {
                            p.Chance--;
                            p.Damage[bossId - 1] += damage;
                            bossNowHps[bossId - 1] -= damage;
                            if (bossNowHps[bossId - 1] <= 0)
                            {
                                foreach (var pp in players)
                                {
                                    pp.Tree = false;
                                }
                                bossNowHps[bossId - 1] = bossHps[bossId - 1];
                                bossId++;
                                if (bossId == 6)
                                {
                                    bossId = 1;
                                    round++;
                                }
                            }
                            if (nowKiller == p)
                                nowKiller = null;
                            return $"{p.Name} 对 {nowBossId}号boss造成{damage}点伤害。 {bossId}号Boss为{round}轮，剩余血量{bossNowHps[bossId - 1]},{((float)(bossNowHps[bossId - 1]) / bossHps[bossId - 1] * 100).ToString("f2")}%";
                        }
                    case 'W':
                        if (nowKiller == null)
                        {
                            nowKiller = getPlayer(qqId, name);
                            return $"{nowKiller.Name}出刀了";
                        }
                        else
                        {
                            return $"{nowKiller.Name}正在出刀,不要抢刀";
                        }
                    case 'C':
                        bossId = int.Parse(chat) - 1;
                        return $"{bossId}号Boss为{bossId}轮，剩余血量{bossNowHps[bossId]},{(bossNowHps[bossId - 1] / bossHps[bossId - 1]).ToString("f2")}%";
                    case 'T':
                        p = getPlayer(qqId, name);
                        p.Tree = true;
                        return $"{p.Name}上树了";
                    case 'Q':
                        StringBuilder sb = new StringBuilder();
                        foreach (var pp in players)
                        {
                            if (pp.Tree) sb.Append(pp.Name + "  ");
                        }
                        return "当前树上玩家：\n" + sb.ToString();
                    case 'P':
                        sb = new StringBuilder();
                        foreach (var pp in players)
                        {
                            sb.Append($"{pp.Name}出了{maxChance - pp.Chance}刀,共造成{pp.Damage.Sum()}伤害\n");
                        }
                        return "伤害统计:\n" + sb.ToString();
                    case 'E':
                        Clear();
                        return "此次工会战结束！";
                    default:
                        return tip;
                }
            }
            catch
            {
                return "输入有误：\n" + tip;
            }
        }
    }
}
