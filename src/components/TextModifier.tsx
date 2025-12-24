interface Props {
  value: string;
  onChange: (value: string) => void;
}

export function TextModifier({ value, onChange }: Props) {
  return (
    <div className="mt-4">
      <label
        htmlFor="modifier"
        className="mb-2 block text-sm font-medium text-gray-700"
      >
        Style Modifier (optional):
      </label>
      <input
        id="modifier"
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g., 'pixel art', 'neon glow', 'watercolor'"
        className="w-full rounded-lg border border-gray-300 px-4 py-2 placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
        maxLength={100}
      />
      <p className="mt-1 text-xs text-gray-500">
        Add a style or modification to the generated emoji
      </p>
    </div>
  );
}
