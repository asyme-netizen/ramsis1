
const defaultData = { ...siteDefaults };
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

function getSiteData() {
  const saved = localStorage.getItem("ramsesSiteData");
  return saved ? { ...defaultData, ...JSON.parse(saved) } : defaultData;
}

function collectForm() {
  const data = {};
  Object.entries(fields).forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (el) data[key] = el.value;
  });
  return data;
}

function populateForm() {
  const data = getSiteData();
  Object.entries(fields).forEach(([id, key]) => {
    const el = document.getElementById(id);
    if (el) el.value = data[key] || "";
  });
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" });
}

function escapeHtml(text = "") {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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

function getFilteredViews() {
  const all = readLocal("ramsesPageViews", []);
  const since = getDateRangeFilter();
  return since ? all.filter((item) => new Date(item.created_at) >= since) : all;
}

function getSubscribers() {
  return readLocal("ramsesSubscribers", []);
}

function getMessages() {
  return readLocal("ramsesMessages", []);
}

function getUniqueVisitors(views) {
  const homeViews = views.filter((item) => item.page_type === "home");
  return homeViews.length;
}

function getArticleStats(views) {
  const articlesOnly = views.filter((item) => item.page_type === "article");
  return articleData.map((article) => {
    const items = articlesOnly.filter((item) => item.page_id === article.id);
    return {
      id: article.id,
      title: article.ar.title,
      category: article.ar.categoryLabel,
      views: items.length,
      lastView: items[items.length - 1]?.created_at || null
    };
  }).sort((a, b) => b.views - a.views);
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
  document.getElementById("metricAvgPerArticle").textContent = String(avg).toLocaleString?.("ar-EG") || avg;

  document.getElementById("metricVisitorsSub").textContent = "عدد مرات فتح الصفحة الرئيسية";
  document.getElementById("metricHomepageSub").textContent = "كل زيارة للرئيسية تُسجل تلقائيًا";
  document.getElementById("metricArticleSub").textContent = `أعلى مقال: ${articleStats[0]?.title || "-"}`;
  document.getElementById("metricSubscribersSub").textContent = subscribers[0] ? `آخر اشتراك: ${subscribers[0].email}` : "لا يوجد اشتراكات بعد";
  document.getElementById("metricMessagesSub").textContent = messages[0] ? `آخر رسالة: ${messages[0].subject}` : "لا يوجد رسائل بعد";
  document.getElementById("metricAvgSub").textContent = `إجمالي المقالات: ${articleData.length}`;
}

function renderTrafficCharts(views, articleStats) {
  const series = getDailySeries(views);
  upsertChart("trafficChart", "line", {
    data: {
      labels: series.map(([day]) => day),
      datasets: [{
        label: "الزيارات",
        data: series.map(([, value]) => value),
        tension: 0.35,
        fill: false,
        borderWidth: 3
      }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
  });

  const homeViews = views.filter((item) => item.page_type === "home").length;
  const articleViews = views.filter((item) => item.page_type === "article").length;
  upsertChart("viewsSplitChart", "doughnut", {
    data: {
      labels: ["الرئيسية", "المقالات"],
      datasets: [{ data: [homeViews, articleViews], borderWidth: 1 }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });

  upsertChart("articlesBarChart", "bar", {
    data: {
      labels: articleStats.map((item) => item.title),
      datasets: [{ label: "المشاهدات", data: articleStats.map((item) => item.views), borderWidth: 1 }]
    },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, indexAxis: 'y' }
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
      <div class="message-head">
        <div>
          <h3>${escapeHtml(item.subject)}</h3>
          <p><strong>${escapeHtml(item.name)}</strong> — ${escapeHtml(item.email)}</p>
        </div>
        <span>${formatDate(item.created_at)}</span>
      </div>
      <p class="message-body">${escapeHtml(item.message)}</p>
    </article>
  `).join("") || `<div class="empty-state">لا توجد رسائل حتى الآن.</div>`;
}

function renderRecentActivity(subscribers, messages) {
  const merged = [
    ...subscribers.map((item) => ({ type: "مشترك جديد", title: item.email, date: item.created_at, body: "تم الاشتراك من نموذج النشرة." })),
    ...messages.map((item) => ({ type: "رسالة جديدة", title: item.subject, date: item.created_at, body: `${item.name} — ${item.email}` }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 8);

  document.getElementById("recentActivityList").innerHTML = merged.map((item) => `
    <div class="activity-item">
      <span class="activity-badge">${item.type}</span>
      <div>
        <strong>${escapeHtml(item.title)}</strong>
        <p>${escapeHtml(item.body)}</p>
      </div>
      <time>${formatDate(item.date)}</time>
    </div>
  `).join("") || `<div class="empty-state">لا توجد أنشطة حديثة حتى الآن.</div>`;
}

function refreshDashboard() {
  const views = getFilteredViews();
  const subscribers = getSubscribers();
  const messages = getMessages();
  const articleStats = getArticleStats(views);
  renderMetrics(views, articleStats, subscribers, messages);
  renderTrafficCharts(views, articleStats);
  renderTopArticles(articleStats);
  renderSubscribers(subscribers);
  renderMessages(messages);
  renderRecentActivity(subscribers, messages);
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
    d.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));
    views.push({ id: `home-${i}`, page_type: "home", page_id: "home", page_title: "الصفحة الرئيسية", created_at: d.toISOString() });
  }
  for (let i = 0; i < 280; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() - Math.floor(Math.random() * 30));
    d.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));
    const articleId = articleIds[Math.floor(Math.random() * articleIds.length)];
    const article = articleData.find((item) => item.id === articleId);
    views.push({ id: `article-${i}`, page_type: "article", page_id: articleId, page_title: article.ar.title, created_at: d.toISOString() });
  }
  const subscribers = [
    { email: "editor@ramsesmag.com", source: "newsletter_form", created_at: new Date(now.getTime() - 86400000 * 2).toISOString() },
    { email: "reader.one@example.com", source: "newsletter_form", created_at: new Date(now.getTime() - 86400000 * 5).toISOString() },
    { email: "history.digest@example.com", source: "newsletter_form", created_at: new Date(now.getTime() - 86400000 * 9).toISOString() }
  ];
  const messages = [
    { name: "أحمد", email: "ahmed@example.com", subject: "اقتراح تعاون", message: "عندي فكرة ممتازة لتطوير قسم التحليلات والملفات الخاصة.", created_at: new Date(now.getTime() - 86400000).toISOString() },
    { name: "سارة", email: "sara@example.com", subject: "استفسار عن النشرة", message: "هل يمكن تخصيص النشرة حسب الأقسام المفضلة؟", created_at: new Date(now.getTime() - 86400000 * 3).toISOString() }
  ];
  writeLocal("ramsesPageViews", views);
  writeLocal("ramsesSubscribers", subscribers);
  writeLocal("ramsesMessages", messages);
  refreshDashboard();
}

populateForm();
refreshDashboard();

document.getElementById("saveSettings").addEventListener("click", () => {
  localStorage.setItem("ramsesSiteData", JSON.stringify(collectForm()));
  alert("تم حفظ إعدادات الموقع بنجاح.");
});

document.getElementById("seedDemo").addEventListener("click", () => {
  seedDemoData();
  alert("تم توليد بيانات تجريبية للوحة التحكم.");
});

document.getElementById("clearAnalytics").addEventListener("click", () => {
  ["ramsesPageViews", "ramsesSubscribers", "ramsesMessages"].forEach((key) => localStorage.removeItem(key));
  refreshDashboard();
  alert("تم مسح البيانات المحلية.");
});

document.getElementById("dateRange").addEventListener("change", refreshDashboard);

document.getElementById("exportSubscribers").addEventListener("click", () => {
  const subscribers = getSubscribers();
  exportCsv("ramses-subscribers.csv", [["Email", "Source", "Created At"], ...subscribers.map((item) => [item.email, item.source || "newsletter", item.created_at])]);
});

document.getElementById("exportMessages").addEventListener("click", () => {
  const messages = getMessages();
  exportCsv("ramses-messages.csv", [["Name", "Email", "Subject", "Message", "Created At"], ...messages.map((item) => [item.name, item.email, item.subject, item.message, item.created_at])]);
});

document.querySelectorAll(".tab-btn").forEach((btn) => btn.addEventListener("click", () => {
  document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
  document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
  btn.classList.add("active");
  document.getElementById(btn.dataset.tab).classList.add("active");
  Object.values(charts).forEach((chart) => chart?.resize?.());
}));
