Ramses dashboard upgrade

Files included:
- index.html
- article.html
- admin.html
- app.js
- article.js
- admin.js
- data.js
- styles.css

What changed:
1. Removed English switch from the public site UI.
2. Added contact form that saves messages to dashboard.
3. Added newsletter capture that stores subscriber emails.
4. Added article/home view tracking using localStorage for immediate demo on GitHub Pages.
5. Added advanced admin dashboard with charts, top articles, subscribers, messages, and CSV export.

Important note:
This version works instantly as a front-end demo on GitHub Pages using browser localStorage. That means data is per browser/device. For real shared analytics across all visitors, connect a backend like Supabase and replace local storage operations.
