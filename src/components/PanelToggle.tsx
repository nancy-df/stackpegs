type Props = {
  side: "left" | "right";
  open: boolean;
  label: string;
  onClick: () => void;
};

// A slim handle on the canvas edge that slides a side panel closed or open. Desktop widths only.
export function PanelToggle({ side, open, label, onClick }: Props) {
  const pointsLeft = (side === "left") === open;
  const action = `${open ? "Hide" : "Show"} ${label}`;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      aria-label={action}
      title={action}
      className={`absolute top-[15px] z-10 hidden h-[30px] w-6 place-items-center border border-slate-300 bg-white text-slate-600 shadow-md transition-colors hover:bg-indigo-50 hover:text-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:outline-none lg:grid dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:hover:text-white ${
        side === "left" ? "left-0 rounded-r-lg border-l-0" : "right-0 rounded-l-lg border-r-0"
      }`}
    >
      <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {pointsLeft ? <path d="M12 4 6 10l6 6" /> : <path d="m8 4 6 6-6 6" />}
      </svg>
    </button>
  );
}
