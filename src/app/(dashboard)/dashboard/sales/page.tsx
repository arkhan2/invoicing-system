export default function SalesPage() {
  return (
    <div className="flex h-full min-h-[400px] flex-col items-center justify-center p-8">
      <div className="rounded-xl border border-dashed border-[var(--color-outline)] bg-[var(--color-surface-variant)]/30 px-6 py-10 text-center">
        <p className="text-sm text-[var(--color-on-surface-variant)]">
          Select an invoice from the list or create a new one using the top bar.
        </p>
      </div>
    </div>
  );
}
