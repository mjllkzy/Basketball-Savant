type Option = {
  label: string;
  value: string;
};

type TeamFilterFormProps = {
  conference?: string;
  division?: string;
  month?: string;
  conferences: Option[];
  divisions: Option[];
  months: Option[];
};

export function TeamFilterForm({
  conference,
  division,
  month,
  conferences,
  divisions,
  months
}: TeamFilterFormProps) {
  return (
    <form className="grid gap-4 rounded border border-slate-200 bg-white p-4 shadow-sm" method="get" action="/teams">
      <div className="grid gap-3 md:grid-cols-4">
        <select name="conference" defaultValue={conference ?? ""} className="rounded border border-slate-300 px-3 py-2 text-sm">
          <option value="">All conferences</option>
          {conferences.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <select name="division" defaultValue={division ?? ""} className="rounded border border-slate-300 px-3 py-2 text-sm">
          <option value="">All divisions</option>
          {divisions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <select name="month" defaultValue={month ?? ""} className="rounded border border-slate-300 px-3 py-2 text-sm">
          <option value="">Full season</option>
          {months.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
        <button className="rounded bg-ink px-3 py-2 text-sm font-black text-white">Apply</button>
      </div>
    </form>
  );
}
