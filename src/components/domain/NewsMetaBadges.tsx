import { categoryTone, formatNewsDate, reportingStatusTone, type NewsItem } from "@/lib/news";

type NewsMetaBadgesProps = {
  item: Pick<NewsItem, "category" | "reportingStatus" | "publishedAt">;
  className?: string;
  dateClassName?: string;
  showDate?: boolean;
};

const badgeClassName = "inline-flex h-5 shrink-0 items-center rounded border px-1.5 text-[10px] font-black uppercase leading-none tracking-[0.08em]";

export function NewsMetaBadges({ item, className = "", dateClassName = "", showDate = true }: NewsMetaBadgesProps) {
  return (
    <div className={`flex flex-wrap items-center gap-x-1.5 gap-y-2 ${className}`}>
      <span className={`${badgeClassName} ${categoryTone(item.category)}`}>{item.category}</span>
      <span className={`${badgeClassName} ${reportingStatusTone(item.reportingStatus)}`}>{item.reportingStatus}</span>
      {showDate ? (
        <span className={`shrink-0 whitespace-nowrap text-xs font-bold text-slate-500 ${dateClassName}`}>
          {formatNewsDate(item.publishedAt)}
        </span>
      ) : null}
    </div>
  );
}
