const WebSocketClient = require("websocket").client;
const vrchat = require("vrchat");
const throttledQueue = require('throttled-queue');
require('log-timestamp');

//CONFIGURABLE
let userAgent     = "Awesome Friend Bot"
const instanceid = "YOUR INSTANCE ID HERE" //wrld:instance format
const whitelist = [
	'user1',
	'user2'
	];

//LOGIN DATA
const configuration = new vrchat.Configuration({
  username: "UserName",
  password: "MyVerySecurePassword"
});

//APIS
const AuthenticationApi = new vrchat.AuthenticationApi(configuration);
const NotificationsApi = new vrchat.NotificationsApi(configuration);
const WorldApi = new vrchat.WorldsApi(configuration);
const UserApi = new vrchat.UsersApi(configuration);
let currentUser;
let vrcHeaders; //Used to connect
const throttle = throttledQueue(3, 60000, true); // Adding RateLimit, 3 request per minutes

//CONNECTION CODE
AuthenticationApi.getCurrentUser().then((resp) => {
  currentUser = resp.data;
  console.log("Logged in : " + currentUser.displayName)
  console.log("0.1.6");
  throttle(() => {
	AuthenticationApi.verifyAuthToken().then((resp) => {
    console.log(`Got auth cookie`);
    vrcHeaders = {
      "User-Agent": userAgent,
      Auth_Cookie: resp.data.token,
    };
    var client = new WebSocketClient();

    client.on("connectFailed", function (error) {
      console.log("Connect Error: " + error.toString());
    });

    client.on("connect", function (connection) {
      console.log("WebSocket Client Connected");

      connection.on("error", function (error) {
        console.log("Connection Error: " + error.toString());
      });

      connection.on("close", function () {
        console.log("echo-protocol Connection Closed");
        //sleep(2000);
		    client.connect(
          "wss://pipeline.vrchat.cloud/?authToken=" + resp.data.token,
          "echo-protocol",
          null,
          {
           "User-Agent": userAgent,
          }
          );
      });

      //Handling incoming messages, parsing etc
      connection.on("message", function (message) {
        if (!message.type === "utf8") {
          return console.error("Message is not of type \"UTF8\"");
        }

        try {
          let parsedMessage;
          parsedMessage = JSON.parse(message.utf8Data);

          if (parsedMessage.type == "notification") {
            parsedMessage = JSON.parse(parsedMessage.content);

            try {
            HandleNotification(parsedMessage)
            } catch (error) {
              return console.error(error);
            }
          }
        } catch (error) {
          return console.error( "Unprocessed request due to crappy parse: " + error);
        }
    });
  });

	client.connect(
      "wss://pipeline.vrchat.cloud/?authToken=" + resp.data.token,
      "echo-protocol",
      null,
      {
        "User-Agent": userAgent
      }
    );
  });
  });	
});

//////////////////////////////////////////////////////
// HANDLING A RECIEVED MESSAGE
//////////////////////////////////////////////////////

function HandleNotification(notification) {
  switch (notification.type) {
    case "friendRequest":
      AcceptFriendRequest(notification);
      break;
    case "requestInvite":
      SendInvite(notification);
      break;
  }
}

//Accepts friendrequest
function AcceptFriendRequest(data) {
  console.log("Recieved friend request from " + data.senderUsername);
	throttle(() => {
		NotificationsApi.acceptFriendRequest(data.id).then(() => {console.log("Accepted friend request from " + data.senderUsername);}).catch(err=>{console.log(err)});
	});
	
//Sends invite to world
function SendInvite(data) {
  console.log("Recieved invite request from " + data.senderUsername);
  throttle(() => {
    //check if user is in whitelist
    if(whitelist.includes(data.senderUsername)) {
      InviteApi.inviteUser(data.senderUserId, { instanceId: instanceid }).then(() => {console.log("Accepted invite request from " + data.senderUsername);}).catch(err=>{console.log(err)});
    }
    else{
      console.log("User " + data.senderUsername + " is not in whitelist");
    }
  });	
}
