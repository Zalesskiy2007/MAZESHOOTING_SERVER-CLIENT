const http = require("http");
const express = require("express");
const morgan = require("morgan");
const { Server } = require("socket.io");

const app = express();
app.use(morgan("combined"));
app.use(express.static("."));

//initialize a simple http server
const server = http.createServer(app);
const io = new Server(server);

let players = [];
let onLine = 0;
let colors = ["red", "green", "blue", "orange", "yellow"];

class _Player {
  constructor(name, x, y, z, health, damage, color, sock, room) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.health = health;
    this.damage = damage;
    this.name = name;
    this.color = color;
    this.socket = sock;
    this.room = room;
  }
}
function Player(...args) {
  return new _Player(...args);
}

function playerJSON(player) {
  let obj = {
    name: player.name,
    x: player.x,
    y: player.y,
    z: player.z,
    health: player.health,
    damage: player.damage,
    color: player.color,
    id: player.socket.id,
    room: player.room 
  };

  return JSON.stringify(obj);
}

function changePlayerClass(playerJs) {
  for (let w = 0; w < players.length; w++) {
    if (players[w].socket.id === playerJs.id) {
      players[w].name = playerJs.name;
      players[w].x = playerJs.x;
      players[w].y = playerJs.y;
      players[w].z = playerJs.z;
      players[w].health = playerJs.health;
      players[w].damage = playerJs.damage;
      players[w].color = playerJs.color;
    }
  }
}

function otherPlayersJSON(player) {
  let res = [];

  for (let tmp = 0; tmp < players.length; tmp++) {
    if (players[tmp].room === player.room) {
      if (players[tmp] === player) {
        continue;
      }
      res.push(playerJSON(players[tmp]));
    }
  }

  return res;
}

function reloadOtherPlayers() {
  for (let w = 0; w < players.length; w++) {
    players[w].socket.emit("MFS:Other_Players", otherPlayersJSON(players[w]).join('|'));
  }
}

function reloadPlayer(player) {
  for (let x = 0; x < players.length; x++) {
    if (players[x].socket.id === player.id) {
      players[x].socket.emit("MFS:Get_Player", JSON.stringify(player));
      break;
    }
  }
}

function deletePlayer(id) {
  for (let x = 0; x < players.length; x++) {
    if (players[x].socket.id === id) {
      players.splice(x, 1);
      break;
    }
  }
}


io.on("connection", (socket) => {
  console.log(`Client connected with id: ${socket.id}`);
  onLine++;

  socket.on("MTS:Player_Settings", (msg) => {
    msg = msg.split('|');

    let flag = 0;
    for (let m = 0; m < players.length; m++) {
      if (players[m].name === msg[0] && players[m].room === msg[1]) {
        flag = 1;
        break;
      }
    }

    if (flag === 0) {
      let playerConnect = Player(msg[0], 0, 0, 0, 100, 1, colors[Math.floor(Math.random() * colors.length)], socket, msg[1]);
      players.push(playerConnect);
      playerConnect.socket.emit("MFS:Get_Player", playerJSON(playerConnect));
      reloadOtherPlayers();
    } else {
      socket.emit("MFS:Invalid_Name", msg.join("|"));
    }
  });

  socket.on("MTS:Change_Player_State", (msg) => {
    let g = JSON.parse(msg);

    changePlayerClass(g);
    reloadPlayer(g);
    reloadOtherPlayers();
  });

  socket.on("MTS:Player_Shoot_Player", (msg) => {
    let gang = msg.split('|');
    gang[0] = JSON.parse(gang[0]);
    gang[1] = JSON.parse(gang[1]);

    gang[1].health -= gang[0].damage;

    changePlayerClass(gang[0]);
    changePlayerClass(gang[1]);

    reloadPlayer(gang[0]);
    reloadPlayer(gang[1]);

    if (gang[1].health <= 0) {
      for (let x = 0; x < players.length; x++) {
        if (players[x].socket.id === gang[1].id) {
          players[x].socket.emit("MFS:Game_Over");
          break;
        }
      }
    }
    reloadOtherPlayers();
  });

  socket.on("MTS:Delete_Player", () => {
    deletePlayer(socket.id);
    reloadOtherPlayers();
  });

  socket.on("disconnect", () => {
    console.log(`Client disconnected with id: ${socket.id}`);

    deletePlayer(socket.id);
    reloadOtherPlayers();
    onLine--;
  });
});

server.listen(process.env.PORT || 5000, () => {
  console.log(`Server started on port ${server.address().port} :)`);
});