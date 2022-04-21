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
var nodes = [];


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

nodes.push(nodeMessage);


//Required for messege queueing for RabbitMQ
var amqp = require('amqplib/callback_api');
// Node publish Alive message (every 2 seconds)
setInterval(function () {
  amqp.connect('amqp://user:bitnami@192.168.56.10', function(error0, connection) {
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
amqp.connect('amqp://user:bitnami@192.168.56.10' , function(error0, connection) {
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
          console.log(" [x] %s", msg.content.toString());

          var newMessage = JSON.parse(msg.content.toString());
          dateandTime = new Date().getTime() / 1000;
          // checks to see if node is in the current list, otherwise list gets updated and node is updated with new node identifier 
          if (nodes.some(singleNode => singleNode.hostname === newMessage.hostname)) {
            var nodeThatExists = nodes.find(existingNode => existingNode.hostname === newMessage.hostname);
            nodeThatExists.date = dateandTime;
            if (nodeThatExists.nodeIdentifier !== newMessage.nodeIdentifier) {
              nodeThatExists.nodeIdentifier = newMessage.nodeIdentifier;
            }
            hasMessageQueueStarted = true;
          } else {
            nodes.push(newMessage);
          }
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
    Object.entries(nodes).forEach(([hostname, prop]) => {
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
