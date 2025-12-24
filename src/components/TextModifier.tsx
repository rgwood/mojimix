interface Props {
  value: string;
  onChange: (value: string) => void;
}

export function TextModifier({ value, onChange }: Props) {
  return (
    <div className="mt-4">
      <label
        htmlFor="modifier"
        className="font-pixel mb-2 block text-sm text-[var(--cyber-yellow)]"
      >
        &gt; STYLE MODIFIER (OPTIONAL):
      </label>
      <input
        id="modifier"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="pixel art, neon glow, watercolor..."
        className="border-retro w-full rounded-lg bg-[var(--bg-secondary)] px-4 py-3 text-[var(--text-primary)] placeholder-[var(--text-muted)] transition-all focus:border-[var(--electric-blue)] focus:shadow-[0_0_15px_var(--electric-blue-glow)] focus:outline-none"
        maxLength={100}
      />
      <p className="font-pixel mt-2 text-xs text-[var(--text-muted)]">
        * Add a style or modification to the generated emoji
      </p>
    </div>
  );
}
