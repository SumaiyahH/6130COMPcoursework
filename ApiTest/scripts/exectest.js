const axios = require("axios");

function buildcommand(serverlist){

  const cmd = serverlist.map(x => `server\\t${x}:3000;`).join("\\n");
  return [
    "sh",
    "-c",
    `echo -e '${cmd}' > /conf/servers.conf && nginx -s reload`
  ];
};


var list = [];

list.push("apitest_node2_1");
list.push("apitest_node1_1");
list.push("apitest_node3_1");
list.push("containertest");


console.log(buildcommand(list));



async function createContainer(){
    try{
        await axios.post(`http://host.docker.internal:2375/containers/apitest_nginx_1/exec`,{ Cmd: buildcommand(list) }).then(function(response){console.log(response)});
    }
    catch(error)
    {
        console.log(error);
    }
}


createContainer();

