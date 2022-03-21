const axios = require("axios");

const containerName = "containertest";

const containerDetails = {
      Image: "apitest_node1",
      Hostname: "nodejscluster_node1_4",
      NetworkingConfig: {
        EndpointsConfig: {
          "apitest_nodejs": {},
        },
      },
    };


async function createContainer(){
    try{
        await axios.post(`http://host.docker.internal:2375/containers/create?name=${containerName}`, containerDetails).then(function(response){console.log(response)});
        await axios.post(`http://host.docker.internal:2375/containers/${containerName}/start`);
    }
    catch(error)
    {
        console.log(error);
    }
}

createContainer();
