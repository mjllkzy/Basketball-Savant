export function PageHeader({
  eyebrow,
  title,
  description,
  actions
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 border-b border-slate-200 pb-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        {eyebrow ? <div className="mb-1 text-xs font-black uppercase tracking-[0.16em] text-signal">{eyebrow}</div> : null}
        <h1 className="text-2xl font-black tracking-tight text-ink sm:text-3xl">{title}</h1>
        {description ? <p className="mt-1 max-w-4xl text-sm leading-6 text-slate-600">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
