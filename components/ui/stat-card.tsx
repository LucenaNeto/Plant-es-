const tones = {
  amber: "border-amber-200 bg-amber-50 text-amber-900",
  indigo: "border-indigo-200 bg-indigo-50 text-indigo-900",
  rose: "border-rose-200 bg-rose-50 text-rose-900",
  teal: "border-teal-200 bg-teal-50 text-teal-900",
  zinc: "border-zinc-200 bg-white text-zinc-950",
};

export function StatCard({
  label,
  tone,
  value,
}: {
  label: string;
  tone: keyof typeof tones;
  value: string;
}) {
  return (
    <article className={`rounded-lg border p-4 shadow-sm ${tones[tone]}`}>
      <p className="text-sm opacity-75">{label}</p>
      <strong className="mt-2 block text-xl">{value}</strong>
    </article>
  );
}
