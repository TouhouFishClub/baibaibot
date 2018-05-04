const WxVoice = require('wx-voice');


function encodeSilk(){
  var voice = new WxVoice();
  voice.on("error", (err) => console.log(err));
  voice.encode(
    "input.mp3", "output.silk", { format: "silk" },
    (file) => console.log(file));
}
