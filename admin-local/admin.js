const state = {
  nextId: 1,
  count: 0
};

const el = {
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

async function fetchNext() {
  const res = await fetch("/api/next");
  if (!res.ok) {
    throw new Error(`Failed to load reviews: ${res.status}`);
  }
  const data = await res.json();
  state.nextId = data.nextId;
  state.count = data.count;
  el.nextId.textContent = String(state.nextId);
  updateCoverPreview();
}

function updateCoverPreview() {
  if (!el.coverFile.files.length || !state.nextId) {
    el.coverPreview.value = "";
    return;
  }

  el.coverPreview.value = buildCoverUrl(state.nextId, el.coverFile.files[0].name);
}

function buildCoverUrl(nextId, fileName) {
  const ext = fileName && fileName.includes(".")
    ? fileName.split(".").pop().toLowerCase()
    : "jpg";
  return `covers/${nextId}.${ext}`;
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
    await fetchNext();
    setStatus(`Loaded ${state.count} reviews.`);
  } catch (err) {
    setStatus(err.message, true);
  }
});

el.coverFile.addEventListener("change", updateCoverPreview);
el.review.addEventListener("input", updatePreview);

el.form.addEventListener("submit", async e => {
  e.preventDefault();

  if (!el.coverFile.files.length) {
    setStatus("Cover file is required.", true);
    return;
  }

  try {
    const file = el.coverFile.files[0];
    const payload = new FormData();
    payload.append("artist", el.artist.value.trim());
    payload.append("album", el.album.value.trim());
    payload.append("releaseDate", el.releaseDate.value.trim());
    payload.append("review", el.review.value.trim());
    payload.append("cover", file);

    setStatus("Saving review...");
    const res = await fetch("/api/reviews", {
      method: "POST",
      body: payload
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || "Save failed.");
    }

    state.nextId = (data.id || state.nextId) + 1;
    el.nextId.textContent = String(state.nextId);
    el.form.reset();
    updateCoverPreview();
    updatePreview();
    setStatus("Saved locally. Commit when ready.");
  } catch (err) {
    setStatus(err.message || "Save failed.", true);
  }
});

fetchNext().catch(err => {
  setStatus(err.message, true);
});
