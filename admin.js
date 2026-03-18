const defaultData = JSON.parse(JSON.stringify(siteDefaults));
const fields = {
  siteName: "siteName",
  siteTag: "siteTag",
  heroCategoryInput: "heroCategory",
  heroTitleInput: "heroTitle",
  heroDescInput: "heroDesc",
  heroImageInput: "heroImage",
  primaryColor: "primaryColor",
  darkColor: "darkColor",
  surfaceColor: "surfaceColor",
  aboutTitleInput: "aboutTitle",
  aboutTextInput: "aboutText",
  newsletterTitleInput: "newsletterTitle",
  newsletterTextInput: "newsletterText",
  socialLinksInput: "socialLinks"
};

const charts = {};
let managedCategories = [];

function readLocal(key, fallback) {
  return RamsesDB.safeRead(key, fallback);
}

function writeLocal(key, value) {
  return RamsesDB.safeWrite(key, value);
}

function getSiteData() {
  const saved = readLocal("ramsesSiteData", {});
  const merged = { ...defaultData, ...saved };
  merged.categories = managedCategories.length ? managedCategories : (saved.categories?.length ? saved.categories : defaultData.categories);
  return merged;
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" });
}

function escapeHtml(text = "") {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function slugifyArabicFriendly(text) {
  return String(text || "")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || `section-${Date.now()}`;
}

function getDateRangeFilter() {
  const value = document.getElementById("dateRange").value;
  if (value === "all") return null;
  const days = Number(value);
  const since = new Date();
  since.setDate(since.getDate() - days + 1);
  since.setHours(0, 0, 0, 0);
  return since;
}

function filterViews(allViews) {
  const since = getDateRangeFilter();
  return since ? allViews.filter((item) => new Date(item.created_at) >= since) : allViews;
}

function getCategoryMeta(key) {
  return managedCategories.find((item) => item.id === key || item.slug === key)
    || defaultData.categories.find((item) => item.id === key || item.slug === key)
    || null;
}

function getCategoryLabel(article) {
  return getCategoryMeta(article.category)?.label || article.ar.categoryLabel || "عام";
}

function getUniqueVisitors(views) {
  return new Set(views.map((item) => item.visitor_id || `${item.page_type}-${item.page_id}-${item.created_at}`)).size;
}

function getArticleStats(views) {
  const articlesOnly = views.filter((item) => item.page_type === "article");
  return articleData.map((article) => {
    const items = articlesOnly.filter((item) => item.page_id === article.id);
    return {
      id: article.id,
      title: article.ar.title,
      category: getCategoryLabel(article),
      views: items.length,
      lastView: items[items.length - 1]?.created_at || null
    };
  }).sort((a, b) => b.views - a.views);
}

function getCategoryStats(articleStats) {
  return managedCategories.map((cat) => {
    const articles = articleData.filter((item) => item.category === (cat.slug || cat.id));
    const totalViews = articleStats
      .filter((item) => item.category === cat.label)
      .reduce((sum, item) => sum + item.views, 0);

    return {
      label: cat.label,
      slug: cat.slug,
      articleCount: articles.length,
      totalViews,
      description: cat.description || ""
    };
  }).sort((a, b) => b.totalViews - a.totalViews);
}

function getDailySeries(views) {
  const map = new Map();
  views.forEach((item) => {
    const day = new Date(item.created_at).toISOString().slice(0, 10);
    map.set(day, (map.get(day) || 0) + 1);
  });
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

function upsertChart(name, type, config) {
  if (charts[name]) charts[name].destroy();
  charts[name] = new Chart(document.getElementById(name), { type, ...config });
}

function renderMetrics(views, articleStats, subscribers, messages) {
  const homeViews = views.filter((item) => item.page_type === "home").length;
  const articleViews = views.filter((item) => item.page_type === "article").length;
  const avg = articleData.length ? (articleViews / articleData.length).toFixed(1) : 0;

  document.getElementById("metricVisitors").textContent = getUniqueVisitors(views).toLocaleString("ar-EG");
  document.getElementById("metricHomepageViews").textContent = homeViews.toLocaleString("ar-EG");
  document.getElementById("metricArticleViews").textContent = articleViews.toLocaleString("ar-EG");
  document.getElementById("metricSubscribers").textContent = subscribers.length.toLocaleString("ar-EG");
  document.getElementById("metricMessages").textContent = messages.length.toLocaleString("ar-EG");
  document.getElementById("metricAvgPerArticle").textContent = String(avg);

  document.getElementById("metricVisitorsSub").textContent = "الزوار الفريدون خلال الفترة المحددة";
  document.getElementById("metricHomepageSub").textContent = "زيارات الصفحة الرئيسية";
  document.getElementById("metricArticleSub").textContent = `أعلى مقال: ${articleStats[0]?.title || "-"}`;
  document.getElementById("metricSubscribersSub").textContent = subscribers[0] ? `آخر اشتراك: ${subscribers[0].email}` : "لا يوجد اشتراكات بعد";
  document.getElementById("metricMessagesSub").textContent = messages[0] ? `آخر رسالة: ${messages[0].subject}` : "لا يوجد رسائل بعد";
  document.getElementById("metricAvgSub").textContent = `إجمالي المقالات: ${articleData.length}`;
}

function renderTrafficCharts(views, articleStats, categoryStats) {
  const series = getDailySeries(views);
  upsertChart("trafficChart", "line", {
    data: {
      labels: series.map(([day]) => day),
      datasets: [{ label: "الزيارات", data: series.map(([, value]) => value), tension: 0.35, fill: false, borderWidth: 3 }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
  });

  const homeViews = views.filter((item) => item.page_type === "home").length;
  const articleViews = views.filter((item) => item.page_type === "article").length;
  upsertChart("viewsSplitChart", "doughnut", {
    data: { labels: ["الرئيسية", "المقالات"], datasets: [{ data: [homeViews, articleViews], borderWidth: 1 }] },
    options: { responsive: true, maintainAspectRatio: false }
  });

  upsertChart("articlesBarChart", "bar", {
    data: { labels: articleStats.map((item) => item.title), datasets: [{ label: "المشاهدات", data: articleStats.map((item) => item.views), borderWidth: 1 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, indexAxis: "y" }
  });

  upsertChart("categoriesChart", "bar", {
    data: { labels: categoryStats.map((item) => item.label), datasets: [{ label: "مشاهدات الأقسام", data: categoryStats.map((item) => item.totalViews), borderWidth: 1 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
  });
}

function renderTopArticles(articleStats) {
  document.getElementById("topArticlesCount").textContent = `${articleStats.length} مقال`;
  document.getElementById("topArticlesBody").innerHTML = articleStats.slice(0, 6).map((item) => `
    <tr>
      <td>${escapeHtml(item.title)}</td>
      <td>${escapeHtml(item.category)}</td>
      <td>${item.views.toLocaleString("ar-EG")}</td>
      <td>${formatDate(item.lastView)}</td>
    </tr>
  `).join("") || `<tr><td colspan="4">لا توجد بيانات حتى الآن.</td></tr>`;

  const totalArticleViews = articleStats.reduce((sum, item) => sum + item.views, 0) || 1;
  document.getElementById("articlesSummary").textContent = `إجمالي مشاهدات المقالات: ${totalArticleViews.toLocaleString("ar-EG")}`;
  document.getElementById("articlesPerformanceBody").innerHTML = articleStats.map((item) => `
    <tr>
      <td>${escapeHtml(item.title)}</td>
      <td>${escapeHtml(item.category)}</td>
      <td>${item.views.toLocaleString("ar-EG")}</td>
      <td>${((item.views / totalArticleViews) * 100).toFixed(1)}%</td>
      <td>${formatDate(item.lastView)}</td>
    </tr>
  `).join("") || `<tr><td colspan="5">لا توجد بيانات حتى الآن.</td></tr>`;
}

function renderCategorySection(categoryStats) {
  document.getElementById("categoriesBody").innerHTML = categoryStats.map((item) => `
    <tr>
      <td>${escapeHtml(item.label)}</td>
      <td>${escapeHtml(item.slug)}</td>
      <td>${item.articleCount}</td>
      <td>${item.totalViews.toLocaleString("ar-EG")}</td>
      <td>${escapeHtml(item.description || "-")}</td>
    </tr>
  `).join("") || `<tr><td colspan="5">لا توجد أقسام بعد.</td></tr>`;
}

function renderSubscribers(subscribers) {
  document.getElementById("subscribersBody").innerHTML = subscribers.map((item, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${escapeHtml(item.email)}</td>
      <td>${escapeHtml(item.source || "newsletter")}</td>
      <td>${formatDate(item.created_at)}</td>
    </tr>
  `).join("") || `<tr><td colspan="4">لا يوجد مشتركون حتى الآن.</td></tr>`;
}

function renderMessages(messages) {
  document.getElementById("messagesList").innerHTML = messages.map((item) => `
    <article class="message-card glass-panel">
      <div class="message-top-row">
        <strong>${escapeHtml(item.subject || "رسالة بدون عنوان")}</strong>
        <span>${formatDate(item.created_at)}</span>
      </div>
      <div class="message-meta">${escapeHtml(item.name || "- ")} • ${escapeHtml(item.email || "-")}</div>
      <p>${escapeHtml(item.message || "")}</p>
    </article>
  `).join("") || `<div class="empty-state">لا توجد رسائل حتى الآن.</div>`;
}

function renderRecentActivity(subscribers, messages) {
  const items = [
    ...subscribers.slice(0, 5).map((item) => ({ type: "اشتراك جديد", title: item.email, date: item.created_at })),
    ...messages.slice(0, 5).map((item) => ({ type: "رسالة جديدة", title: item.subject || item.name || "رسالة", date: item.created_at }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  document.getElementById("recentActivityList").innerHTML = items.map((item) => `
    <div class="activity-item">
      <strong>${escapeHtml(item.type)}</strong>
      <p>${escapeHtml(item.title)}</p>
      <time>${formatDate(item.date)}</time>
    </div>
  `).join("") || `<div class="empty-state">لا توجد أنشطة حديثة حتى الآن.</div>`;
}

function renderCategoriesManager() {
  const tbody = document.getElementById("categoriesManagerBody");
  tbody.innerHTML = managedCategories.map((item, index) => `
    <tr>
      <td>${index + 1}</td>
      <td><input type="text" class="cat-input" data-index="${index}" data-field="label" value="${escapeHtml(item.label)}"></td>
      <td><input type="text" class="cat-input" data-index="${index}" data-field="slug" value="${escapeHtml(item.slug)}"></td>
      <td><textarea class="cat-input cat-textarea" data-index="${index}" data-field="description">${escapeHtml(item.description || "")}</textarea></td>
      <td><label class="switch-mini"><input type="checkbox" class="cat-toggle" data-index="${index}" ${item.visible !== false ? "checked" : ""}><span>ظاهر</span></label></td>
      <td>
        <div class="cat-actions">
          <button type="button" class="mini-btn" data-action="up" data-index="${index}">↑</button>
          <button type="button" class="mini-btn" data-action="down" data-index="${index}">↓</button>
          <button type="button" class="mini-btn danger-btn" data-action="delete" data-index="${index}">حذف</button>
        </div>
      </td>
    </tr>
  `).join("") || `<tr><td colspan="6">لا توجد أقسام معرفة حتى الآن.</td></tr>`;

  syncCategoryInputs();
}

function syncCategoryInputs() {
  document.querySelectorAll(".cat-input").forEach((input) => {
    input.oninput = () => {
      const index = Number(input.dataset.index);
      const field = input.dataset.field;
      managedCategories[index][field] = input.value.trim();
      if (field === "label" && !managedCategories[index].slug) managedCategories[index].slug = slugifyArabicFriendly(input.value.trim());
    };
  });

  document.querySelectorAll(".cat-toggle").forEach((input) => {
    input.onchange = () => {
      const index = Number(input.dataset.index);
      managedCategories[index].visible = input.checked;
    };
  });

  document.querySelectorAll("[data-action]").forEach((btn) => {
    btn.onclick = () => {
      const index = Number(btn.dataset.index);
      const action = btn.dataset.action;
      if (action === "delete") managedCategories.splice(index, 1);
      if (action === "up" && index > 0) [managedCategories[index - 1], managedCategories[index]] = [managedCategories[index], managedCategories[index - 1]];
      if (action === "down" && index < managedCategories.length - 1) [managedCategories[index + 1], managedCategories[index]] = [managedCategories[index], managedCategories[index + 1]];
      renderCategoriesManager();
    };
  });
}

function collectForm() {
  const data = {};
  Object.entries(fields).forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (el) data[key] = el.value;
  });
  data.categories = managedCategories.map((item) => ({ ...item }));
  return data;
}

function populateForm() {
  const data = readLocal("ramsesSiteData", {});
  const merged = { ...defaultData, ...data };
  Object.entries(fields).forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (el) el.value = merged[key] || "";
  });
}

function addCategoryFromForm() {
  const label = document.getElementById("newCategoryLabel").value.trim();
  const slug = slugifyArabicFriendly(document.getElementById("newCategorySlug").value.trim() || label);
  const description = document.getElementById("newCategoryDesc").value.trim();
  if (!label) return alert("اكتب اسم القسم أولًا.");
  if (managedCategories.some((item) => item.slug === slug || item.id === slug)) return alert("يوجد قسم بنفس الرابط المختصر بالفعل.");
  managedCategories.push({ id: slug, slug, label, description, visible: true });
  document.getElementById("newCategoryLabel").value = "";
  document.getElementById("newCategorySlug").value = "";
  document.getElementById("newCategoryDesc").value = "";
  renderCategoriesManager();
}

async function saveSettings() {
  managedCategories = managedCategories.map((item, index) => ({
    ...item,
    slug: slugifyArabicFriendly(item.slug || item.label || `section-${index + 1}`),
    id: slugifyArabicFriendly(item.id || item.slug || item.label || `section-${index + 1}`),
    label: item.label || `قسم ${index + 1}`
  }));
  writeLocal("ramsesSiteData", collectForm());
  await RamsesDB.saveSections(managedCategories);
  alert("تم حفظ إعدادات الموقع والأقسام بنجاح.");
  await refreshDashboard();
}

function exportCsv(filename, rows) {
  const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function seedDemoData() {
  const now = new Date();
  const views = [];
  const articleIds = articleData.map((a) => a.id);
  for (let i = 0; i < 120; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() - Math.floor(Math.random() * 30));
    views.push({ id: `home-${i}`, page_type: "home", page_id: "home", page_title: "الصفحة الرئيسية", visitor_id: `visitor-home-${i}`, created_at: d.toISOString() });
  }
  for (let i = 0; i < 280; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() - Math.floor(Math.random() * 30));
    const articleId = articleIds[Math.floor(Math.random() * articleIds.length)];
    const article = articleData.find((item) => item.id === articleId);
    views.push({ id: `article-${i}`, page_type: "article", page_id: articleId, page_title: article.ar.title, visitor_id: `visitor-article-${i}`, created_at: d.toISOString() });
  }
  const subscribers = [
    { email: "editor@ramsesmag.com", source: "newsletter_form", created_at: new Date(now.getTime() - 86400000 * 2).toISOString() },
    { email: "reader.one@example.com", source: "newsletter_form", created_at: new Date(now.getTime() - 86400000 * 5).toISOString() }
  ];
  const messages = [
    { name: "أحمد", email: "ahmed@example.com", subject: "اقتراح تعاون", message: "عندي فكرة ممتازة لتطوير قسم التحليلات والملفات الخاصة.", created_at: new Date(now.getTime() - 86400000).toISOString() },
    { name: "سارة", email: "sara@example.com", subject: "استفسار عن النشرة", message: "هل يمكن تخصيص النشرة حسب الأقسام المفضلة؟", created_at: new Date(now.getTime() - 86400000 * 3).toISOString() }
  ];
  writeLocal("ramsesPageViews", views);
  writeLocal("ramsesSubscribers", subscribers);
  writeLocal("ramsesMessages", messages);
}

async function exportDashboardPdf() {
  const report = document.getElementById("pdfReport");
  const allViews = await RamsesDB.getPageViews();
  const views = filterViews(allViews);
  const subscribers = await RamsesDB.getSubscribers();
  const messages = await RamsesDB.getMessages();
  const articleStats = getArticleStats(views);
  const categoryStats = getCategoryStats(articleStats);
  const periodLabel = document.getElementById("dateRange").selectedOptions[0].textContent;

  const metricCards = [
    ["إجمالي الزوار", document.getElementById("metricVisitors").textContent],
    ["مشاهدات الرئيسية", document.getElementById("metricHomepageViews").textContent],
    ["مشاهدات المقالات", document.getElementById("metricArticleViews").textContent],
    ["المشتركون", document.getElementById("metricSubscribers").textContent],
    ["الرسائل", document.getElementById("metricMessages").textContent],
    ["متوسط المشاهدات لكل مقال", document.getElementById("metricAvgPerArticle").textContent]
  ];

  const chart1 = document.getElementById("trafficChart")?.toDataURL("image/png", 1.0) || "";
  const chart2 = document.getElementById("articlesBarChart")?.toDataURL("image/png", 1.0) || "";
  const chart3 = document.getElementById("categoriesChart")?.toDataURL("image/png", 1.0) || "";

  report.innerHTML = `
    <div class="pdf-page cover-page">
      <div class="pdf-cover-mark">RAMSES</div>
      <div class="pdf-cover-text">
        <span class="pdf-kicker">تقرير احترافي للإحصائيات</span>
        <h1>${escapeHtml(document.getElementById("siteName").value || getSiteData().siteName)}</h1>
        <p>تقرير تنفيذي شامل يغطي الزيارات وأداء المقالات والأقسام والمشتركين ورسائل التواصل.</p>
        <div class="pdf-meta-grid">
          <div><strong>فترة التقرير</strong><span>${escapeHtml(periodLabel)}</span></div>
          <div><strong>تاريخ التصدير</strong><span>${escapeHtml(formatDate(new Date().toISOString()))}</span></div>
          <div><strong>عدد الأقسام</strong><span>${managedCategories.length}</span></div>
          <div><strong>عدد المقالات</strong><span>${articleData.length}</span></div>
        </div>
      </div>
    </div>
    <div class="pdf-page">
      <div class="pdf-section-title">الملخص التنفيذي</div>
      <div class="pdf-cards-grid">${metricCards.map(([label, value]) => `<div class="pdf-metric-card"><span>${label}</span><strong>${escapeHtml(value)}</strong></div>`).join("")}</div>
      <div class="pdf-chart-block"><h3>اتجاه الزيارات</h3><img src="${chart1}" alt="traffic chart" /></div>
    </div>
    <div class="pdf-page">
      <div class="pdf-section-title">أداء المحتوى</div>
      <div class="pdf-chart-block"><h3>ترتيب المقالات بالمشاهدات</h3><img src="${chart2}" alt="articles chart" /></div>
      <table class="pdf-table"><thead><tr><th>المقال</th><th>القسم</th><th>المشاهدات</th><th>آخر مشاهدة</th></tr></thead><tbody>
      ${articleStats.slice(0, 8).map((item) => `<tr><td>${escapeHtml(item.title)}</td><td>${escapeHtml(item.category)}</td><td>${item.views}</td><td>${escapeHtml(formatDate(item.lastView))}</td></tr>`).join("") || `<tr><td colspan="4">لا توجد بيانات بعد</td></tr>`}
      </tbody></table>
    </div>
    <div class="pdf-page">
      <div class="pdf-section-title">الأقسام</div>
      <div class="pdf-chart-block small-chart"><h3>مشاهدات الأقسام</h3><img src="${chart3}" alt="categories chart" /></div>
      <table class="pdf-table"><thead><tr><th>القسم</th><th>Slug</th><th>المقالات</th><th>المشاهدات</th></tr></thead><tbody>
      ${categoryStats.map((item) => `<tr><td>${escapeHtml(item.label)}</td><td>${escapeHtml(item.slug)}</td><td>${item.articleCount}</td><td>${item.totalViews}</td></tr>`).join("")}
      </tbody></table>
    </div>
    <div class="pdf-page">
      <div class="pdf-section-title">المشتركون والرسائل</div>
      <div class="pdf-two-columns">
        <div><h3>أحدث المشتركين</h3><table class="pdf-table compact-pdf-table"><thead><tr><th>البريد</th><th>التاريخ</th></tr></thead><tbody>
        ${subscribers.slice(0, 10).map((item) => `<tr><td>${escapeHtml(item.email)}</td><td>${escapeHtml(formatDate(item.created_at))}</td></tr>`).join("") || `<tr><td colspan="2">لا يوجد مشتركون بعد</td></tr>`}
        </tbody></table></div>
        <div><h3>أحدث الرسائل</h3><table class="pdf-table compact-pdf-table"><thead><tr><th>المرسل</th><th>الموضوع</th></tr></thead><tbody>
        ${messages.slice(0, 8).map((item) => `<tr><td>${escapeHtml(item.name)}</td><td>${escapeHtml(item.subject)}</td></tr>`).join("") || `<tr><td colspan="2">لا توجد رسائل بعد</td></tr>`}
        </tbody></table></div>
      </div>
      <div class="pdf-rights"><strong>حقوق التقرير</strong><p>جميع الحقوق محفوظة © ${new Date().getFullYear()} ${escapeHtml(document.getElementById("siteName").value || getSiteData().siteName)}. هذا التقرير مخصص للإدارة الداخلية ولوحة التحكم الخاصة بالموقع.</p></div>
    </div>
  `;

  report.style.display = "block";
  const pdf = new window.jspdf.jsPDF("p", "mm", "a4");
  const pages = [...report.querySelectorAll(".pdf-page")];
  for (let i = 0; i < pages.length; i++) {
    const canvas = await html2canvas(pages[i], { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
    const imgData = canvas.toDataURL("image/jpeg", 0.98);
    const pdfWidth = 210;
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    if (i > 0) pdf.addPage();
    pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, Math.min(pdfHeight, 297));
  }
  pdf.save(`ramses-analytics-report-${new Date().toISOString().slice(0, 10)}.pdf`);
  report.style.display = "none";
}

async function refreshDashboard() {
  const [allViews, subscribers, messages] = await Promise.all([
    RamsesDB.getPageViews(),
    RamsesDB.getSubscribers(),
    RamsesDB.getMessages()
  ]);
  const views = filterViews(allViews);
  const articleStats = getArticleStats(views);
  const categoryStats = getCategoryStats(articleStats);
  renderMetrics(views, articleStats, subscribers, messages);
  renderTrafficCharts(views, articleStats, categoryStats);
  renderTopArticles(articleStats);
  renderCategorySection(categoryStats);
  renderSubscribers(subscribers);
  renderMessages(messages);
  renderRecentActivity(subscribers, messages);
  renderCategoriesManager();
}

async function init() {
  managedCategories = (await RamsesDB.getSections(defaultData.categories)).map((item, index) => ({
    id: item.id || item.slug || `section-${index + 1}`,
    slug: item.slug || item.id || `section-${index + 1}`,
    label: item.label || `قسم ${index + 1}`,
    description: item.description || "",
    visible: item.visible !== false
  }));

  populateForm();
  await refreshDashboard();

  document.getElementById("saveSettings").addEventListener("click", saveSettings);
  document.getElementById("addCategoryBtn").addEventListener("click", addCategoryFromForm);
  document.getElementById("seedDemo").addEventListener("click", async () => {
    seedDemoData();
    await refreshDashboard();
    alert("تم توليد بيانات تجريبية محلية للوحة التحكم.");
  });
  document.getElementById("clearAnalytics").addEventListener("click", async () => {
    ["ramsesPageViews", "ramsesSubscribers", "ramsesMessages"].forEach((key) => localStorage.removeItem(key));
    await refreshDashboard();
    alert("تم مسح البيانات المحلية فقط.");
  });
  document.getElementById("dateRange").addEventListener("change", refreshDashboard);
  document.getElementById("exportPdf").addEventListener("click", exportDashboardPdf);
  document.getElementById("exportSubscribers").addEventListener("click", async () => {
    const subscribers = await RamsesDB.getSubscribers();
    exportCsv("ramses-subscribers.csv", [["Email", "Source", "Created At"], ...subscribers.map((item) => [item.email, item.source || "newsletter", item.created_at])]);
  });
  document.getElementById("exportMessages").addEventListener("click", async () => {
    const messages = await RamsesDB.getMessages();
    exportCsv("ramses-messages.csv", [["Name", "Email", "Subject", "Message", "Created At"], ...messages.map((item) => [item.name, item.email, item.subject, item.message, item.created_at])]);
  });

  document.querySelectorAll(".tab-btn").forEach((btn) => btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(btn.dataset.tab).classList.add("active");
    Object.values(charts).forEach((chart) => chart?.resize?.());
  }));
}

init();
