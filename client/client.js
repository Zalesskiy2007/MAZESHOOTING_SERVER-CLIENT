import { io } from "socket.io-client";
import { main } from "./src/main.js";
import { canvas } from "./src/gl.js";

window.socket = io();
window.activeButtons = [];

// Mouse data
window.mouseX = 0;
window.mouseXOld = 0;
window.mouseDx = 0;
window.mouseY = 0;
window.mouseYOld = 0;
window.mouseDy = 0;
window.isClicked = false;

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
  });

  window.socket.on("MFS:Get_Player", function(msg) {
    window.player = JSON.parse(msg);
    addInfoBlock();
  });

  window.socket.on("MFS:Invalid_Name", (msg) => {
    let title = document.getElementById("roomShow");
    let mes = msg.split("|");

    title.innerText = `this name had already taken`;
    title.style.color = "red";
    title.style.fontStyle = "italic";
    document.getElementById("start").value = "GO!";
    document.getElementById("playerName").value = mes[0];
    document.getElementById("room").value = mes[1];
  });

  window.socket.on("disconnect", () => {
    console.log(window.socket.id); // undefined
  });

  window.socket.on("MFS:Game_Over", () => {
    window.location.reload();
  });

  //CREATE PLAYER
  document.getElementById("start").onclick = () => {
    if (window.player === null) {
      let playerName = document.getElementById("playerName").value;
      let playerRoom = document.getElementById("room").value;
      let title = document.getElementById("roomShow");

      if (playerName !== "" && playerRoom !== "" && !playerName.includes(" ") && !playerRoom.includes(" ")) {
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

  
  document.addEventListener("keydown", (event) => {
    if (!window.activeButtons.includes(event.code))
      window.activeButtons.push(event.code);
  });

  document.getElementById("cursor").addEventListener("click", async () => {
    await canvas.requestPointerLock({ unadjustedMovement: true });
  });

  document.addEventListener("keyup", (event) => {
    if (window.activeButtons.includes(event.code))
      window.activeButtons.splice(window.activeButtons.indexOf(event.code), 1);
  });

  document.addEventListener("mousemove", (event) => {
    window.mouseDx = event.movementX;
    window.mouseDy = event.movementY;
  });
  document.addEventListener("mousedown", () => {
    window.isClicked = true;
  });
  document.addEventListener("mouseup", () => {
    window.isClicked = false;
  });
}

window.addEventListener("load", (event) => {
  window.player = null;
  window.otherPlayers = null;

  mainClient();
  main();
});