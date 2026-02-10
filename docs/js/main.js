// main.js

function initPage() {
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    bindSearch(searchInput);
    initAutocomplete(searchInput);
  }

  const allBtn = document.getElementById("allBtn");
  if (allBtn) allBtn.onclick = () => location.href = "all.html";

  const backBtn = document.getElementById("backBtn");
  if (backBtn) backBtn.onclick = () => location.href = "index.html";

  // index.html
  const feed = document.getElementById("feed");
  if (feed) {
    reviews.sort((a, b) => b.id - a.id).forEach(r => {
      const article = document.createElement("article");
      article.className = "post";
      article.innerHTML = `
        <h2>${r.artist}</h2>
        <h3>${r.album}</h3>
        <p>${r.releaseDate}</p>
        <img src="${r.cover}" loading="lazy" alt="${escapeHtml(r.album)}">
        ${reviewToHtml(r.review)}
      `;
      feed.appendChild(article);
    });
  }

  // all.html
  const grid = document.getElementById("grid");
  if (grid) {
    reviews.sort((a, b) => b.id - a.id).slice(0, 30).forEach(r => {
      grid.appendChild(createCoverCard(r));
    });
  }

  // review.html
  if (document.getElementById("review")) {
    const id = new URLSearchParams(location.search).get("id");
    const r = getReviewById(id);
    if (r) renderReview(r);
  }

  // search.html
  const results = document.getElementById("results");
  if (results) {
    const q = new URLSearchParams(location.search).get("q") || "";
    if (searchInput) searchInput.value = q;
    searchReviews(q).forEach(r => {
      results.appendChild(createCoverCard(r));
    });
  }
}

window.addEventListener("DOMContentLoaded", () => {
  loadReviews()
    .then(initPage)
    .catch(err => {
      console.error('Nie udało się wczytać recenzji:', err);
      initPage();
    });
});
