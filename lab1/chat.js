$(document).ready(function() {
  $("#sendButton").click(function() {
    var tAC = $("#msgInput").val();
    if (tAC.length > 0 && tAC.length <= 140) {
      $("#messages").prepend(constructMessage(tAC));
      $("#warning").toggle(false);
    }
    else {
      $("#warning").toggle(true);
    }
  });
});

var constructMessage = function(text)
{
  var container = $("<div/>", {class: "messageContainer unread"});
  var alignDiv = $("<div/>", {class: "alignDiv"});
  $("<input/>", {type: "checkbox"}).appendTo(alignDiv);
  $("<p/>", {class: "messageText"}).text(text).appendTo(alignDiv);
  container.append(alignDiv);
  return container;
}
