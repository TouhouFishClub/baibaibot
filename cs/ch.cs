using System;  
using System.Collections.Generic;  
using System.Linq;  
using System.Text;  
using System.Net;  
using System.Net.Sockets; 
namespace HttpServer
{
    class MainClass
    {
        static void Main(string[] args)  
        {  
            int port = 11005;//端口  
            byte[] buf = new byte[1024];  
            //IP是本地127.0.0.1  
            TcpListener server = new TcpListener(IPAddress.Any, port);  
            server.Start();  

            Console.WriteLine("服务运行在[{0}]端口", port);  
            while (true)  
            {  


                Socket clent = server.AcceptSocket();  
                clent.Receive(buf);  
                string reqstr = Encoding.ASCII.GetString(buf);

                string ss = "HTTP/1.0 200 OK\nContent-Type:text/plain\n\n";  
                string ss1 = handleReq(reqstr);
                string resstr = ss+ss1;
                
                Console.WriteLine(resstr);

                clent.Send(Encoding.ASCII.GetBytes(resstr));  
                clent.Close();  
                clent = null;  
            }  
        }

        static string handleReq(string req){
            Console.WriteLine(req);
            // handle req
            string res = "";
            return res;
        }    
    }
}