import { io } from "socket.io-client";
import { main } from "./src/main.js";

const socket = io();

function addInfoBlock() {
  let block = document.getElementById("wrap");
  block.innerHTML = "";

  if (window.otherPlayers !== null) {
  block.insertAdjacentHTML("beforeend", `<div class="person" style="background-color: black;">
                                            <div class="pers-color"></div>
                                            <div class="pers-name">${window.player.name}</div>
                                            <div class="pers-stat">${window.player.health}/100</div>
                                         </div>`);
  }
  
  if (window.otherPlayers !== null) {
    for (let i = 0; i < window.otherPlayers.length; i++) {
      block.insertAdjacentHTML("beforeend", `<div class="person">
                                              <div class="pers-color"></div>
                                              <div class="pers-name">${window.otherPlayers[i].name}</div>
                                              <div class="pers-stat">${window.otherPlayers[i].health}/100</div>
                                          </div>`);
    }
  }
}

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
    addInfoBlock();
    console.log("Other: " + msg);
  });

  socket.on("MFS:Get_Player", function(msg) {
    window.player = JSON.parse(msg);
    addInfoBlock();
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
      let title = document.getElementById("roomShow");

      if (playerName !== "" && playerRoom !== "") {
        socket.emit("MTS:Player_Settings", [playerName, playerRoom].join('|'));
        title.innerText = `Your room is '${playerRoom}'`;
        title.style.color = "aliceblue";
        title.style.fontStyle = "normal";
      } else {
        title.innerText = `invalid room or player name`;
        title.style.color = "red";
        title.style.fontStyle = "italic";
      }
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