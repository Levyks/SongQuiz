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
        const room = Room.rooms[data.code];
        if(room){
          room.connectPlayer(data, socket);
        }
        break;
      default:
        break;
    }
  });
});

app.use('/get-playlist-info', (req, res) => {
  console.log(req.query);
  const playlistUrl = decodeURIComponent(req.query.url)
  Spotify.getPlaylistInfo(playlistUrl).then(playlistInfo => {
    res.status(playlistInfo.status).json(playlistInfo);
  })
})

httpServer.listen(3000);