import "dotenv/config";
import os from "os";
import express from "express";
import http from "http";
import path from "path";
import chalk from "chalk";
import {Server} from "socket.io";
import {fileURLToPath} from "url";

import processes from "child_process";
import {Chess} from "chess.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const server = http.Server(app);
const io = new Server(server);

// Change here or change accordingly in .env file
const PORT = process.env.PORT || 3000;
const DEPTH = process.env.DEPTH || 25;

// Replace the string with the path to binary, otherwise, rename binary to stockfish
const stockfish = processes.spawn("stockfish");
// Set CPU and RAM usage in .env file or it will default to the following
const cpuUsage = process.env.CPU || (os.cpus().length > 2 ? os.cpus().length - 2 : 1);
const ramUsage = process.env.RAM || Math.round(os.totalmem() / Math.pow(1024, 2) / 4);

// Change to enable or disable spacebar shortcut or use .env
const shortcutEnabled = process.env.SHORTCUT || false;

let fen;
let nextMove;
let evalValue;
let mate;
let result;

let time = 0;

let inProgress = false;

process.on("uncaughtException", function(exception) {
  console.log(exception);
});

function checkChess(fenData) {
  const board = new Chess();

  try {
    let fenSplit = fenData.split(" ");
    let originalTurn = fenSplit[1];
    fenSplit[1] = "w";
    board.load(fenSplit.join(" "));
    if (board.isCheckmate()) {
      return {"valid": false, "message": "Checkmate"};
    }
    else if (board.isStalemate()) {
      return {"valid": false, "message": "Stalemate"};
    }
    else if (board.inCheck()) {
      if (originalTurn === "b") {
        return {"valid": false, "message": "White Is In Check"};
      }
    }
    fenSplit[1] = "b";
    board.load(fenSplit.join(" "));
    if (board.isCheckmate()) {
      return {"valid": false, "message": "Checkmate"};
    }
    else if (board.isStalemate()) {
      return {"valid": false, "message": "Stalemate"};
    }
    else if (board.inCheck()) {
      if (originalTurn === "w") {
        return {"valid": false, "message": "Black Is In Check"};
      }
    }
  }
  catch (e) {
    return {"valid": false, "message": "Invalid"};
  }
  return {"valid": true, "message": null};
}

app.use(express.static("public", {
  extensions: ["html"]
}));
app.use(express.static("node_modules/@chrisoakman/chessboardjs/dist"));

app.use((request, response) => {
  response.status(404).sendFile(__dirname + "/public/404.html");
});

stockfish.stdin.write(`setoption name Threads value ${cpuUsage}\n`);
stockfish.stdin.write(`setoption name Hash value ${ramUsage}\n`);
stockfish.stdin.write(`setoption name UCI_ShowWDL value true\n`);

io.on("connection", function(socket) {
  socket.emit("shortcut", shortcutEnabled);
  socket.on("solve", function(fenData) {
    if (inProgress) {
      return;
    }
    let check = checkChess(fenData);
    if (!check.valid) {
      socket.emit("problem", check.message + "!");
      return;
    }
    fen = fenData;
    mate = 0;
    time = Date.now();
    inProgress = true;
    stockfish.stdin.write(`position fen ${fen}\n`);
    stockfish.stdin.write(`go depth ${DEPTH}\n`);
  });
});

stockfish.stdout.on("data", (data) => {
  let output = data.toString();
  if (output.startsWith("info depth " + DEPTH)) {
    let filter = output.split(" ");
    evalValue = filter[filter.indexOf("cp") + 1];
    if (parseInt(evalValue) >= 0) {
      evalValue = "+" + (evalValue / 100);
    }
    else {
      evalValue = evalValue / 100;
    }
    if (filter.includes("mate")) {
      mate = filter[filter.indexOf("mate") + 1];
    }
  }
  if (output.includes("bestmove")) {
    let filter = output.substring(output.indexOf("bestmove"));
    nextMove = filter.split(" ")[1];
    stockfish.stdin.write(`position fen ${fen} moves ${nextMove}\n`);
    stockfish.stdin.write("d\n");
  }
  if (output.includes("Fen:")) {
    let filter = output.split(" ");
    for (let i = 0; i < filter.length; i++) {
      if (filter[i].includes("Fen:")) {
        result = filter[i + 1];
      }
    }
    io.emit("result", result, (Date.now() - time) / 1000, nextMove, evalValue, mate);
    inProgress = false;
  }
});

server.listen(PORT, function() {
  console.log(`Listening at specified port...\nGo to ${chalk.cyanBright(`http://localhost:${PORT}`)} to use the app.`);
  console.log(`\n${chalk.yellow("Resources To Be Used For Stockfish:")}`);
  console.log(`${chalk.green("CPU")} - ${cpuUsage} cores`);
  console.log(`${chalk.green("RAM")} - ${ramUsage} MB`);
  console.log(`\n${chalk.yellow("Stockfish Loaded Settings:")}`);
  console.log(`${chalk.green("Depth")} - ${DEPTH}`);
  console.log("\nReady!");
});

process.on("exit", function() {
  stockfish.kill();
});
