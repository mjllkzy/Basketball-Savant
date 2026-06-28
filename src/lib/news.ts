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

export function getRecentNews(limit = 4) {
  return newsFeed.slice(0, limit);
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
