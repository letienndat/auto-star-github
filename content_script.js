let timeout = 30;
let responded = false;

const response = (status) => {
  if (responded) return;
  responded = true;

  chrome.runtime.sendMessage(
    {
      type: "star_result",
      success: status,
      repo: window.location.pathname.slice(1),
    },
    () => {
      window.close();
    }
  );
};

setTimeout(() => {
  console.log(`Timeout after ${timeout}s`);
  response(false);
}, timeout * 1000);

(async () => {
  const params = new URLSearchParams(window.location.search);
  if (params.get("auto_star") !== "1") {
    return;
  }

  const form = document.querySelector('form[action$="/star"]');
  if (!form) {
    console.log("❌ Star form not found.");
    response(false);
    return;
  }

  const tokenInput = form.querySelector('input[name="authenticity_token"]');
  if (!tokenInput) {
    console.log("❌ authenticity_token not found.");
    response(false);
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
      response(true);
    } else {
      console.log("❌ Star failed.");
      response(false);
    }
  } catch (err) {
    console.log("❌ Network error:", err);
    response(false);
  }
})();
