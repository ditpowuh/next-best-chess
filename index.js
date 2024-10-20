require("dotenv").config();
const os = require("os");
const express = require("express");
const app = express();
const http = require("http").Server(app);
const io = require("socket.io")(http);

const chess = require("chess.js");
const processes = require("child_process");

// Change here or change accordingly in .env file
const PORT = process.env.PORT || 3000;
const DEPTH = process.env.DEPTH || 25;

// Replace the string with the path to binary, otherwise, rename binary to stockfish
const stockfish = processes.spawn("stockfish");
// Set CPU and RAM usage in .env file or it will default to the following
const cpuUsage = process.env.CPU || (os.cpus().length > 2 ? os.cpus().length - 2 : 1);
const ramUsage = process.env.RAM || Math.round(os.totalmem() / Math.pow(1024, 2) / 4);

let fen;
let nextMove;
let moveValue;
let mate;
let result;

let time = 0;

var inProgress = false;

process.on("uncaughtException", function(exception) {
  console.log(exception);
});

function checkChess(fenData) {
  const board = new chess.Chess();

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
      if (originalTurn == "b") {
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
      if (originalTurn == "w") {
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

app.get("*", function(request, response) {
  response.sendFile(__dirname + "/public/404.html");
});

stockfish.stdin.write(`setoption name Threads value ${cpuUsage}\n`);
stockfish.stdin.write(`setoption name Hash value ${ramUsage}\n`);
stockfish.stdin.write(`setoption name UCI_ShowWDL value true\n`);

io.on("connection", function(socket) {
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

  stockfish.stdout.on("data", (data) => {
    let output = data.toString();
    if (output.startsWith("info depth " + DEPTH)) {
      let filter = output.split(" ");
      moveValue = filter[filter.indexOf("cp") + 1];
      if (parseInt(moveValue) >= 0) {
        moveValue = "+" + (moveValue / 100);
      }
      else {
        moveValue = moveValue / 100;
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
      socket.emit("result", result, (Date.now() - time) / 1000, nextMove, moveValue, mate);
      inProgress = false;
    }
  });

});

http.listen(PORT, function() {
  console.log(`Listening at specified port...\nGo to http://localhost:${PORT} to use the app.`);
  console.log("\nResources To Be Used For Stockfish:");
  console.log("CPU - " + cpuUsage + " cores");
  console.log("RAM - " + ramUsage + " MB");
  console.log("\nStockfish Loaded Settings:");
  console.log("Depth - " + DEPTH);
});

process.on("exit", function() {
  stockfish.kill();
});
