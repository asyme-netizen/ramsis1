(function () {
  const SUPABASE_URL = "https://huvwzuigqbhsmmrydggp.supabase.co";
  const SUPABASE_KEY = "sb_publishable_oxbFWkrqC6oB2WnkPRu2pA_Ucfwroia";

  function safeRead(key, fallback) {
    try {
      return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
    } catch {
      return fallback;
    }
  }

  function safeWrite(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  const hasSupabase = !!(window.supabase && SUPABASE_URL && SUPABASE_KEY);
  const client = hasSupabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

  async function withFallback(remoteAction, localAction) {
    try {
      if (!client) throw new Error("Supabase unavailable");
      return await remoteAction();
    } catch (error) {
      console.warn("Ramses DB fallback:", error?.message || error);
      return await localAction();
    }
  }

  async function trackPageView(payload) {
    const row = {
      page_type: payload.page_type,
      page_id: payload.page_id,
      page_title: payload.page_title || "",
      referrer: payload.referrer || "",
      visitor_id: payload.visitor_id || "",
      created_at: new Date().toISOString()
    };

    return withFallback(async () => {
      const { error } = await client.from("page_views").insert(row);
      if (error) throw error;
      return true;
    }, async () => {
      const items = safeRead("ramsesPageViews", []);
      items.push({ id: crypto.randomUUID?.() || String(Date.now() + Math.random()), ...row });
      safeWrite("ramsesPageViews", items);
      return true;
    });
  }

  async function addSubscriber(email, source = "newsletter_form") {
    const row = { email, source, created_at: new Date().toISOString() };
    return withFallback(async () => {
      const { error } = await client.from("newsletter_subscribers").insert(row);
      if (error && String(error.message || "").toLowerCase().includes("duplicate")) return false;
      if (error) throw error;
      return true;
    }, async () => {
      const items = safeRead("ramsesSubscribers", []);
      const exists = items.some((item) => String(item.email).toLowerCase() === String(email).toLowerCase());
      if (!exists) {
        items.unshift({ id: crypto.randomUUID?.() || String(Date.now() + Math.random()), ...row });
        safeWrite("ramsesSubscribers", items);
      }
      return !exists;
    });
  }

  async function addMessage(payload) {
    const row = {
      name: payload.name || "",
      email: payload.email || "",
      subject: payload.subject || "",
      message: payload.message || "",
      status: payload.status || "new",
      created_at: new Date().toISOString()
    };

    return withFallback(async () => {
      const { error } = await client.from("contact_messages").insert(row);
      if (error) throw error;
      return true;
    }, async () => {
      const items = safeRead("ramsesMessages", []);
      items.unshift({ id: crypto.randomUUID?.() || String(Date.now() + Math.random()), ...row });
      safeWrite("ramsesMessages", items);
      return true;
    });
  }

  async function getPageViews() {
    return withFallback(async () => {
      const { data, error } = await client.from("page_views").select("*").order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    }, async () => safeRead("ramsesPageViews", []));
  }

  async function getSubscribers() {
    return withFallback(async () => {
      const { data, error } = await client.from("newsletter_subscribers").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    }, async () => safeRead("ramsesSubscribers", []));
  }

  async function getMessages() {
    return withFallback(async () => {
      const { data, error } = await client.from("contact_messages").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    }, async () => safeRead("ramsesMessages", []));
  }

  async function getSections(defaultSections) {
    return withFallback(async () => {
      const { data, error } = await client.from("site_sections").select("*").order("sort_order", { ascending: true });
      if (error) throw error;
      if (!data?.length) return defaultSections;
      return data.map((item, index) => ({
        id: item.slug || `section-${index + 1}`,
        slug: item.slug || `section-${index + 1}`,
        label: item.name || `قسم ${index + 1}`,
        description: item.description || "",
        visible: item.is_visible !== false,
        sort_order: item.sort_order ?? index + 1
      }));
    }, async () => {
      const saved = safeRead("ramsesSiteData", {});
      const sections = Array.isArray(saved.categories) && saved.categories.length ? saved.categories : defaultSections;
      return sections;
    });
  }

  async function saveSections(sections) {
    const normalized = sections.map((item, index) => ({
      name: item.label,
      slug: item.slug,
      description: item.description || "",
      is_visible: item.visible !== false,
      sort_order: index + 1
    }));

    return withFallback(async () => {
      const { data: existing, error: readError } = await client.from("site_sections").select("slug");
      if (readError) throw readError;
      const existingSlugs = new Set((existing || []).map((item) => item.slug));
      const nextSlugs = new Set(normalized.map((item) => item.slug));
      const toDelete = [...existingSlugs].filter((slug) => !nextSlugs.has(slug));
      if (toDelete.length) {
        const { error: deleteError } = await client.from("site_sections").delete().in("slug", toDelete);
        if (deleteError) throw deleteError;
      }
      const { error: upsertError } = await client.from("site_sections").upsert(normalized, { onConflict: "slug" });
      if (upsertError) throw upsertError;
      return true;
    }, async () => {
      const saved = safeRead("ramsesSiteData", {});
      saved.categories = sections;
      safeWrite("ramsesSiteData", saved);
      return true;
    });
  }

  window.RamsesDB = {
    client,
    enabled: !!client,
    trackPageView,
    addSubscriber,
    addMessage,
    getPageViews,
    getSubscribers,
    getMessages,
    getSections,
    saveSections,
    safeRead,
    safeWrite
  };
})();
