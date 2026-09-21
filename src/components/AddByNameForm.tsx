import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { CATEGORIES, GROUPS, OTHER_CATEGORY } from "../../shared/catalog";

type Props = {
  // When set, the tools are added under this category and the type picker is hidden.
  fixedCategoryId?: string;
  initialText?: string;
  autoFocus?: boolean;
  onAdd: (names: string, categoryId: string) => string | null;
  // When provided, Escape in the text box calls it (used to close the inline box).
  onClose?: () => void;
};

const FIELD =
  "w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-900 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";

export function AddByNameForm({ fixedCategoryId, initialText = "", autoFocus, onAdd, onClose }: Props) {
  const [text, setText] = useState(initialText);
  const [categoryId, setCategoryId] = useState(fixedCategoryId ?? OTHER_CATEGORY.id);
  const [error, setError] = useState<string | null>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus) textRef.current?.focus();
  }, [autoFocus]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    // Read the box itself: some keyboards, dictation and extensions change it without React seeing an input event.
    const value = textRef.current?.value ?? text;
    const problem = onAdd(value, fixedCategoryId ?? categoryId);
    setError(problem);
    if (!problem) setText("");
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape" && onClose) {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      // Enter can also confirm an IME suggestion, auto-repeat while held, or land on the box right after a
      // successful add. None of those should submit or show an error; the button still explains an empty box.
      if (e.nativeEvent.isComposing || e.repeat || !e.currentTarget.value.trim()) return;
      e.currentTarget.form?.requestSubmit();
    }
  };

  return (
    <form onSubmit={submit} className="space-y-2.5" noValidate>
      <label className="block">
        <span className="mb-1 block text-[11px] font-medium text-slate-500">
          Tool names, separated by commas
        </span>
        <textarea
          ref={textRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setError(null);
          }}
          onKeyDown={onKeyDown}
          rows={3}
          maxLength={600}
          placeholder="e.g. Acme Timer, Foo Tracker"
          spellCheck={false}
          className={`${FIELD} resize-none`}
        />
      </label>

      {!fixedCategoryId && (
        <label className="block">
          <span className="mb-1 block text-[11px] font-medium text-slate-500">What kind of tools are they?</span>
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={FIELD}>
            <option value={OTHER_CATEGORY.id}>Other / not sure</option>
            {GROUPS.map((group) => (
              <optgroup key={group.id} label={group.label}>
                {CATEGORIES.filter((c) => c.groupId === group.id).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>
      )}

      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:outline-none"
      >
        Add to canvas
      </button>
    </form>
  );
}
