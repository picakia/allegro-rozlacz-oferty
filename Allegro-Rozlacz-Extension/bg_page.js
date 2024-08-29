chrome.runtime.onMessage.addListener(function (url, sender, onSuccess) {
  const req = new XMLHttpRequest({});
  req.open("GET", url, true);
  req.onreadystatechange = function () {
    if (req.readyState == 4) {
      if (req.status == 200) {
        onSuccess(req.responseText);
      } else {
        console.error(
          `Failed to get offers for ${link} - STATUS: ${req.status}`
        );
      }
    }
  };
  req.send();

  return true; // Will respond asynchronously.
});
