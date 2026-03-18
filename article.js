const params = new URLSearchParams(location.search);
const articleId = params.get("id") || articleData[0].id;
let currentTheme = localStorage.getItem("ramsesTheme") || "light";
const article = articleData.find((a) => a.id === articleId) || articleData[0];
let activeCategories = siteDefaults.categories;

function articleLink(id) {
  return `article.html?id=${encodeURIComponent(id)}`;
}

function getVisitorId() {
  let id = localStorage.getItem("ramsesVisitorId");
  if (!id) {
    id = crypto.randomUUID?.() || String(Date.now() + Math.random());
    localStorage.setItem("ramsesVisitorId", id);
  }
  return id;
}

function getCategoryMeta(key) {
  return activeCategories.find((item) => item.id === key || item.slug === key) || null;
}

function getCategoryLabel(item) {
  return getCategoryMeta(item.category)?.label || item.ar.categoryLabel || "عام";
}

function applyTheme() {
  document.documentElement.setAttribute("data-theme", currentTheme);
  const btn = document.getElementById("themeToggle");
  if (btn) btn.textContent = currentTheme === "dark" ? "☾" : "☀";
}

async function trackArticleView() {
  const sessionKey = `ramsesTrackedArticle_${article.id}`;
  if (sessionStorage.getItem(sessionKey)) return;
  sessionStorage.setItem(sessionKey, "1");
  await RamsesDB.trackPageView({
    page_type: "article",
    page_id: article.id,
    page_title: article.ar.title,
    referrer: document.referrer || "direct",
    visitor_id: getVisitorId()
  });
}

async function getArticleViewCount() {
  const items = await RamsesDB.getPageViews();
  return items.filter((item) => item.page_type === "article" && item.page_id === article.id).length;
}

async function renderArticle() {
  const t = article.ar;
  document.title = `رمسيس | ${t.title}`;
  document.getElementById("articlePublishDate").textContent = article.date;
  document.getElementById("articleViewsCount").textContent = (await getArticleViewCount()).toLocaleString("ar-EG");
  document.getElementById("articleSub").textContent = getCategoryLabel(article);

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

async function init() {
  activeCategories = await RamsesDB.getSections(siteDefaults.categories);
  applyTheme();
  await trackArticleView();
  await renderArticle();

  document.getElementById("themeToggle").addEventListener("click", () => {
    currentTheme = currentTheme === "dark" ? "light" : "dark";
    localStorage.setItem("ramsesTheme", currentTheme);
    applyTheme();
  });
}

init();
