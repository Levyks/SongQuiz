$(() => {
  $("#lobby-btn").click(() => {
    $.get("/mock/set?to=lobby");
  });

  $("#starting-game-btn").click(() => {
    $.get("/mock/set?to=startingGame");
  });

  $("#mid-round-btn").click(() => {
    $.get("/mock/set?to=midRound");
  });

  $("#round-results-btn").click(() => {
    $.get("/mock/set?to=roundResults");
  });

  $("#final-results-btn").click(() => {
    $.get("/mock/set?to=finalResults");
  });



});