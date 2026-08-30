import Link from "next/link";

export function QuickAction({
  action,
  href,
  label,
}: {
  action: string;
  href: string;
  label: string;
}) {
  return (
    <Link
      className="rounded-lg border border-zinc-200 bg-white p-3 text-center shadow-sm transition hover:border-teal-200 hover:bg-teal-50"
      href={href}
    >
      <span className="block text-xs text-zinc-500">{action}</span>
      <strong className="mt-1 block text-sm">{label}</strong>
    </Link>
  );
}
