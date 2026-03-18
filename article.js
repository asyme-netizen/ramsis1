
const params = new URLSearchParams(location.search);
const articleId = params.get("id") || articleData[0].id;
let currentTheme = localStorage.getItem("ramsesTheme") || "light";
const article = articleData.find((a) => a.id === articleId) || articleData[0];

function articleLink(id) {
  return `article.html?id=${encodeURIComponent(id)}`;
}

function readLocal(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

function writeLocal(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getCategoryMeta(key) {
  const saved = JSON.parse(localStorage.getItem("ramsesSiteData") || "{}");
  const categories = Array.isArray(saved.categories) && saved.categories.length ? saved.categories : siteDefaults.categories;
  return categories.find((item) => item.id === key || item.slug === key) || null;
}

function getCategoryLabel(item) {
  return getCategoryMeta(item.category)?.label || item.ar.categoryLabel || "عام";
}

async function trackArticleView() {
  const sessionKey = `ramsesTrackedArticle_${article.id}`;
  if (sessionStorage.getItem(sessionKey)) return;
  sessionStorage.setItem(sessionKey, "1");
  const items = readLocal("ramsesPageViews", []);
  items.push({
    id: crypto.randomUUID?.() || String(Date.now() + Math.random()),
    page_type: "article",
    page_id: article.id,
    page_title: article.ar.title,
    referrer: document.referrer || "direct",
    created_at: new Date().toISOString()
  });
  writeLocal("ramsesPageViews", items);
}

function getArticleViewCount() {
  const items = readLocal("ramsesPageViews", []);
  return items.filter((item) => item.page_type === "article" && item.page_id === article.id).length;
}

function applyTheme() {
  document.documentElement.setAttribute("data-theme", currentTheme);
  const btn = document.getElementById("themeToggle");
  if (btn) btn.textContent = currentTheme === "dark" ? "☾" : "☀";
}

function renderArticle() {
  const t = article.ar;
  document.documentElement.lang = "ar";
  document.documentElement.dir = "rtl";
  document.getElementById("backHomeBtn").textContent = "العودة للرئيسية";
  document.getElementById("relatedTitle").textContent = "مقالات ذات صلة";
  document.title = `رمسيس | ${t.title}`;
  document.getElementById("articlePublishDate").textContent = article.date;
  document.getElementById("articleViewsCount").textContent = getArticleViewCount().toLocaleString("ar-EG");

  document.getElementById("articleHero").innerHTML = `
    <div class="container article-hero-wrap">
      <div class="article-hero-media"><img src="${article.cover}" alt="${t.title}"></div>
      <div class="article-hero-card">
        <span class="eyebrow">${getCategoryLabel(article)}</span>
        <h1>${t.title}</h1>
        <p>${t.excerpt}</p>
        <div class="article-meta-row">
          <span>${article.author}</span>
          <span>•</span>
          <span>${article.date}</span>
          <span>•</span>
          <span>${article.readTime} دقائق</span>
        </div>
      </div>
    </div>`;

  document.getElementById("articleBody").innerHTML = t.content.map((p) => `<p>${p}</p>`).join("") + `
    <blockquote>رمسيس يقدّم المقالات بطريقة تحافظ على فخامة الشكل وسهولة القراءة.</blockquote>`;

  const related = articleData.filter((a) => a.id !== article.id && a.category === article.category).slice(0, 3);
  document.getElementById("relatedList").innerHTML = related.map((a) => `
    <a class="related-item" href="${articleLink(a.id)}">
      <img src="${a.cover}" alt="${a.ar.title}">
      <div>
        <strong>${a.ar.title}</strong>
        <p>${a.ar.excerpt}</p>
      </div>
    </a>`).join("");
}

applyTheme();
trackArticleView().then(renderArticle);

document.getElementById("themeToggle").addEventListener("click", () => {
  currentTheme = currentTheme === "dark" ? "light" : "dark";
  localStorage.setItem("ramsesTheme", currentTheme);
  applyTheme();
});
