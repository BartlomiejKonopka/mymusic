// ====== WCZYTYWANIE DANYCH ======

let reviews = [];

function loadReviews() {
  return fetch('js/reviews.json')
    .then(r => {
      if (!r.ok) throw new Error('Network response was not ok');
      return r.json();
    })
    .then(data => {
      reviews = data;
      return data;
    })
    .catch(err => {
      console.error('Błąd wczytywania reviews:', err);
      throw err;
    });
}

// ====== FUNKCJE WSPÓLNE ======

function getReviewById(id) {
  return reviews.find(r => r.id === Number(id));
}

function getNextReview(id) {
  const i = reviews.findIndex(r => r.id === id);
  return reviews[i + 1] || null;
}

function searchReviews(q, limit = 30) {
  q = q.toLowerCase();
  return reviews.filter(r =>
    r.artist.toLowerCase().includes(q) ||
    r.album.toLowerCase().includes(q)
  ).slice(0, limit);
}

function bindSearch(input) {
  input.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      location.href = `search.html?q=${encodeURIComponent(input.value)}`;
    }
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function markdownToHtml(md) {
  if (!md) return '';
  // Convert code blocks ```...```
  md = md.replace(/```([\s\S]*?)```/g, (m, code) => '<pre><code>' + escapeHtml(code) + '</code></pre>');
  // Inline code
  md = md.replace(/`([^`]+)`/g, '<code>$1</code>');
  // Headings
  md = md.replace(/^######\s*(.+)$/gm, '<h6>$1</h6>');
  md = md.replace(/^#####\s*(.+)$/gm, '<h5>$1</h5>');
  md = md.replace(/^####\s*(.+)$/gm, '<h4>$1</h4>');
  md = md.replace(/^###\s*(.+)$/gm, '<h3>$1</h3>');
  md = md.replace(/^##\s*(.+)$/gm, '<h2>$1</h2>');
  md = md.replace(/^#\s*(.+)$/gm, '<h1>$1</h1>');
  // Bold / italic
  md = md.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  md = md.replace(/__(.+?)__/g, '<strong>$1</strong>');
  md = md.replace(/\*(.+?)\*/g, '<em>$1</em>');
  md = md.replace(/_(.+?)_/g, '<em>$1</em>');
  // Links
  md = md.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  // Lists (unordered)
  md = md.replace(/^\s*[-*]\s+(.+)$/gm, '<li>$1</li>');
  // Ordered lists
  md = md.replace(/^\s*\d+\.\s+(.+)$/gm, '<li>$1</li>');

  // Wrap consecutive <li>...</li> into <ul> or <ol> depending on sequence
  // First wrap any groups of <li> into <ul>
  md = md.replace(/(<li>[\s\S]*?<\/li>)(?:\s*<li>[\s\S]*?<\/li>)*/g, (m) => {
    // Count how many <li> in m
    const items = m.match(/<li>[\s\S]*?<\/li>/g) || [];
    return '<ul>' + items.join('') + '</ul>';
  });

  // Paragraphs: split by double newlines
  const parts = md.split(/\n\s*\n/);
  const out = parts.map(part => {
    part = part.trim();
    if (!part) return '';
    // If starts with a block element, keep as-is
    if (/^<(h[1-6]|ul|ol|pre|blockquote|p|img|code)/i.test(part)) {
      return part;
    }
    return '<p>' + part.replace(/\n/g, '<br>') + '</p>';
  });

  return out.join('\n\n');
}

function isHtml(str) {
  return /<\/?[a-z][\s\S]*>/i.test(str);
}

function reviewToHtml(reviewContent) {
  if (!reviewContent) return '';
  if (isHtml(reviewContent.trim())) return reviewContent;
  return markdownToHtml(reviewContent);
}

function snippetFromReview(r, maxLen = 220) {
  const html = reviewToHtml(r.review);
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (text.length <= maxLen) return escapeHtml(text);
  return escapeHtml(text.slice(0, maxLen).trim()) + '…';
}

function renderReview(r) {
  document.getElementById("review").innerHTML = `
    <h2>${r.artist}</h2>
    <h3>${r.album}</h3>
    <p>${r.releaseDate}</p>
    <img src="${r.cover}" loading="lazy" alt="${escapeHtml(r.album)}">
    ${reviewToHtml(r.review)}
  `;
}

// ====== AUTOCOMPLETE Z PODŚWIETLENIEM ======

function initAutocomplete(input) {
  const container = document.getElementById("autocomplete");
  let activeIndex = -1;
  let currentItems = [];

  input.addEventListener("input", () => {
    const val = input.value.trim().toLowerCase();
    container.innerHTML = "";
    activeIndex = -1;

    if (!val) {
      container.style.display = "none";
      return;
    }

    const prefixMatches = [];
    const includesMatches = [];

    reviews.forEach(r => {
      const artist = r.artist.toLowerCase();
      const album = r.album.toLowerCase();

      if (artist.startsWith(val) || album.startsWith(val)) {
        prefixMatches.push(r);
      } else if (artist.includes(val) || album.includes(val)) {
        includesMatches.push(r);
      }
    });

    const matches = [...prefixMatches, ...includesMatches].slice(0, 10);
    currentItems = [];

    matches.forEach(r => {
      const item = document.createElement("div");
      item.className = "autocomplete-item";

      let artistHTML = r.artist;
      let albumHTML = r.album;

      if (r.artist.toLowerCase().startsWith(val)) {
        artistHTML =
          `<span class="highlight">${r.artist.slice(0, val.length)}</span>` +
          r.artist.slice(val.length);
      }

      if (r.album.toLowerCase().startsWith(val)) {
        albumHTML =
          `<span class="highlight">${r.album.slice(0, val.length)}</span>` +
          r.album.slice(val.length);
      }

      item.innerHTML = `${artistHTML} – ${albumHTML}`;

      item.addEventListener("click", () => {
        location.href = `review.html?id=${r.id}`;
      });

      container.appendChild(item);
      currentItems.push(item);
    });

    container.style.display = matches.length ? "flex" : "none";
  });

  input.addEventListener("keydown", e => {
    if (!currentItems.length) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      activeIndex = (activeIndex + 1) % currentItems.length;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      activeIndex =
        (activeIndex - 1 + currentItems.length) % currentItems.length;
    }

    if (e.key === "Enter" && activeIndex >= 0) {
      e.preventDefault();
      currentItems[activeIndex].click();
      return;
    }

    currentItems.forEach((item, i) => {
      item.classList.toggle("active", i === activeIndex);
    });
  });

  document.addEventListener("click", e => {
    if (!container.contains(e.target) && e.target !== input) {
      container.style.display = "none";
    }
  });
}
