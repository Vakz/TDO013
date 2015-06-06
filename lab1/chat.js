


$(document).ready(function() {
  $("#sendButton").click(function() {
    var tAC = $("#msgInput").val().trim();
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
  $("<p/>", {class: "messageText"}).text(text).appendTo(alignDiv);

  var readFunc = function() {
    $(this).parent().removeClass("unread").addClass("read");
    $(this).prop("disabled", true);
    // Outline: none for some reason not working on focus, using this
    // as workaround
    $(this).blur();
  };

  $("<input/>", {type: "checkbox"}).click(readFunc).appendTo(alignDiv);
  container.append(alignDiv);
  return container;
}
