let siteData = (() => {
  const saved = RamsesDB.safeRead("ramsesSiteData", {});
  return { ...siteDefaults, ...saved };
})();

let currentTheme = localStorage.getItem("ramsesTheme") || "light";
let activeCategories = Array.isArray(siteData.categories) ? siteData.categories : siteDefaults.categories;

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

function getCategoryDefinitions() {
  return (activeCategories || siteDefaults.categories).filter((item) => item && item.visible !== false);
}

function getCategoryMeta(key) {
  return getCategoryDefinitions().find((item) => item.id === key || item.slug === key) || null;
}

function getCategoryLabel(article) {
  return getCategoryMeta(article.category)?.label || article.ar.categoryLabel || "عام";
}

function applyTheme() {
  document.documentElement.setAttribute("data-theme", currentTheme);
  document.documentElement.style.setProperty("--gold", siteData.primaryColor);
  document.documentElement.style.setProperty("--bg", siteData.darkColor);
  document.documentElement.style.setProperty("--surface", siteData.surfaceColor);
  const btn = document.getElementById("themeToggle");
  if (btn) btn.textContent = currentTheme === "dark" ? "☾" : "☀";
}

function revealOnScroll() {
  const items = document.querySelectorAll(".reveal");
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add("visible");
    });
  }, { threshold: 0.12 });
  items.forEach((item) => observer.observe(item));
}

function getHeroArticle() {
  const hero = articleData.find((a) => a.featured) || articleData[0];
  const content = hero.ar;
  return {
    ...hero,
    displayCategory: siteData.heroCategory || "ملف اليوم",
    displayTitle: siteData.heroTitle || content.title,
    displayExcerpt: siteData.heroDesc || content.excerpt,
    displayCover: siteData.heroImage || hero.cover
  };
}

function renderHero() {
  const hero = getHeroArticle();
  const el = document.getElementById("heroArticle");
  el.innerHTML = `
    <img src="${hero.displayCover}" alt="${hero.displayTitle}" class="hero-image" />
    <div class="hero-overlay"></div>
    <div class="hero-content">
      <span class="eyebrow">${hero.displayCategory}</span>
      <h1>${hero.displayTitle}</h1>
      <p>${hero.displayExcerpt}</p>
      <div class="hero-meta">${getCategoryLabel(hero)} • ${hero.readTime} دقائق • ${hero.date}</div>
      <a href="${articleLink(hero.id)}" class="hero-read-btn">اقرأ المقال</a>
    </div>
  `;

  const sideArticles = articleData.filter((a) => a.id !== hero.id).slice(0, 3);
  document.getElementById("heroSide").innerHTML = sideArticles.map((a) => `
    <a class="mini-card glass-panel" href="${articleLink(a.id)}">
      <div>
        <span class="card-tag">${getCategoryLabel(a)}</span>
        <h3>${a.ar.title}</h3>
      </div>
      <div class="mini-arrow">↖</div>
    </a>
  `).join("");
}

function renderTicker() {
  const titles = [...articleData, ...articleData].map((a) => a.ar.title).join(" • ");
  document.getElementById("tickerTrack").textContent = titles;
}

function renderLatest(filtered = articleData) {
  const grid = document.getElementById("latestGrid");
  grid.innerHTML = filtered.map((a) => `
    <article class="article-card reveal visible">
      <img src="${a.cover}" alt="${a.ar.title}" />
      <div class="card-body">
        <span class="card-tag">${getCategoryLabel(a)}</span>
        <h3>${a.ar.title}</h3>
        <p>${a.ar.excerpt}</p>
        <div class="card-meta">${a.author} • ${a.readTime} دقائق</div>
        <a href="${articleLink(a.id)}" class="read-link">اقرأ المزيد</a>
      </div>
    </article>
  `).join("") || `<div class="empty-state">لا توجد نتائج مطابقة.</div>`;
}

function renderSections() {
  const categories = getCategoryDefinitions();
  document.getElementById("newsSections").innerHTML = categories.map((cat) => {
    const items = articleData.filter((a) => a.category === (cat.slug || cat.id)).slice(0, 2);
    return `
      <div class="news-section-card">
        <div class="news-section-head">
          <div>
            <h3>${cat.label}</h3>
            <span>${cat.description || "قسم قابل للتعديل من لوحة التحكم"}</span>
          </div>
          <span>${items.length} مقال</span>
        </div>
        ${items.length ? items.map((item) => `
          <a class="news-item" href="${articleLink(item.id)}">
            <img src="${item.cover}" alt="${item.ar.title}" />
            <div>
              <strong>${item.ar.title}</strong>
              <p>${item.ar.excerpt}</p>
            </div>
          </a>
        `).join("") : `<div class="news-item"><div><strong>لا توجد مقالات في هذا القسم الآن</strong><p>يمكنك إضافة محتوى لهذا القسم لاحقًا.</p></div></div>`}
      </div>
    `;
  }).join("");
}

