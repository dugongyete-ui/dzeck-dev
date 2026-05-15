export const PROJECT_TEMPLATES = [
  {
    emoji: "💬",
    title: "ChatGPT clone",
    prompt:
      "Build a ChatGPT-style chat interface with dark mode, a sidebar for chat history (stored in localStorage), message bubbles with user and AI roles, and a text input with send button. Use local state to simulate AI responses with a typing indicator. Make it look polished and modern.",
  },
  {
    emoji: "🎬",
    title: "Netflix clone",
    prompt:
      "Build a Netflix-style homepage with a full-width hero banner using gradient, horizontally scrollable movie rows (Trending, Popular, New Releases), and a modal for viewing details using mock data and local state. Use dark mode with red accents.",
  },
  {
    emoji: "📦",
    title: "Admin dashboard",
    prompt:
      "Create a modern admin dashboard with a collapsible sidebar, KPI stat cards with icons, a revenue chart placeholder using colored div bars, a data table with search filter and pagination using local state. Use clean visual grouping and a professional look.",
  },
  {
    emoji: "📋",
    title: "Kanban board",
    prompt:
      "Build a kanban board with three columns (To Do, In Progress, Done), drag-and-drop support using @dnd-kit/core, and the ability to add, move, and delete tasks. Store all state locally. Use card shadows, smooth transitions, and a clean modern layout.",
  },
  {
    emoji: "🛍️",
    title: "E-commerce store",
    prompt:
      "Build an e-commerce product page with a category filter sidebar, a responsive product grid with price and rating, an Add to Cart button, and a slide-out cart drawer showing selected items and total. Use local state. Focus on clean typography, spacing, and button states.",
  },
  {
    emoji: "🎵",
    title: "Spotify clone",
    prompt:
      "Build a Spotify-style music player with a dark sidebar for playlists, a main area for album art and song details, and full playback controls (play/pause, next, previous, progress bar, volume). Use local state for playback. Make it look exactly like Spotify with dark mode.",
  },
  {
    emoji: "📺",
    title: "YouTube clone",
    prompt:
      "Build a YouTube-style homepage with a sticky top navbar with search bar, a category chip row, a responsive video card grid with thumbnail placeholders, view counts, and channel names. Add a modal video player with title and description using local state.",
  },
  {
    emoji: "✅",
    title: "Todo app",
    prompt:
      "Build a beautiful todo app with the ability to add, complete, edit, and delete tasks. Include priority tags (High/Medium/Low), a filter bar (All/Active/Completed), and persist data to localStorage. Add smooth animations for adding/removing tasks. Make it look premium.",
  },
  {
    emoji: "🏡",
    title: "Airbnb clone",
    prompt:
      "Build an Airbnb-style property listings page with a filter bar (location, dates, guests), a responsive card grid with property images as colored div placeholders, ratings and price per night, and a detail modal with amenities list. Use local state and a clean, airy design.",
  },
  {
    emoji: "📊",
    title: "Analytics dashboard",
    prompt:
      "Build an analytics dashboard with a top navbar, sidebar navigation, summary KPI cards (users, revenue, growth), bar and line chart placeholders built with Tailwind div elements, a recent activity table, and a date range selector. Use a dark professional theme.",
  },
  {
    emoji: "🌤️",
    title: "Weather app",
    prompt:
      "Build a weather app UI with a search bar for cities, a large current weather display (temperature, condition, humidity, wind), a 7-day forecast row with icons, and an hourly chart using styled divs. Use mock data and local state. Make it beautiful with gradient backgrounds.",
  },
  {
    emoji: "💼",
    title: "Portfolio site",
    prompt:
      "Build a stunning developer portfolio website with a hero section with animated gradient text, an about section, a skills grid with progress bars, a projects section with hover card effects, a contact form with validation, and a sticky navbar with smooth scroll. Make it look world-class.",
  },
] as const;
