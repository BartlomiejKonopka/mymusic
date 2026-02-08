const state = {
  reviews: [],
  reviewsSha: "",
  nextId: 1
};

const el = {
  owner: document.getElementById("owner"),
  repo: document.getElementById("repo"),
  branch: document.getElementById("branch"),
  reviewsPath: document.getElementById("reviewsPath"),
  coversPath: document.getElementById("coversPath"),
  coverUrlPrefix: document.getElementById("coverUrlPrefix"),
  token: document.getElementById("token"),
  loadBtn: document.getElementById("loadBtn"),
  nextId: document.getElementById("nextId"),
  artist: document.getElementById("artist"),
  album: document.getElementById("album"),
  releaseDate: document.getElementById("releaseDate"),
  coverFile: document.getElementById("coverFile"),
  coverPreview: document.getElementById("coverPreview"),
  review: document.getElementById("review"),
  preview: document.getElementById("preview"),
  status: document.getElementById("status"),
  form: document.getElementById("reviewForm")
};

function setStatus(message, isError = false) {
  el.status.textContent = message;
  el.status.style.color = isError ? "#ffb3aa" : "#9aa3ad";
}

function encodePath(path) {
  return path
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");
}

function githubHeaders(token) {
  const headers = {
    Accept: "application/vnd.github+json"
  };

  if (token) {
    headers.Authorization = `token ${token}`;
  }

  return headers;
}

async function fetchReviews() {
  const owner = el.owner.value.trim();
  const repo = el.repo.value.trim();
  const branch = el.branch.value.trim();
  const path = el.reviewsPath.value.trim();
  const token = el.token.value.trim();

  if (!owner || !repo || !path) {
    throw new Error("Owner, repo, and reviews path are required.");
  }

  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodePath(path)}?ref=${encodeURIComponent(branch)}`;
  const res = await fetch(url, { headers: githubHeaders(token) });
  if (!res.ok) {
    throw new Error(`Failed to load reviews: ${res.status}`);
  }

  const data = await res.json();
  const json = base64ToString(data.content);
  const reviews = JSON.parse(json);

  state.reviews = reviews;
  state.reviewsSha = data.sha;
  state.nextId = Math.max(0, ...reviews.map(r => Number(r.id) || 0)) + 1;

  el.nextId.textContent = String(state.nextId);
  updateCoverPreview();
}

function base64ToString(base64) {
  const binary = atob(base64.replace(/\n/g, ""));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

function stringToBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  bytes.forEach(b => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function putContent({ owner, repo, path, branch, token, message, content, sha }) {
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodePath(path)}`;
  const body = {
    message,
    content,
    branch
  };

  if (sha) {
    body.sha = sha;
  }

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      ...githubHeaders(token),
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const msg = err.message ? `: ${err.message}` : "";
    throw new Error(`GitHub write failed (${res.status})${msg}`);
  }

  return res.json();
}

function buildCoverPaths(nextId, fileName) {
  const coversRepoPath = el.coversPath.value.trim();
  const coverUrlPrefix = el.coverUrlPrefix.value.trim();
  const ext = fileName && fileName.includes(".")
    ? fileName.split(".").pop().toLowerCase()
    : "jpg";

  const coverUrl = `${coverUrlPrefix}/${nextId}.${ext}`;
  const coverRepoPath = `${coversRepoPath}/${nextId}.${ext}`;

  return { coverUrl, coverRepoPath };
}

function updateCoverPreview() {
  if (!el.coverFile.files.length || !state.nextId) {
    el.coverPreview.value = "";
    return;
  }

  const { coverUrl } = buildCoverPaths(state.nextId, el.coverFile.files[0].name);
  el.coverPreview.value = coverUrl;
}

function updatePreview() {
  if (typeof reviewToHtml !== "function") {
    return;
  }
  el.preview.innerHTML = reviewToHtml(el.review.value);
}

el.loadBtn.addEventListener("click", async () => {
  try {
    setStatus("Loading reviews...");
    await fetchReviews();
    setStatus(`Loaded ${state.reviews.length} reviews.`);
  } catch (err) {
    setStatus(err.message, true);
  }
});

el.coverFile.addEventListener("change", updateCoverPreview);
el.review.addEventListener("input", updatePreview);

el.form.addEventListener("submit", async e => {
  e.preventDefault();

  const owner = el.owner.value.trim();
  const repo = el.repo.value.trim();
  const branch = el.branch.value.trim();
  const reviewsPath = el.reviewsPath.value.trim();
  const token = el.token.value.trim();

  if (!owner || !repo || !token) {
    setStatus("Owner, repo, and token are required.", true);
    return;
  }

  if (!el.coverFile.files.length) {
    setStatus("Cover file is required.", true);
    return;
  }

  try {
    if (!state.reviews.length) {
      setStatus("Loading reviews before commit...");
      await fetchReviews();
    }

    const file = el.coverFile.files[0];
    const { coverUrl, coverRepoPath } = buildCoverPaths(state.nextId, file.name);

    const reviewEntry = {
      id: state.nextId,
      artist: el.artist.value.trim(),
      album: el.album.value.trim(),
      releaseDate: el.releaseDate.value.trim(),
      cover: coverUrl,
      review: el.review.value.trim()
    };

    const updated = [...state.reviews, reviewEntry];
    const jsonContent = JSON.stringify(updated, null, 2) + "\n";

    setStatus("Uploading cover...");
    const buffer = await file.arrayBuffer();
    await putContent({
      owner,
      repo,
      path: coverRepoPath,
      branch,
      token,
      message: `Add cover for review ${state.nextId}`,
      content: arrayBufferToBase64(buffer)
    });

    setStatus("Updating reviews.json...");
    const writeResult = await putContent({
      owner,
      repo,
      path: reviewsPath,
      branch,
      token,
      message: `Add review ${state.nextId}: ${reviewEntry.artist} - ${reviewEntry.album}`,
      content: stringToBase64(jsonContent),
      sha: state.reviewsSha
    });

    state.reviews = updated;
    state.reviewsSha = writeResult.content.sha;
    state.nextId += 1;
    el.nextId.textContent = String(state.nextId);
    updateCoverPreview();
    setStatus("Commit created successfully.");
    el.form.reset();
    updatePreview();
  } catch (err) {
    setStatus(err.message || "Commit failed.", true);
  }
});
