var createBasicAjaxOptions = function() {
  return {
    "url": "http://192.168.1.87:8888",
    type: "GET",
  };
}

var setRead = function(id) {
  var message = $("#" + id);
  message.removeClass("unread").addClass("read");
  message.find(":checkbox").prop("disabled", true).prop("checked", true).blur();
}

var flagRead = function() {
  var id = $(this).parents(".messageContainer").prop("id");
  var ajaxOptions = createBasicAjaxOptions();
  ajaxOptions['url'] += '/flag?ID=' + id;
  ajaxOptions['success'] = function() {
    setRead(id);
  }
  $.ajax(ajaxOptions);
};



var constructMessage = function(id, text)
{
  var container = $("<div/>", {'id': id, 'class': "messageContainer unread"});
  var alignDiv = $("<div/>", {'class': "alignDiv"});
  $("<p/>", {'class': "messageText"}).text(text).appendTo(alignDiv);

  $("<input/>", {type: "checkbox"}).click(flagRead).appendTo(alignDiv);
  container.append(alignDiv);

  return container;
};

var setupSendButton = function() {
  $("#sendButton").click(function() {
    var tAC = $("#msgInput").val().trim();
    var pattern = /.{1,140}/
    //if (tAC.length > 0 && tAC.length <= 140) {
    if (pattern.test(tAC)) {
      var ajaxOptions = createBasicAjaxOptions();
      ajaxOptions['url'] += ("/save?msg=" + tAC);
      ajaxOptions['success'] = function(data) {
        $("#messages").prepend(constructMessage(data['id'], tAC));
        $("#msgInput").val("");
        $("#warning").toggle(false);
      };
      ajaxOptions['error'] = function() {
        $("#warning").toggle(true);
      }

      $.ajax(ajaxOptions);
    }
    else {
      $("#warning").toggle(true);
    }
  });
};

var populateMessageList = function() {
  var ajaxOptions = createBasicAjaxOptions();
  ajaxOptions['url'] += "/getall";
  ajaxOptions['success'] = function(data) {
    data.forEach(function(element) {
      $("#messages").prepend(constructMessage(element['id'], element['message']));
      if (element['flag']) setRead(element['id']);
    });
  };

  $.ajax(ajaxOptions);
};

$(document).ready(function() {
  setupSendButton();
  populateMessageList();
});
