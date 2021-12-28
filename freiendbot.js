const WebSocketClient = require("websocket").client;
const vrchat = require("vrchat");
require('log-timestamp');

//LOGIN DATA
const configuration = new vrchat.Configuration({
  username: "name",
  password: "pass",
});

//APIS
const AuthenticationApi = new vrchat.AuthenticationApi(configuration);
const NotificationsApi = new vrchat.NotificationsApi(configuration);
const WorldApi = new vrchat.WorldsApi(configuration);
const UserApi = new vrchat.UsersApi(configuration);
let currentUser;
let vrcHeaders; //Used to connect

//CONFIGURABLE
let userAgent     = "AwsomeAutoFriendBot"
//CONNECTION CODE
AuthenticationApi.getCurrentUser().then((resp) => {
  currentUser = resp.data;
  console.log("Logged in : " + currentUser.displayName)
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

//////////////////////////////////////////////////////
// HANDLING A RECIEVED MESSAGE
//////////////////////////////////////////////////////

function HandleNotification(notification) {
  switch (notification.type) {
    case "friendRequest":
      AcceptFriendRequest(notification);
      break;
  }
}

//Accepts friendrequest
function AcceptFriendRequest(data) {
  console.log("Recieved friend request from " + data.senderUsername);
  NotificationsApi.acceptFriendRequest(data.id).then(() => {
    console.log("Accepted friend request from " + data.senderUsername);
  });
}
