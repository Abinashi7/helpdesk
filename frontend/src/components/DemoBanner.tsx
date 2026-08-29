/**
 * Shown on the public portfolio deployment so visitors know the data is sample
 * data and that they are signed in as a support agent. Rendered only when
 * VITE_DEMO_MODE is "true".
 */
export const isDemoMode = import.meta.env.VITE_DEMO_MODE === 'true';

export default function DemoBanner() {
  if (!isDemoMode) return null;

  return (
    <div className="border-b bg-primary/10 px-6 py-2 text-center text-xs text-foreground/80">
      <span className="font-medium">Demo mode</span> — sample data, signed in as a support
      agent. Replies are not delivered by email.
    </div>
  );
}
