const socket = io();
var previousFen = "";
var lastMove = "";
var turn = "w";

function toggleTurn(force) {
  if (force !== undefined) {
    turn = force;
    if (turn == "w") {
      $("#turn").removeClass("black").addClass("white");
    }
    else if (turn == "b") {
      $("#turn").removeClass("white").addClass("black");
    }
  }
  else {
    if (turn == "w") {
      $("#turn").removeClass("white").addClass("black");
      turn = "b";
    }
    else if (turn == "b") {
      $("#turn").removeClass("black").addClass("white");
      turn = "w";
    }
    $("#fen").val(board.fen() + " " + turn + " - - 0 1");
  }
  $("#favicon").attr("href", "/Images/" + turn + "K.png");
}

function updateBoard(oldPosition, newPosition) {
  $("#fen").val(Chessboard.objToFen(newPosition) + " " + turn + " - - 0 1");
}

function showAgain() {
  if (previousFen == "" || lastMove == "") {
    return;
  }
  board.position(previousFen, false);
  board.position(lastMove);
}

const board = Chessboard("board", {
  pieceTheme: "Images/{piece}.png",
  position: "start",
  draggable: true,
  dropOffBoard: "trash",
  sparePieces: true,
  onChange: updateBoard
});
$("#board .chessboard-63f37 div").css("padding-left", "0");
$("#fen").val(board.fen() + " " + turn + " - - 0 1");

socket.on("connect", () => {
  socket.on("result", function(fenData, time, nextMove, evalValue, mate) {
    $("#status").html(`Solved in ${time} seconds!` + " ");
    $("#move").html(nextMove);
    if (evalValue !== null) {
      $("#value").html("(" + evalValue + ")");
    }
    if (mate != 0) {
      $("#mate").html(" " + `[Mate in ${mate}]`);
    }
    lastMove = fenData;
    board.position(fenData);
  });
  socket.on("problem", function(data) {
    $("#move").html("");
    $("#value").html("");
    $("#mate").html("");
    $("#status").html(data);
  })

  $("#reset").on("click", function() {
    board.start();
  });
  $("#clear").on("click", function() {
    board.clear();
  });
  $("#flip").on("click", function() {
    board.flip();
  });
  $("#turn").on("click", function() {
    toggleTurn();
  });
  $("#solve").on("click", function() {
    previousFen = board.fen() + " " + turn + " - - 0 1";
    $("#move").html("");
    $("#value").html("");
    $("#mate").html("");
    $("#status").html("Solving...");
    socket.emit("solve", previousFen);
  });
  $("#applyfen").on("click", function() {
    let updatedTurn = $("#fen").val().split(" ")[1];
    if (updatedTurn !== undefined) {
      toggleTurn(updatedTurn);
    }
    board.position($("#fen").val());
  });
});

$("#move").on("click", function(event) {
  event.preventDefault();
  showAgain();
});

