using System;  
using System.Collections.Generic;  
using System.Linq;  
using System.Text;  
using System.Net;  
using System.Net.Sockets; 
using HttpServer.Message;

namespace HttpServer
{
    class MainClass
    {
        static void Main(string[] args)  
        {
            //while (true)
            //{
            //    string cmd = Console.ReadLine();
            //    var vs = cmd.Split('_');
            //    Console.WriteLine(BCR.BCRGuildBattle.Handle(vs[0], int.Parse(vs[1]), vs[2], int.Parse(vs[3])));
            //    Console.WriteLine();
            //    Console.WriteLine();
            //}
            int port = 11005;//端口  
            byte[] buf = new byte[1024];
            //IP是本地127.0.0.1  
            TcpListener server = new TcpListener(IPAddress.Any, port);
            server.Start();

            Console.WriteLine("服务运行在[{0}]端口", port);

            //Mongo.DBConnection.Instance.Connect();

            while (true)
            {


                Socket clent = server.AcceptSocket();
                clent.Receive(buf);
                string reqstr = Encoding.ASCII.GetString(buf);

                string ss = "HTTP/1.0 200 OK\nContent-Type:text/plain;charset=utf-8\n\n";
                string ss1 = handleReq(reqstr);
                string resstr = ss + ss1;

                Console.WriteLine(resstr);

                clent.Send(Encoding.UTF8.GetBytes(resstr));
                clent.Close();
                clent = null;
            }
        }

        static string handleReq(string req){
            Console.WriteLine(req);
            try
            {
                // handle req
                string res = Message.MessageHandle.Handle(req);
                return res;
            }
            catch (Exception e)
            {
                Console.WriteLine(e.ToString());
                return "";
            }
        }    
    }
}