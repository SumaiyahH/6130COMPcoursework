//Object data modelling library for mongo
const mongoose = require('mongoose'); 

//Mongo db client library
//const MongoClient  = require('mongodb');

//Express web service library
const express = require('express')

//used to parse the server response from json to object.
const bodyParser = require('body-parser'); 

//Hostname
const os = require("os");
var myhostname = os.hostname();

//instance of express and port to use for inbound connections.
const app = express()
const port = 3000


//connection string listing the mongo servers.
const connectionString = 'mongodb://localmongo1:27017,localmongo2:27017,localmongo3:27017/NotFlixDB?replicaSet=rs0';

// var currentTime = new Date().getTime() / 1000;

//tell express to use the body parser. Note - This function was built into express but then moved to a seperate package.
app.use(bodyParser.json());

//connect to the cluster
mongoose.connect(connectionString, {useNewUrlParser: true, useUnifiedTopology: true});

//To store nodes from each container
var aliveNodes  = [];


var db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

var Schema = mongoose.Schema;

var NotFlixSchema = new Schema({
  Account_id: Number,
  Username: String,
  Title_id: String,
  User_Action: Number,
  DateandTime: Date,
  Point_of_interaction: String,
  Type_of_interaction: String
});

var NotFlixModel = mongoose.model('Interactions',  NotFlixSchema, 'interactions');


//send object back to match the interaction type
app.get('/', (req, res) => {
  NotFlixModel.find({},'Account_id, Username, Title_id,User_Action,DateandTime,Point_of_interaction,Type_of_interaction', (err, interactions) => {
    if(err) return handleError(err);
    res.send(JSON.stringify(interactions))
  }) 
})

// save a new user interaction
app.post('/',  (req, res) => {
  var NotFlix_instance = new NotFlixModel(req.body);
  NotFlix_instance.save(function (err) {
  if (err) res.send('Error');
    res.send(JSON.stringify(req.body))
  });
})
var status = "Alive";
// Assign node ID
var nodeIdentifier = Math.floor(Math.random() * (100 - 1 + 1) + 1);
// Getting current date and time to see when the node last broadcasted
var dateandTime = new Date().getTime() / 1000; 

// Sets one node as the leader 
var isNodeTheLeader = false; 
// Allows list nodes to form
var hasMessageQueueStarted = false; 



// Store list of nodes in the array of the message that contains node identifier, hostname, date and status, 
var nodeMessage = { nodeIdentifier: nodeIdentifier, hostname: myhostname, date: dateandTime, status: status };

aliveNodes .push(nodeMessage);


//Required for messege queueing for RabbitMQ
var amqp = require('amqplib/callback_api');
// Node publish Alive message (every 2 seconds)
setInterval(function () {
  amqp.connect('amqp://user:bitnami@192.168.56.101', function(error0, connection) {
    if (error0) {
      throw error0;
    }
    connection.createChannel(function(error1, channel) {
      if (error1) {
        throw error1;
      }
      var exchange = 'logs';
//Getting current date and time
dateandTime = new Date().getTime() / 1000;
      var msg = `{"nodeIdentifier": ${nodeIdentifier}, "hostname": "${myhostname}", "date": ${dateandTime},"status":"${status}"}`
      var messageConvertedToJSON = JSON.stringify(JSON.parse(msg));

      channel.assertExchange(exchange, 'fanout', {
        durable: false
      });
      channel.publish(exchange, '', Buffer.from(messageConvertedToJSON));
      console.log(" [x] Sent %s", msg);
    });

    setTimeout(function() {
      connection.close();
    }, 500);
  });
}, 2000);



