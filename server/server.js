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

const fs = require('fs');

app.use(cors());

app.use(express.static('./public'));
app.use(express.static('../client/public'));

mockMisc = JSON.parse(fs.readFileSync('./src/mock/mock-misc.json'));
mockStates = JSON.parse(fs.readFileSync('./src/mock/mock-states.json'));

app.use('/mock/set', (req, res) => {
  io.emit("syncRoomState", mockStates[req.query.to]);
  res.sendStatus(200);
});

io.on('connection', socket => {
  socket.onAny((eventName, data) => {
    switch(eventName) {
      case "initialSetup":
        if(data.action === 'connectToRoom') {
          socket.emit("connectToRoomResponse", mockMisc["connectToRoomResponse"]);
          socket.emit("syncRoomState", mockStates["lobby"]);
          socket.emit("syncPlayersData", mockMisc["syncPlayersData"]);
          for(let i = 0; i<10; i++) {
            setTimeout(() => {
              socket.emit("addSongToHistory", mockMisc["addSongToHistory"]);
            }, i*100);
            
          }
        }
        break;
      default:
        break;
    }
    //console.log(eventName, data);
  });
});

httpServer.listen(3000);