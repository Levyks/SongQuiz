const express = require("express");
const app = express();
const http = require("http");
const httpServer = http.createServer(app);
const cors = require("cors");

const io = require("socket.io")(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());

app.use(express.static('../client/public'));

const Room = require("./src/Classes/Room");
const Spotify = require('./src/Classes/Spotify');

Room.io = io;

io.on('connection', socket => {
  socket.on("initialSetup", data => {
    switch(data.action){
      case "createRoom":
        new Room(socket, data.username);
        break;
      case "joinRoom":
        break;
      case "connectToRoom":
        Room.findRoomAndConnect(data, socket);
        break;
      default:
        break;
    }
  });
});

app.use('/rooms', (req, res) => {
  console.log(Room.rooms);
  res.sendStatus(200);
})

httpServer.listen(3000);