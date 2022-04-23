# 6130COMPcoursework
Repository for NotFlix cloud Solution 

# Getting started
 1. Open a new terminal for the VM and set up ubuntu 
 2. In the terminal type the command 'git clone' and paste the URL of the git repository into the VM
 3. To check all the files are in the clones repo type 'ls' on the command line and it will show all the files inside the cloned repo 
 4. On the command line run the command 'sudo docker-compose build' to build the images in the docker-compose.yaml file 
 5. Once this has been done run the command 'sudo docker-compose up' which will bring up the containers and run three nodes from the mongo.js file 
 6. Now that the conatiners are up RabbitMQ will start up --note-- RabbitMQ will start then stop and re start up again 
 7. To check Rabbit MQ is running open a new tab in the web browser and paste the IP address of your VM adding ':15672' at the end (example http://192.168.56.101:15672/)
 8. If RabbitMQ has started up and is ready you will see the RabbitMQ sign in page 
 9. sign in to RabbitMQ using username: user and password: bitnami
 10. Once your signed in to RabbitMQ you can click on the 'overview' tab and it should show three nodes running. this can be double checked under the 'connections' tab where you 
     should also have three visible connections
 
 # Communication between Nodes 
1. Once RabbitMQ is running a node will add itself to a node list 
2. When a node starts up it will broadcast the message 'Alive!' so that other nodes can see what nodes status is.
3. The nodes will then broadcast a list of all the alive nodes 
4. This can be seen in the terminal window

# Leadership election
1. Once all the alive nodes have passed through the array, the node with the highest ID will be elected the leader 
2. This can be seen in the terminal window as it will print out 'I am the leader' next to the node that has been elected 
3. this can be cross refrenced using the list of alive nodes by checking the Node ID is the highest 
 
 # Docker API
 
 
