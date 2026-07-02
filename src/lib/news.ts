import newsItems from "@/lib/data/news.json";

export type NewsCategory =
  | "League"
  | "Coaching"
  | "Free Agency"
  | "Draft Rumor"
  | "Injury"
  | "Draft"
  | "Transaction"
  | "Roster"
  | "Trade"
  | "Rumor";

export type NewsReportingStatus = "Official" | "Rumor";
export type NewsFeedFilter = "all" | "official" | "rumors";
export type NewsWindowOptions = {
  referenceDate?: Date | string | number;
  withinDays?: number;
};

export type NewsItem = {
  id: string;
  title: string;
  category: NewsCategory;
  reportingStatus: NewsReportingStatus;
  publishedAt: string;
  sourceName: string;
  sourceUrl: string;
  summary: string;
};

export const newsFeed = [...(newsItems as NewsItem[])].sort((a, b) => (
  new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
));

export const newsFeedFilters: Array<{ value: NewsFeedFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "official", label: "Official" },
  { value: "rumors", label: "Rumors" },
];

export const NEWS_RETENTION_DAYS = 3;

const categoryImportance: Record<NewsCategory, number> = {
  Trade: 95,
  "Free Agency": 88,
  Transaction: 82,
  Injury: 78,
  Draft: 64,
  "Draft Rumor": 62,
  Coaching: 54,
  Roster: 48,
  League: 42,
  Rumor: 38,
};

const keywordImportance: Array<[RegExp, number]> = [
  [/\b(trade|traded|acquire|acquired)\b/i, 18],
  [/\b(blockbuster|star)\b/i, 16],
  [/\b(re-sign|sign|extension|contract|deal)\b/i, 14],
  [/\b(champion|finals|all-star|mvp|award)\b/i, 12],
  [/\b(injury|injured|surgery|torn|acl|achilles)\b/i, 12],
  [/\b(waive|waived|release|released)\b/i, 10],
  [/\b(draft|lottery|rookie)\b/i, 8],
];

function newsTimestamp(item: NewsItem) {
  const value = new Date(item.publishedAt).getTime();
  return Number.isFinite(value) ? value : 0;
}

function referenceTimestamp(value: NewsWindowOptions["referenceDate"]) {
  const time = value === undefined ? Date.now() : new Date(value).getTime();
  return Number.isFinite(time) ? time : Date.now();
}

export function isNewsWithinWindow(item: NewsItem, options: NewsWindowOptions = {}) {
  if (!options.withinDays) return true;
  const cutoff = referenceTimestamp(options.referenceDate) - options.withinDays * 24 * 60 * 60 * 1000;
  return newsTimestamp(item) >= cutoff;
}

export function newsImportanceScore(item: NewsItem) {
  const text = `${item.title} ${item.summary}`.toLowerCase();
  let score = categoryImportance[item.category] ?? 35;
  if (item.reportingStatus === "Official") score += 6;
  if (item.reportingStatus === "Official" && item.category === "Trade") score += 10;
  if (item.reportingStatus === "Official" && /\bblockbuster trade\b/i.test(text)) score += 10;
  for (const [pattern, weight] of keywordImportance) {
    if (pattern.test(text)) score += weight;
  }
  if (text.includes("takeaways") || text.includes("trending topics")) score -= 28;
  if (text.includes("summer league schedule") || text.includes("schedule")) score -= 10;
  return score;
}

export function getDisplayNewsFeed(options: NewsWindowOptions = {}) {
  return newsFeed.filter((item) => isNewsWithinWindow(item, options));
}

export function normalizeNewsFilter(value: string | undefined): NewsFeedFilter {
  if (value === "official" || value === "rumors") return value;
  return "all";
}

export function filterNewsFeed(filter: NewsFeedFilter, options: NewsWindowOptions = {}) {
  const displayFeed = getDisplayNewsFeed(options);
  if (filter === "official") return displayFeed.filter((item) => item.reportingStatus === "Official");
  if (filter === "rumors") return displayFeed.filter((item) => item.reportingStatus === "Rumor");
  return displayFeed;
}

export function newsFeedCount(filter: NewsFeedFilter, options: NewsWindowOptions = {}) {
  return filterNewsFeed(filter, options).length;
}

export function getRecentNews(limit = 4, options: NewsWindowOptions = {}) {
  return getDisplayNewsFeed(options).slice(0, limit);
}

export function selectBiggestOfficialNewsLead(items: NewsItem[], options: NewsWindowOptions = {}) {
  return [...items]
    .filter((item) => item.reportingStatus === "Official" && isNewsWithinWindow(item, options))
    .sort((a, b) => newsImportanceScore(b) - newsImportanceScore(a) || newsTimestamp(b) - newsTimestamp(a))[0];
}

export function getBiggestOfficialNewsLead(options: NewsWindowOptions = {}) {
  return selectBiggestOfficialNewsLead(newsFeed, options);
}

export function selectBiggestNewsLead(items: NewsItem[], filter: NewsFeedFilter = "all", options: NewsWindowOptions = {}) {
  return [...items]
    .filter((item) => {
      if (!isNewsWithinWindow(item, options)) return false;
      if (filter === "official") return item.reportingStatus === "Official";
      if (filter === "rumors") return item.reportingStatus === "Rumor";
      return true;
    })
    .sort((a, b) => newsImportanceScore(b) - newsImportanceScore(a) || newsTimestamp(b) - newsTimestamp(a))[0];
}

export function getBiggestNewsLead(filter: NewsFeedFilter = "all", options: NewsWindowOptions = {}) {
  return selectBiggestNewsLead(newsFeed, filter, options);
}

export function formatNewsDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}

export function categoryTone(category: NewsCategory) {
  switch (category) {
    case "Injury":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "Draft Rumor":
      return "border-indigo-200 bg-indigo-50 text-indigo-800";
    case "Draft":
      return "border-sky-200 bg-sky-50 text-sky-800";
    case "Transaction":
    case "Roster":
    case "Trade":
      return "border-blue-200 bg-blue-50 text-blue-800";
    case "Free Agency":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "Coaching":
      return "border-orange-200 bg-orange-50 text-orange-800";
    default:
      return "border-teal-200 bg-teal-50 text-signal";
  }
}

export function reportingStatusTone(status: NewsReportingStatus) {
  switch (status) {
    case "Rumor":
      return "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-800";
    case "Official":
    default:
      return "border-slate-200 bg-white text-slate-700";
  }
}