function renderSocialLinks() {
  const row = document.getElementById("socialRow");
  const lines = (siteData.socialLinks || siteDefaults.socialLinks).split("\n").map((x) => x.trim()).filter(Boolean);
  row.innerHTML = lines.map((line) => `<a href="#" class="social-link">${line}</a>`).join("");
}

function bindSearch(input) {
  if (!input) return;
  input.addEventListener("input", (e) => {
    const q = e.target.value.trim().toLowerCase();
    const filtered = articleData.filter((a) => [a.ar.title, a.ar.excerpt, getCategoryLabel(a), a.author].join(" ").toLowerCase().includes(q));
    renderLatest(filtered);
  });
}

async function trackHomepageView() {
  const sessionKey = "ramsesTrackedHomeView";
  if (sessionStorage.getItem(sessionKey)) return;
  sessionStorage.setItem(sessionKey, "1");
  await RamsesDB.trackPageView({
    page_type: "home",
    page_id: "home",
    page_title: "الصفحة الرئيسية",
    referrer: document.referrer || "direct",
    visitor_id: getVisitorId()
  });
}

function setStatus(id, text, ok = true) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  el.className = `form-status ${ok ? "success" : "error"}`;
}

function bindNewsletter() {
  const form = document.getElementById("newsletterForm");
  if (!form) return;
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const input = document.getElementById("newsletterInput");
    const email = input.value.trim();
    if (!email) return;
    const isNew = await RamsesDB.addSubscriber(email, "newsletter_form");
    input.value = "";
    document.getElementById("newsletterNote").textContent = isNew ? "تم تسجيل بريدك الإلكتروني بنجاح." : "هذا البريد مسجل بالفعل.";
  });
}

function bindContactForm() {
  const form = document.getElementById("contactForm");
  if (!form) return;
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const payload = {
      name: document.getElementById("contactName").value.trim(),
      email: document.getElementById("contactEmail").value.trim(),
      subject: document.getElementById("contactSubject").value.trim(),
      message: document.getElementById("contactMessage").value.trim()
    };
    if (!payload.name || !payload.email || !payload.subject || !payload.message) {
      setStatus("contactStatus", "من فضلك أكمل كل الحقول أولًا.", false);
      return;
    }
    await RamsesDB.addMessage(payload);
    form.reset();
    setStatus("contactStatus", "تم إرسال رسالتك بنجاح وستظهر في لوحة التحكم.", true);
  });
}

function injectSiteContent() {
  document.getElementById("brandName").textContent = siteData.siteName;
  document.getElementById("brandTag").textContent = siteData.siteTag;
  document.getElementById("aboutTitle").textContent = siteData.aboutTitle;
  document.getElementById("aboutText").textContent = siteData.aboutText;
  document.getElementById("newsletterTitle").textContent = siteData.newsletterTitle;
  document.getElementById("newsletterText").textContent = siteData.newsletterText;
  document.getElementById("footerText").textContent = `${siteData.siteName} — منصة عربية حديثة للتاريخ والتكنولوجيا والذكاء الاصطناعي والبزنس والطب والتحقيقات`;
}

async function init() {
  try {
    activeCategories = await RamsesDB.getSections(siteDefaults.categories);
    siteData.categories = activeCategories;
  } catch (error) {
    console.warn(error);
  }

  applyTheme();
  injectSiteContent();
  renderHero();
  renderTicker();
  renderLatest();
  renderSections();
  renderSocialLinks();
  revealOnScroll();
  bindSearch(document.getElementById("topSearchInput"));
  bindSearch(document.getElementById("searchInputMobile"));
  bindNewsletter();
  bindContactForm();
  trackHomepageView();

  document.getElementById("themeToggle").addEventListener("click", () => {
    currentTheme = currentTheme === "dark" ? "light" : "dark";
    localStorage.setItem("ramsesTheme", currentTheme);
    applyTheme();
  });
}

init();
