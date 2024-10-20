const socket = io();
var previousFen = "";
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
  }
  $("#favicon").attr("href", "/Images/" + turn + "K.png");
  $("#fen").val(board.fen() + " " + turn + " - - 0 1");
}

function updateBoard(oldPosition, newPosition) {
  $("#fen").val(Chessboard.objToFen(newPosition) + " " + turn + " - - 0 1");
}

function showAgain() {
  if (previousFen == "") {
    return;
  }
  let currentFen = board.fen();
  board.position(previousFen, false);
  board.position(currentFen);
}

const board = Chessboard("board", {
  pieceTheme: "Images/{piece}.png",
  position: "start",
  draggable: true,
  dropOffBoard: "trash",
  sparePieces: true,
  onChange: updateBoard
});
$("#fen").val(board.fen() + " " + turn + " - - 0 1")

socket.on("connect", () => {
  socket.on("result", function(fenData, time, nextMove) {
    $("#status").html(`Solved in ${time} seconds!` + " ");
    $("#move").html(nextMove);
    board.position(fenData);
  });
  socket.on("problem", function(data) {
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
    $("#status").html("Solving...");
    socket.emit("solve", previousFen);
  });
  $("#applyfen").on("click", function() {
    board.position($("#fen").val());
    let updatedTurn = $("#fen").val().split(" ")[1];
    if (updatedTurn !== undefined) {
      toggleTurn(updatedTurn);
    }
  });
});

$("#move").on("click", function(event) {
  event.preventDefault();
  showAgain();
});
