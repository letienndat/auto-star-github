const submitBtn = document.getElementById("submit");
const starAllBtn = document.getElementById("starAll");
const stopStar = document.getElementById("stopStar");
const repoTableBody = document.querySelector("#repoTable tbody");
const statusEl = document.getElementById("status");
const checkboxSelectAllRepo = document.getElementById("selectAll");
var listUnChecked = [];
let playStarring = false;
let rowProcessing = 0;

submitBtn.onclick = async (event) => {
  event.preventDefault();

  playStarring = false;
  rowProcessing = 0;
  repoTableBody.innerHTML = "";
  statusEl.textContent = "Fetching repos...";

  const keyword = document.getElementById("keyword").value.trim();
  let page = parseInt(document.getElementById("page").value);
  let count = parseInt(document.getElementById("count").value);

  if (isNaN(page) || page < 1) page = 1;
  if (isNaN(count) || count < 1) count = 100;

  const query = keyword ? encodeURIComponent(keyword) : "stars:>1000";

  try {
    const res = await fetch(
      `https://api.github.com/search/repositories?q=${query}&per_page=${count}&page=${page}`
    );

    const data = await res.json();
    if (!data.items || data.items.length === 0) {
      statusEl.textContent = "No repositories found.";
      return;
    }

    data.items.forEach((repo, index) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td><input type="checkbox" id="checkbox-${index}" class="form-check-input repo-checkbox" data-name="${
        repo.full_name
      }" checked /></td>
        <td>${index + 1}</td>
        <td><a href="${
          repo.html_url
        }" target="_blank" rel="noopener noreferrer">${repo.full_name}</a></td>
        <td>${repo.stargazers_count}</td>
        <td>${
          repo.description
            ? repo.description.slice(0, 100) +
              (repo.description.length > 100 ? "..." : "")
            : ""
        }</td>
      `;
      repoTableBody.appendChild(row);
      checkboxSelectAllRepo.checked = true;
    });

    statusEl.textContent = "Repo list ready.";
  } catch (err) {
    console.error(err);
    statusEl.textContent = "Failed to fetch repositories.";
  }
};

starAllBtn.onclick = async () => {
  setStatePlayStarring(true);

  let delayEveryRequest = parseFloat(document.getElementById("delay").value);
  if (isNaN(delayEveryRequest) || delayEveryRequest < 1) delayEveryRequest = 2;

  document.querySelector(
    ".notify-open-tab-repo"
  ).innerHTML = `Open new tab for a repo every ${delayEveryRequest}s`;

  const checkboxes = document.querySelectorAll(".repo-checkbox");
  const checkboxesChecked = Array.from(checkboxes)
    .filter((checkbox) => checkbox.checked)
    .map((checkbox) => checkbox.dataset.name);
  rowProcessing = checkboxesChecked.reduce((a, b) => a + 1, 0);

  Array.from(document.getElementsByTagName("tr")).forEach((row) => {
    row.classList.remove("table-warning", "table-success", "table-danger");
  });

  for (let i = 0; i < checkboxes.length; i++) {
    if (!playStarring) break;

    const checkbox = checkboxes[i];
    const row = checkbox.closest("tr");
    if (!checkbox.checked) continue;

    const repoName = checkbox.dataset.name;
    statusEl.textContent = `⭐ Opening and star repo ${repoName}`;

    // Open tab with auto_star query param
    chrome.runtime.sendMessage({
      type: "open_tab",
      url: `https://github.com/${repoName}?auto_star=1`,
    });

    row.classList.remove("table-success", "table-danger");
    row.classList.add("table-warning");

    if (!playStarring) break;

    // Delay for the script to auto star and close tab
    await new Promise((resolve) =>
      setTimeout(resolve, delayEveryRequest * 1000)
    );
  }
};

document.querySelectorAll(".repo-checkbox").forEach((cb) => {
  cb.addEventListener("change", tapCheckbox);
});

stopStar.onclick = () => {
  setStatePlayStarring(false);
  statusEl.textContent = "⏹ Stoped";
};

checkboxSelectAllRepo.addEventListener("change", (e) => {
  document.querySelectorAll(".repo-checkbox").forEach((cb) => {
    cb.checked = e.target.checked;
  });
});

const setStatePlayStarring = (status) => {
  playStarring = status;

  if (playStarring) {
    starAllBtn.classList.add("disabled");
    stopStar.classList.remove("disabled");
  } else {
    starAllBtn.classList.remove("disabled");
    stopStar.classList.add("disabled");
  }
};

const tapCheckbox = (e) => {
  if (!e.checked) {
    listUnChecked.push(e.id);
    checkboxSelectAllRepo.checked = false;
  } else {
    listUnChecked = listUnChecked.filter((item) => item !== e.id);
    checkboxSelectAllRepo.checked = listUnChecked.length === 0;
  }
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "star_result" && playStarring) {
    const { repo, success } = message;

    rowProcessing -= 1;
    console.log(repo, rowProcessing, success);
    updateUIByRowProcessing();

    const checkbox = document.querySelector(
      `.repo-checkbox[data-name="${repo}"]`
    );
    const row = checkbox?.closest("tr");
    if (row) {
      if (success) {
        row.classList.remove("table-warning");
        row.classList.add("table-success");
      } else {
        row.classList.remove("table-warning");
        row.classList.add("table-danger");
      }
    }
  }
});

const updateUIByRowProcessing = () => {
  if (rowProcessing == 0) {
    playStarring = false;
    statusEl.textContent = "✅ Auto star completed.";
    setStatePlayStarring(false);
  }
};
