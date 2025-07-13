const submitBtn = document.getElementById("submit");
const starAllBtn = document.getElementById("starAll");
const repoList = document.getElementById("repoList");
const statusEl = document.getElementById("status");

submitBtn.onclick = async () => {
  repoList.innerHTML = "";
  statusEl.textContent = "Fetching repos...";

  const token = document.getElementById("token").value;
  const keyword = document.getElementById("keyword").value;
  const count = parseInt(document.getElementById("count").value, 10);

  const res = await fetch(
    `https://api.github.com/search/repositories?q=${keyword}&per_page=${count}`
  );
  const data = await res.json();

  (data.items || []).forEach((repo, index) => {
    const li = document.createElement("li");
    li.innerHTML = `<input type='checkbox' checked data-name='${
      repo.full_name
    }' /> ${index + 1}. <a href='${repo.html_url}' target='_blank'>${
      repo.full_name
    }</a>`;
    repoList.appendChild(li);
  });
  statusEl.textContent = "Repo list ready.";
};

starAllBtn.onclick = async () => {
  const token = document.getElementById("token").value;
  const cookie = document.getElementById("cookie").value;
  const listItems = document.querySelectorAll("#repoList li");

  for (let i = 0; i < listItems.length; i++) {
    const li = listItems[i];
    const checkbox = li.querySelector('input[type="checkbox"]');
    if (!checkbox.checked) continue;

    const repoName = checkbox.dataset.name;
    statusEl.textContent = `Starring ${repoName}...`;

    try {
      const tokenRes = await fetch(`https://github.com/${repoName}`, {
        headers: { Cookie: cookie },
      });
      const html = await tokenRes.text();
      const match = html.match(/name=\"authenticity_token\" value=\"(.*?)\"/);
      const token = match ? match[1] : null;
      if (!token) throw new Error("authenticity_token not found");

      await new Promise((resolve) => setTimeout(resolve, 20000)); // 20s delay

      const starRes = await fetch(`https://github.com/${repoName}/star`, {
        method: "POST",
        headers: {
          "x-requested-with": "XMLHttpRequest",
          "Content-Type": "application/x-www-form-urlencoded",
          Cookie: cookie,
        },
        body: `authenticity_token=${encodeURIComponent(token)}`,
      });

      if (starRes.ok) {
        li.classList.add("success");
      } else {
        li.classList.add("error");
      }
    } catch (err) {
      li.classList.add("error");
    }
  }
  statusEl.textContent = "Auto star completed.";
};
