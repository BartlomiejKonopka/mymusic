// main.js - obsługuje wszystkie strony

// Wspólne funkcje z utils.js
// ...

// Funkcja inicjalizacji - czeka aż reviews będą wczytane
function initPage() {
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    bindSearch(searchInput);
    initAutocomplete(searchInput);
  }

  // Przycisk "Wszystkie" na index.html
  const allBtn = document.getElementById("allBtn");
  if (allBtn) {
    allBtn.onclick = () => location.href = "all.html";
  }

  // Przycisk "Powrót" na all.html/review.html
  const backBtn = document.getElementById("backBtn");
  if (backBtn) {
    backBtn.onclick = () => location.href = "index.html";
  }

  // Logika dla index.html
  if (document.getElementById("feed")) {
    // Wyświetl wszystkie recenzje (posortowane malejąco po ID - najnowsze na górze)
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

  // Logika dla all.html
  if (document.getElementById("grid")) {
    const grid = document.getElementById("grid");
    // Sortuj malejąco po id (najnowsze najpierw) i pokaż pierwsze 30
    reviews.sort((a, b) => b.id - a.id).slice(0, 30).forEach(r => {
      const d = document.createElement("div");
      d.className = "cover";
      d.innerHTML = `
        <img src="${r.cover}" loading="lazy" alt="${escapeHtml(r.album)}">
        <div class="overlay">
          ${r.artist}<br>${r.album}
        </div>
      `;
      d.addEventListener("click", () => {
        location.href = `review.html?id=${r.id}`;
      });
      grid.appendChild(d);
    });
  }

  // Logika dla review.html
  if (document.getElementById("review")) {
    const id = new URLSearchParams(location.search).get("id");
    const r = getReviewById(id);
    if (r) renderReview(r);
  }

  // Logika dla search.html
  if (document.getElementById("results")) {
    const q = new URLSearchParams(location.search).get("q") || "";
    const searchInput = document.getElementById("searchInput");
    if (searchInput) searchInput.value = q;
    const results = searchReviews(q);
    const box = document.getElementById("results");
    results.forEach(r => {
      const d = document.createElement("div");
      d.className = "cover";
      d.innerHTML = `
        <img src="${r.cover}" loading="lazy" alt="${escapeHtml(r.album)}">
        <div class="overlay">${r.artist}<br>${r.album}</div>
      `;
      d.onclick = () => location.href = `review.html?id=${r.id}`;
      box.appendChild(d);
    });
  }
}

// Czeka aż strona się załaduje a potem wczytuje reviews i inicjalizuje stronę
window.addEventListener("DOMContentLoaded", () => {
  loadReviews()
    .then(() => initPage())
    .catch(err => {
      // Jeśli wczytywanie danych się nie powiodło, nadal próbuj uruchomić initPage
      console.error('Nie udało się wczytać recenzji:', err);
      initPage();
    });
});
