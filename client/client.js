import { io } from "socket.io-client";
import { main } from "./src/main.js";

window.socket = io();
window.activeButtons = [];

function addInfoBlock() {
  let block = document.getElementById("wrap");
  block.innerHTML = "";

  if (window.otherPlayers !== null) {
  block.insertAdjacentHTML("beforeend", `<div class="person" style="background-color: black;">
                                            <div class="pers-color" style="background-color: ${window.player.color};"></div>
                                            <div class="pers-name">${window.player.name}</div>
                                            <div class="pers-stat">${window.player.health}/100</div>
                                         </div>`);
  }
  
  if (window.otherPlayers !== null) {
    for (let i = 0; i < window.otherPlayers.length; i++) {
      block.insertAdjacentHTML("beforeend", `<div class="person">
                                              <div class="pers-color" style="background-color: ${window.otherPlayers[i].color};"></div>
                                              <div class="pers-name">${window.otherPlayers[i].name}</div>
                                              <div class="pers-stat">${window.otherPlayers[i].health}/100</div>
                                          </div>`);
    }
  }
}

async function mainClient() {
  // client-side
  window.socket.on("connect", () => {
    console.log(window.socket.id); // x8WIv7-mJelg7on_ALbx
  });

  window.socket.on("MFS:Other_Players", function(msg) {
    let tmpPlayers = msg.split('|');
    window.otherPlayers = [];
    
    for (let i = 0; i < tmpPlayers.length; i++) {
      if (tmpPlayers[i] !== "") {
        window.otherPlayers.push(JSON.parse(tmpPlayers[i]));
      }
    }
    addInfoBlock();
    //console.log("Other: " + msg);
  });

  window.socket.on("MFS:Get_Player", function(msg) {
    window.player = JSON.parse(msg);
    addInfoBlock();
    //console.log("Player: " + msg);
  });

  window.socket.on("disconnect", () => {
    console.log(window.socket.id); // undefined
  });

  //CREATE PLAYER
  document.getElementById("start").onclick = () => {
    if (window.player === null) {
      let playerName = document.getElementById("playerName").value;
      let playerRoom = document.getElementById("room").value;
      let title = document.getElementById("roomShow");

      if (playerName !== "" && playerRoom !== "") {
        window.socket.emit("MTS:Player_Settings", [playerName, playerRoom].join('|'));
        title.innerText = `Your room is '${playerRoom}'`;
        title.style.color = "aliceblue";
        title.style.fontStyle = "normal";
        document.getElementById("start").value = "LEAVE";
        document.getElementById("playerName").value = "";
        document.getElementById("room").value = "";
      } else {
        title.innerText = `invalid room or player name`;
        title.style.color = "red";
        title.style.fontStyle = "italic";
      }
    } else {
      window.location.reload();
    }
  }

  
  document.addEventListener("keydown", function (event) {
    if (!window.activeButtons.includes(event.code))
      window.activeButtons.push(event.code);
  });

  document.addEventListener("keyup", function (event) {
    if (activeButtons.includes(event.code))
      window.activeButtons.splice(window.activeButtons.indexOf(event.code), 1);
  });
}

window.addEventListener("load", (event) => {
  window.player = null;
  window.otherPlayers = null;

  mainClient();
  main();
});