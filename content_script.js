const response = (status, retry) => {
  chrome.runtime.sendMessage(
    {
      type: "star_result",
      success: status,
      repo: window.location.pathname.slice(1),
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
    console.log("❌ Star form not found.");
    response(false, retry);
    return;
  }

  const tokenInput = form.querySelector('input[name="authenticity_token"]');
  if (!tokenInput) {
    console.log("❌ authenticity_token not found.");
    response(false, retry);
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
      console.log("✅ Repo starred.");
      response(true, retry);
    } else {
      console.log("❌ Star failed.");
      response(false, retry);
    }
  } catch (err) {
    console.log("❌ Network error:", err);
    response(false, retry);
  }
})();
