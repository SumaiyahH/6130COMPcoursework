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
  Title_id: String,
  User_Action: Number,
  DateandTime: Date,
  Point_of_interaction: String,
  Type_of_interaction: String
});

var NotFlixModel = mongoose.model('Interactions',  NotFlixSchema, 'interactions');


//send object back to match the interaction type
app.get('/', (req, res) => {
  NotFlixModel.find({},'Account_id,Title_id,User_Action,DateandTime,Point_of_interaction,Type_of_interaction', (err, interactions) => {
    if(err) return handleError(err);
    res.send(JSON.stringify(interactions))
  }) 
})

// save a new user interaction
app.post('/',  (req, res) => {
  var awesome_instance = new NotFlixModel(req.body);
  NotFlix_instance.save(function (err) {
  if (err) res.send('Error');
    res.send(JSON.stringify(req.body))
  });
})
// Assign node ID 
var nodeID = Math.floor(Math.random() * (100 - 1 + 1) + 1);

//publish Message
var amqp = require('amqplib/callback_api');


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

//Getting date and time for right now
let newDate = new Date()
var currentTime = newDate.toISOString();

      var msg = JSON.stringify({"nodeIdentifier": nodeID, "Status": "Alive", "hostName": myhostname, "date": currentTime});
      channel.assertExchange(exchange, 'fanout', {
        durable: false
      });
      channel.publish(exchange, '', Buffer.from(msg));
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

            let hostNameFromMessage = JSON.parse(msg.content.toString()).hostName;
            let nodeIDFromMessage = JSON.parse(msg.content.toString()).nodeIdentifier;
            let date = JSON.parse(msg.content.toString()).date;

            nodes.some(node => node.hostName === hostNameFromMessage) ? (nodes.find(e => e.hostName === hostNameFromMessage)).date = date : 
            nodes.push({"nodeID" : nodeIDFromMessage,"hostName": hostNameFromMessage, "status" : "Alive", "date": date})
          }
        }, {
          noAck: true
        });
      });
    });
  });


  setInterval(function () {
      console.log("//// Printing all nodes in nodes array ////")
  Object.entries(nodes).forEach(([hostname, prop]) => {
    console.log('hostname: ' + prop.hostName + ' prop nodeID : ' + prop.nodeID)
  });
  console.log("//// Finished printing all nodes in nodes array ////")

    }, 5000);




    var maxNodeID = 0;
var systemLeader = 0

    //Leadership election
setInterval(function () {
  console.log(JSON.stringify(nodes));
  leader = 1;
  activeNodes = 0;
  Object.entries(nodes).forEach(([hostname, prop]) => {
    console.log("test" + JSON.stringify(prop.hostName) + JSON.stringify(prop))
    maxNodeID = nodeID;
    if (prop.hostName != myhostname) {
      if ("nodeID" in prop) {
        activeNodes++;
        if (prop.nodeID > nodeID) {
          leader = 0;
        }
      }
    }
    if ((leader == 1) && (activeNodes == nodes.length)) {
      systemLeader = 1;
      console.log('I am the leader');
    }
  });
}, 2000);




app.put('/',  (req, res) => {
  res.send('Got a PUT request at /')
})

//bind the express web service to the port specified
app.listen(port, () => {
 console.log(`Express Application listening at port ` + port)
})
