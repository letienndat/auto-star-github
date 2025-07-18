const submitBtn = document.getElementById("submit");
const starAllBtn = document.getElementById("starAll");
const stopStar = document.getElementById("stopStar");
const repoTableBody = document.querySelector("#repoTable tbody");
const statusEl = document.getElementById("status");
const checkboxSelectAllRepo = document.getElementById("selectAll");
const totalRowSelected = document.getElementById("totalRowSelected");
const textPending = document.getElementById("pending");
const textProcess = document.getElementById("process");
const textSuccess = document.getElementById("success");
const textFail = document.getElementById("fail");
const retryAllBtn = document.getElementById("btn-retry-all");
let listUnChecked = [];
let repoFails = [];
let playStarring = false;
let playRetrying = false;
let rowProcessing = 0;
let rowPending = 0;
let rowCanProcess = 0;
let rowSuccess = 0;
let rowFail = 0;
const rowProcessed = () => rowSuccess + rowFail;

const updateUIProcess = (reset = false) => {
  if (reset) {
    rowPending = 0;
    rowCanProcess = 0;
    rowSuccess = 0;
    rowFail = 0;
  }
  totalRowSelected.textContent = rowCanProcess;
  textPending.textContent = rowPending;
  textProcess.textContent = rowProcessed();
  textSuccess.textContent = rowSuccess;
  textFail.textContent = rowFail;
};

submitBtn.onclick = async (event) => {
  event.preventDefault();

  setStatePlayStarring(false);
  repoFails = [];
  rowProcessing = 0;
  repoTableBody.innerHTML = "";
  statusEl.textContent = "Fetching repos...";
  retryAllBtn.classList.add("d-none");

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
      row.dataset.name = repo.full_name;
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
        <td>
          <div class='d-flex flex-column align-items-center'>
            <p id='status-${repo.full_name}' class='mb-0 d-none'></p>
            <button id='retry-${
              repo.full_name
            }' class='btn btn-link text-primary p-0 retry-btn d-none' data-repo='${
        repo.full_name
      }'>Retry</button>
          </div>
        </td>
      `;
      repoTableBody.appendChild(row);
      checkboxSelectAllRepo.checked = true;
    });

    document.querySelectorAll(".retry-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const repo = btn.closest("tr").dataset.name;
        retryRow(repo);
      });
    });

    statusEl.textContent = "Repo list ready.";
  } catch (err) {
    console.log(err);
    statusEl.textContent = "Failed to fetch repositories.";
  }
};

starAllBtn.onclick = async () => {
  updateUIProcess(true);
  repoFails = [];
  playRetrying = false;
  retryAllBtn.disabled = true;
  blockAllBtnRetry(false);

  const checkboxes = document.querySelectorAll(".repo-checkbox");
  const checkboxesChecked = Array.from(checkboxes)
    .filter((checkbox) => checkbox.checked)
    .map((checkbox) => checkbox.dataset.name);
  rowProcessing = checkboxesChecked.reduce((a, b) => a + 1, 0);
  rowCanProcess = rowProcessing;

  if (rowProcessing == 0) {
    return;
  }

  setStatePlayStarring(true);

  let delayEveryRequest = parseFloat(document.getElementById("delay").value);
  if (isNaN(delayEveryRequest) || delayEveryRequest < 1) delayEveryRequest = 2;

  document.querySelector(
    ".notify-open-tab-repo"
  ).innerHTML = `Open new tab for a repo every ${delayEveryRequest}s`;

  updateUIProcess();

  Array.from(document.getElementsByTagName("tr")).forEach((row, index) => {
    if (index === 0) return;

    row.classList.remove("table-warning", "table-success", "table-danger");

    const repo = row.dataset.name;
    const status = row.querySelector(`#status-${CSS.escape(repo)}`);
    status.textContent = "";
    status.classList.remove("text-success", "text-danger", "text-warning");

    const btnRetry = row.querySelector(`#retry-${CSS.escape(repo)}`);
    btnRetry.classList.add("d-none");
  });

  for (let i = 0; i < checkboxes.length; i++) {
    if (!playStarring) break;

    const checkbox = checkboxes[i];
    const row = checkbox.closest("tr");
    if (!checkbox.checked) continue;

    const repoName = checkbox.dataset.name;
    statusEl.textContent = `⭐ Opening and star repo ${repoName}`;

    // Open tab with auto_star query param
    openTabAutoStar(repoName);

    rowPending += 1;
    updateUIProcess();
    row.classList.remove("table-success", "table-danger");
    row.classList.add("table-warning");

    const status = row.querySelector(`#status-${CSS.escape(repoName)}`);
    const btnRetry = row.querySelector(`#retry-${CSS.escape(repoName)}`);
    status.textContent = "Pending";
    status.classList.add("text-warning");
    status.classList.remove("d-none");
    btnRetry.classList.add("d-none");

    if (!playStarring) break;
    await delay(delayEveryRequest * 1000);
  }
};