//subscribe
amqp.connect('amqp://user:bitnami@192.168.56.101' , function(error0, connection) {
  if (error0) {
    throw error0;
  }
  connection.createChannel(function (error1, channel) {
    if (error1) {
      throw error1;
    }
    var exchange = 'logs';
    channel.assertExchange(exchange, 'fanout', {
      durable: false
    });
    channel.assertQueue('', {
      exclusive: true
    }, function (error2, q) {
      if (error2) {
        throw error2;
      }
      console.log(" [*] Waiting for messages in %s. To exit press CTRL+C", q.queue);
      channel.bindQueue(q.queue, exchange, '');
      channel.consume(q.queue, function (msg) {
        if (msg.content) {
          hasMessageQueueStarted = true;
          console.log(" [x] %s", msg.content.toString());

          var newMessage = JSON.parse(msg.content.toString());
          dateandTime = new Date().getTime() / 1000;
          // checks to see if node is in the current list, otherwise list gets updated and node is updated with new node identifier 
          if (aliveNodes .some(singleNode => singleNode.hostname === newMessage.hostname)) {
            var nodeThatExists = aliveNodes .find(existingNode => existingNode.hostname === newMessage.hostname);
            nodeThatExists.date = dateandTime;
            if (nodeThatExists.nodeIdentifier !== newMessage.nodeIdentifier) {
              nodeThatExists.nodeIdentifier = newMessage.nodeIdentifier;
            }
          } else {
            aliveNodes.push(newMessage);
          }
          console.log("Printing out all alive nodes");
          console.log(aliveNodes);
        }
      }, {
        noAck: true
      });
    });
  });
});

//Leadership election code
setInterval(function () {
  //Make sure this code doesn't execute if RabbitMQ hasn't started (fixes bug where all nodes are leaders)
  if (hasMessageQueueStarted) {
    var maxNodeIDIdentifier = 0;
    Object.entries(aliveNodes ).forEach(([hostname, prop]) => {
      if (prop.hostname != myhostname) {
        if (prop.nodeIdentifier > maxNodeIDIdentifier) {
          maxNodeIDIdentifier = prop.nodeIdentifier;
        }
      }
    });
    if (nodeIdentifier >= maxNodeIDIdentifier) {
      console.log('I am the leader');
      isNodeTheLeader = true;
    }
  }
}, 2000);



      

app.put('/',  (req, res) => {
  res.send('Got a PUT request at /')
})

//bind the express web service to the port specified
app.listen(port, () => {
  console.log(`Express Application listening at port ` + port)
})



function containerQty(){
    request.get({
    	//we are using the /info url to get the base docker information
        url: url + "/info",
    }, (err, res, data) => {
        if (err) {
            console.log('Error:', err);
        } else if (res.statusCode !== 200) {
	        console.log('Status:', res.statusCode);
        } else{
	        //we need to parse the json response to access
            data = JSON.parse(data)
            console.log("Number of Containers = " + data.Containers);
        }
    });
}

containerQty();

//import the request library
var request = require('request');

//This is the URL endopint of your vm running docker
var url = 'http://192.168.56.101:2375';


//this uses the simple get request from request


//First attempt to create new container based on week 4 tutorial
function containerQty(){
    request.get({
    	//we are using the /info url to get the base docker information
        url: url + "/info",
    }, (err, res, data) => {
        if (err) {
            console.log('Error:', err);
        } else if (res.statusCode !== 200) {
	        console.log('Status:', res.statusCode);
        } else{
	        //we need to parse the json response to access
            data = JSON.parse(data)
            console.log("Number of Containers = " + data.Containers);
        }
    });
}

containerQty();

//create the post object to send to the docker api to create a container
var create = {
    uri: url + "/v1.40/containers/create",
	method: 'POST',
    //deploy an alpine container that runs echo hello world
	json: {"Image": "alpine", "Cmd": ["echo", "I am Alive"]}
};

//send the create request
request(create, function (error, response, createBody) {
    if (!error) {
	    console.log("Created container " + JSON.stringify(createBody));
     
        //post object for the container start request
        var start = {
            uri: url + "/v1.40/containers/" + createBody.Id + "/start",
	      	method: 'POST',
	        json: {}
	    };
		
	    //send the start request
        request(start, function (error, response, startBody) {
	        if (!error) {
		        console.log("Container start completed");
	    
                //post object for  wait 
                var wait = {
			        uri: url + "/v1.40/containers/" + createBody.Id + "/wait",
                    method: 'POST',
		            json: {}
		        };
		   
                
			    request(wait, function (error, response, waitBody ) {
			        if (!error) {
				        console.log("run wait complete, container will have started");
			            
                        //send a simple get request for stdout from the container
                        request.get({
                            url: url + "/v1.40/containers/" + createBody.Id + "/logs?stdout=1",
                            }, (err, res, data) => {
                                    if (err) {
                                        console.log('Error:', err);
                                    } else if (res.statusCode !== 200) {
                                        console.log('Status:', res.statusCode);
                                    } else{
                                        //we need to parse the json response to access
                                        console.log("Container stdout = " + data);
                                        containerQty();
                                    }
                                });
                        }
		        });
            }
        });

    }   
});

