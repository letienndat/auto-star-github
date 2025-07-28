const sendMessage = (status, message, retry) => {
  chrome.runtime.sendMessage(
    {
      type: "star_result",
      success: status,
      repo: window.location.pathname.slice(1),
      message,
      retry,
    },
    () => {
      window.close();
    }
  );
};

(async () => {
  const params = new URLSearchParams(window.location.search);
  if (params.get("auto_star") !== "1") {
    return;
  }
  const retry = params.get("retry") === "true" ? true : false;

  const form = document.querySelector('form[action$="/star"]');
  if (!form) {
    let message = "Star form not found."
    sendMessage(false, message, retry);
    return;
  }

  const tokenInput = form.querySelector('input[name="authenticity_token"]');
  if (!tokenInput) {
    let message = "authenticity_token not found."
    sendMessage(false, message, retry);
    return;
  }

  const authToken = tokenInput.value;
  const action = form.getAttribute("action");

  try {
    const res = await fetch(action, {
      method: "POST",
      headers: {
        "x-requested-with": "XMLHttpRequest",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: `authenticity_token=${encodeURIComponent(authToken)}`,
      credentials: "same-origin",
    });

    if (res.ok) {
      let message = "Repo starred."
      sendMessage(true, message, retry);
    } else {
      let message = "Star failed."
      sendMessage(false, message, retry);
    }
  } catch (err) {
    let message = `Network error: ${err}`
    sendMessage(false, message, retry);
  }
})();