retryAllBtn.addEventListener("click", async () => {
  setStatePlayStarring(true)
  playRetrying = true;
  retryAllBtn.disabled = true;
  blockAllBtnRetry(true);

  let delayEveryRequest = parseFloat(document.getElementById("delay").value);
  if (isNaN(delayEveryRequest) || delayEveryRequest < 1) delayEveryRequest = 2;

  for (repo of repoFails) {
    retryRow(repo);
    await delay(delayEveryRequest * 1000);
  }
});

const retryRow = (repo) => {
  setStatePlayStarring(true)
  playRetrying = true;
  statusEl.textContent = `⭐ Reopening and star repo ${repo}`;

  rowProcessing += 1;
  rowPending += 1;
  updateUIProcess();
  const row = document.querySelector(`tr[data-name=${CSS.escape(repo)}]`);
  row.classList.remove("table-success", "table-danger");
  row.classList.add("table-warning");

  const status = row.querySelector(`#status-${CSS.escape(repo)}`);
  status.textContent = "Pending";
  status.classList.remove("text-success", "text-danger");
  status.classList.add("text-warning");

  const btnRetry = row.querySelector(`#retry-${CSS.escape(repo)}`);
  btnRetry.classList.add("d-none");

  openTabAutoStar(repo, true);
};

const blockAllBtnRetry = (status) => {
  document.querySelectorAll(".retry-btn").forEach((btn) => {
    btn.disabled = status;
  });
};

const openTabAutoStar = (repo, retry = false) => {
  chrome.runtime.sendMessage({
    type: "open_tab",
    url: `https://github.com/${repo}?auto_star=1`,
    retry,
  });
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
    const { repo, success, retry } = message;

    if (!success && !playRetrying) {
      repoFails.push(repo);
    } else if (success && retry) {
      repoFails = repoFails.filter((item) => item != repo);
    }

    rowPending -= 1;
    rowProcessing -= 1;
    rowSuccess += success ? 1 : 0;
    rowFail += !success ? (retry ? 0 : 1) : retry ? -1 : 0;

    console.table({
      repo,
      rowProcessing,
      success,
      retry,
    });

    updateUIProcess();
    updateUIByRowProcessing();

    const checkbox = document.querySelector(
      `.repo-checkbox[data-name="${repo}"]`
    );
    const row = checkbox?.closest("tr");
    const status = row.querySelector(`#status-${CSS.escape(repo)}`);
    const btnRetry = row.querySelector(`#retry-${CSS.escape(repo)}`);
    if (row) {
      if (success) {
        row.classList.remove("table-warning");
        row.classList.add("table-success");
        status.textContent = "Success";
        status.classList.remove("text-warning", "text-danger");
        status.classList.add("text-success");
        btnRetry.classList.add("d-none");
      } else {
        row.classList.remove("table-warning");
        row.classList.add("table-danger");
        status.textContent = "Fail";
        status.classList.remove("text-warning", "text-success");
        status.classList.add("text-danger");
        btnRetry.classList.remove("d-none");
      }
    }
  }
});

const updateUIByRowProcessing = () => {
  if (rowProcessing == 0) {
    playStarring = false;
    blockAllBtnRetry(false);
    if (repoFails.length > 0) {
      retryAllBtn.disabled = false;
      retryAllBtn.classList.remove("d-none");
    } else {
      playRetrying = false;
      retryAllBtn.disabled = true;
    }
    statusEl.textContent = "✅ Auto star completed.";
    console.log("✅ Auto star completed.");
    setStatePlayStarring(false);
  }
};

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
