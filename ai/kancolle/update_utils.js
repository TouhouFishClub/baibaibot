async function update_shipid2name() {
  let URL = "https://api.kcwiki.moe/ships";
  let HEADERS = {
    "User-Agent":
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/67.0.3396.99 Safari/537.36",
  };
  data = await fetch(URL, {
    method: "GET",
    headers: HEADERS,
  }).then((v) => {
    if (!v.ok) throw "update shipid2name FAILED !!!";
    return v.json();
  });

  let ret = new Array(data.length + 1000);
  data.forEach((e) => {
    ret[e.id] = e.name;
  });

  return ret;
}

module.exports = {
  update_shipid2name,
};
