import { io } from "socket.io-client";
import { main } from "./src/main.js";

const socket = io();

async function mainClient() {
  // client-side
  socket.on("connect", () => {
    console.log(socket.id); // x8WIv7-mJelg7on_ALbx
  });

  socket.on("MFS:Other_Players", function(msg) {
    let tmpPlayers = msg.split('|');
    window.otherPlayers = [];
    
    for (let i = 0; i < tmpPlayers.length; i++) {
      if (tmpPlayers[i] !== "") {
        window.otherPlayers.push(JSON.parse(tmpPlayers[i]));
      }
    }

    console.log("Other: " + msg);
  });

  socket.on("MFS:Get_Player", function(msg) {
    window.player = JSON.parse(msg);
    console.log("Player: " + msg);
  });

  socket.on("disconnect", () => {
    console.log(socket.id); // undefined
  });

  //CREATE PLAYER
  document.getElementById("start").onclick = () => {
    if (window.player === null) {
      let playerName = document.getElementById("playerName").value;
      let playerRoom = document.getElementById("room").value;

      socket.emit("MTS:Player_Settings", [playerName, playerRoom].join('|'));
    }
  }

  //TEST CONTROL
  document.addEventListener('keydown', (ev) => {
    if (window.player !== null) {
      if (ev.code == 'KeyW') {
        window.player.z -= 1;
        socket.emit("MTS:Change_Player_State", JSON.stringify(window.player));
      } else if (ev.code == 'KeyS') {
        window.player.z += 1;
        socket.emit("MTS:Change_Player_State", JSON.stringify(window.player));
      } else if (ev.code == 'KeyD') {
        window.player.x += 1;
        socket.emit("MTS:Change_Player_State", JSON.stringify(window.player));
      } else if (ev.code == 'KeyA') {
        window.player.x -= 1;
        socket.emit("MTS:Change_Player_State", JSON.stringify(window.player));
      }
    }
  });
}

window.addEventListener("load", (event) => {
  window.player = null;
  window.otherPlayers = null;

  mainClient();
  main();
});