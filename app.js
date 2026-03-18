
const siteData = (() => {
  const saved = JSON.parse(localStorage.getItem("ramsesSiteData") || "{}");
  return { ...siteDefaults, ...saved };
})();

let currentTheme = localStorage.getItem("ramsesTheme") || "light";

function articleLink(id) {
  return `article.html?id=${encodeURIComponent(id)}`;
}

function createLocalStore() {
  const read = (key, fallback) => {
    try {
      return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
    } catch {
      return fallback;
    }
  };

  const write = (key, value) => localStorage.setItem(key, JSON.stringify(value));

  const api = {
    async trackPageView(payload) {
      const items = read("ramsesPageViews", []);
      items.push({ ...payload, id: crypto.randomUUID?.() || String(Date.now() + Math.random()), created_at: new Date().toISOString() });
      write("ramsesPageViews", items);
      return true;
    },
    async addSubscriber(email, source = "newsletter") {
      const items = read("ramsesSubscribers", []);
      const exists = items.some((item) => item.email.toLowerCase() === email.toLowerCase());
      if (!exists) {
        items.unshift({ id: crypto.randomUUID?.() || String(Date.now() + Math.random()), email, source, created_at: new Date().toISOString() });
        write("ramsesSubscribers", items);
      }
      return !exists;
    },
    async addMessage(payload) {
      const items = read("ramsesMessages", []);
      items.unshift({ ...payload, id: crypto.randomUUID?.() || String(Date.now() + Math.random()), created_at: new Date().toISOString() });
      write("ramsesMessages", items);
      return true;
    }
  };

  return api;
}

const store = createLocalStore();

function getCategoryDefinitions() {
  const categories = Array.isArray(siteData.categories) && siteData.categories.length ? siteData.categories : siteDefaults.categories;
  return categories.filter((item) => item && item.visible !== false);
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
  }, { threshold: 0.15 });
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
  const content = hero.ar;
  document.getElementById("heroArticle").innerHTML = `
    <span class="eyebrow">${hero.displayCategory}</span>
    <h1>${hero.displayTitle}</h1>
    <p>${hero.displayExcerpt}</p>
    <div class="hero-meta">${getCategoryLabel(hero)} • ${hero.readTime} دقائق • ${hero.date}</div>
    <a href="${articleLink(hero.id)}" class="hero-link">اقرأ المقال</a>
  `;
  const sideArticles = articleData.filter((a) => a.id !== hero.id).slice(0, 3);
  document.getElementById("heroSide").innerHTML = sideArticles.map((a) => `
    <a class="hero-side-card glass-panel" href="${articleLink(a.id)}">
      <span>${getCategoryLabel(a)}</span>
      <h3>${a.ar.title}</h3>
      <p>${a.ar.excerpt}</p>
    </a>
  `).join("");
}

function renderTicker() {
  const titles = [...articleData, ...articleData].map((a) => `${a.ar.title}`).join("  •  ");
  document.getElementById("tickerTrack").textContent = titles;
}

function renderLatest(filtered = articleData) {
  const grid = document.getElementById("latestGrid");
  grid.innerHTML = filtered.map((a) => `
    <article class="story-card glass-panel reveal visible">
      <img src="${a.cover}" alt="${a.ar.title}" class="story-cover" />
      <span class="story-tag">${getCategoryLabel(a)}</span>
      <h3>${a.ar.title}</h3>
      <p>${a.ar.excerpt}</p>
      <div class="story-meta">${a.author} • ${a.readTime} دقائق</div>
      <a href="${articleLink(a.id)}" class="story-link">اقرأ المزيد</a>
    </article>
  `).join("") || `<div class="empty-state">لا توجد نتائج مطابقة.</div>`;
}

function renderSections() {
  const categories = getCategoryDefinitions();
  document.getElementById("sectionsDesc").textContent = "يمكنك تعديل الأقسام كاملة من لوحة التحكم: إضافة، حذف، ترتيب، وتعديل الوصف.";
  document.getElementById("newsSections").innerHTML = categories.map((cat) => {
    const items = articleData.filter((a) => a.category === (cat.slug || cat.id)).slice(0, 2);
    return `
      <div class="news-section-card glass-panel">
        <div class="news-section-head">
          <div>
            <h3>${cat.label}</h3>
            <p class="section-card-desc">${cat.description || "قسم تحريري قابل للتعديل من لوحة التحكم."}</p>
          </div>
          <span>${items.length} مقال</span>
        </div>
        <div class="news-section-links">
          ${items.length ? items.map((item) => `
            <a href="${articleLink(item.id)}" class="news-link-item">
              <strong>${item.ar.title}</strong>
              <p>${item.ar.excerpt}</p>
            </a>
          `).join("") : `<div class="news-link-item empty-link-item"><strong>لا توجد مقالات في هذا القسم الآن</strong><p>يمكنك إضافة محتواه أو تعديل اسمه ووصفه من لوحة التحكم.</p></div>`}
        </div>
      </div>
    `;
  }).join("");
}

function renderSocialLinks() {
  const row = document.getElementById("socialRow");
  if (!row) return;
  const lines = (siteData.socialLinks || siteDefaults.socialLinks).split("\n").map((x) => x.trim()).filter(Boolean);
  row.innerHTML = lines.map((line) => `<a href="#" class="social-link">${line}</a>`).join("");
}

function bindSearch(input) {
  if (!input) return;
  input.addEventListener("input", (e) => {
    const q = e.target.value.trim().toLowerCase();
    const filtered = articleData.filter((a) => {
      const hay = [a.ar.title, a.ar.excerpt, getCategoryLabel(a), a.author].join(" ").toLowerCase();
      return hay.includes(q);
    });
    renderLatest(filtered);
  });
}

async function trackHomepageView() {
  const sessionKey = "ramsesTrackedHomeView";
  if (sessionStorage.getItem(sessionKey)) return;
  sessionStorage.setItem(sessionKey, "1");
  await store.trackPageView({
    page_type: "home",
    page_id: "home",
    page_title: "الصفحة الرئيسية",
    referrer: document.referrer || "direct"
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
    const isNew = await store.addSubscriber(email, "newsletter_form");
    input.value = "";
    const msg = isNew ? "تم تسجيل بريدك بنجاح داخل قائمة النشرة." : "هذا البريد مسجل بالفعل في النشرة.";
    alert(msg);
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
      message: document.getElementById("contactMessage").value.trim(),
      source: "contact_form"
    };
    if (!payload.name || !payload.email || !payload.subject || !payload.message) {
      setStatus("contactStatus", "من فضلك أكمل كل الحقول أولًا.", false);
      return;
    }
    await store.addMessage(payload);
    form.reset();
    setStatus("contactStatus", "تم إرسال رسالتك وستظهر داخل لوحة التحكم.", true);
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