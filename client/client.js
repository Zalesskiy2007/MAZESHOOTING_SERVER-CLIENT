import { io } from "socket.io-client";
import { main } from "./src/main.js";

const socket = io();
let player = null;
let otherPlayers = null;

async function mainClient() {
  // client-side
  socket.on("connect", () => {
    console.log(socket.id); // x8WIv7-mJelg7on_ALbx
  });

  socket.on("MFS:Other_Players", function(msg) {
    let tmpPlayers = msg.split('|');
    otherPlayers = [];
    
    for (let i = 0; i < tmpPlayers.length; i++) {
      if (tmpPlayers[i] !== "") {
        otherPlayers.push(JSON.parse(tmpPlayers[i]));
      }
    }
    console.log(`-------Other-------`);
    console.log(msg + `::${otherPlayers.length}`);
    console.log(`-------------------`);
  });

  socket.on("MFS:Get_Player", function(msg) {
    player = JSON.parse(msg);
    console.log(`*********Player*********`);
    console.log(msg);
    console.log(`************************`);
  });

  socket.on("disconnect", () => {
    console.log(socket.id); // undefined
  });

  //CREATE PLAYER
  document.getElementById("start").onclick = () => {
    if (player === null) {
      let playerName = document.getElementById("playerName").value;
      let playerRoom = document.getElementById("room").value;

      socket.emit("MTS:Player_Settings", [playerName, playerRoom].join('|'));
    }
  }

  //TEST CONTROL
  document.addEventListener('keydown', (ev) => {
    if (ev.code == 'KeyW') {
      player.y += 1;
      socket.emit("MTS:Change_Player_State", JSON.stringify(player));
    } else if (ev.code == 'KeyS') {
      player.y -= 1;
      socket.emit("MTS:Change_Player_State", JSON.stringify(player));
    }
  });
}

window.addEventListener("load", (event) => {
  mainClient();
  main();
});