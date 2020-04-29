using System;
using System.Collections.Generic;
using System.Text;
using System.Text.RegularExpressions;

namespace HttpServer.Message
{
    public static class MessageHandle
    {
        public static string Handle(string msg)
        {
            int b0 = msg.IndexOf(' ');
            int b1 = msg.IndexOf(' ', b0 + 1);
            msg = msg.Substring(b0 + 1, b1 - b0);
            int b2 = msg.IndexOf('?');
            msg = msg.Substring(b2 + 1, msg.Length - b2 - 1);
            Console.WriteLine(msg);
            string[] infos = msg.Split('&');
            string chat="";
            int groupId=0;
            string UserName="";
            int qqId = 0;
            foreach (var info in infos)
            {
                int index = info.IndexOf('=');
                if (index < 0) continue;
                string ss = info.Substring(0, index);
                string s = info.Substring(index + 1, info.Length - index - 1);
                s = System.Uri.UnescapeDataString(s);
                switch (ss)
                {
                    case "d":
                        chat = s;
                        break;
                    case "gid":
                        groupId = int.Parse(s);
                        break;
                    case "name":
                        UserName = s;
                        break;
                    case "qq":
                        qqId = int.Parse(s);
                        break;
                    case "port":
                        break;
                    default:
                        throw new Exception("不正确的抬头");
                }
            }
            if (chat.StartsWith("wbcr"))
            {
                chat = chat.Substring(5, chat.Length - 5);
                return BCR.BCRGuildBattle.Handle(chat, groupId, UserName, qqId);
            }
            return $"群号：{groupId}，QQ号：{qqId}，名字：{UserName}，聊天信息：{chat}";
        }

        /// <summary>  
        /// Unicode字符串转为正常字符串  
        /// </summary>  
        /// <param name="srcText"></param>  
        /// <returns></returns>  
        public static string UnicodeToString(string str)
        {
            StringBuilder sb = new StringBuilder();
            byte[] byStr = System.Text.Encoding.UTF8.GetBytes(str); //默认是System.Text.Encoding.Default.GetBytes(str)
            for (int i = 0; i < byStr.Length; i++)
            {
                sb.Append(@"%" + Convert.ToString(byStr[i], 16));
            }

            return (sb.ToString());
        }
    }
}
