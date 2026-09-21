import { useState, type FormEvent } from "react";
import { GUIDANCE_MAX } from "../../shared/custom";

type Props = {
  busy: boolean;
  onRegenerate: (guidance: string) => void;
};

export function GuidanceBar({ busy, onRegenerate }: Props) {
  const [text, setText] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!busy) onRegenerate(text);
  };

  return (
    <form
      onSubmit={submit}
      className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white/95 p-1.5 shadow-lg backdrop-blur dark:border-slate-700 dark:bg-slate-900/95"
    >
      <label className="min-w-0 flex-1">
        <span className="sr-only">Guidance for the next version of the map</span>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={GUIDANCE_MAX}
          placeholder="Guide the next version, e.g. use Zapier between HubSpot and Jira"
          autoComplete="off"
          spellCheck={false}
          className="w-full rounded-lg border border-transparent bg-slate-50 px-2.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:outline-none dark:bg-slate-800 dark:text-slate-100"
        />
      </label>
      <button
        type="submit"
        disabled={busy}
        className="shrink-0 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? "Working..." : "Regenerate"}
      </button>
    </form>
  );
}
