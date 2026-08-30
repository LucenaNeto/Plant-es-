export function PageHeader({
  actionLabel,
  description,
  eyebrow,
  title,
}: {
  actionLabel?: string;
  description: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <header className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-teal-700">{eyebrow}</p>
        <h1 className="mt-1 text-3xl font-semibold">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-500">{description}</p>
      </div>
      {actionLabel ? (
        <button className="min-h-12 w-full rounded-md bg-zinc-950 px-4 font-semibold text-white sm:w-auto">
          {actionLabel}
        </button>
      ) : null}
    </header>
  );
}
