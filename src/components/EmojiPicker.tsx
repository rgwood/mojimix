import EmojiPickerReact, { EmojiClickData, Theme } from "emoji-picker-react";

interface Props {
  selectedEmojis: string[];
  onEmojiSelect: (emoji: string) => void;
  onEmojiRemove: (index: number) => void;
}

export function EmojiPicker({
  selectedEmojis,
  onEmojiSelect,
  onEmojiRemove,
}: Props) {
  const handleEmojiClick = (emojiData: EmojiClickData) => {
    onEmojiSelect(emojiData.emoji);
  };

  return (
    <div className="emoji-picker-container">
      {/* Selected emojis display */}
      <div className="border-retro-pink mb-4 min-h-[70px] rounded-lg bg-[var(--bg-secondary)] p-3">
        <div className="font-pixel mb-2 text-xs text-[var(--hot-pink)]">
          &gt; SELECTED [{selectedEmojis.length}]:
        </div>
        <div className="flex flex-wrap gap-2">
          {selectedEmojis.map((emoji, index) => (
            <button
              key={index}
              onClick={() => onEmojiRemove(index)}
              className="btn-bevel group relative rounded-lg bg-[var(--surface-elevated)] p-2 text-2xl transition-all hover:bg-[var(--hot-pink)]"
              title="Click to remove"
            >
              {emoji}
              {/* X indicator on hover */}
              <span className="font-pixel absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[var(--hot-pink)] text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                X
              </span>
            </button>
          ))}
          {selectedEmojis.length === 0 && (
            <span className="text-sm italic text-[var(--text-muted)]">
              Click emojis below to select...
            </span>
          )}
        </div>
      </div>

      {/* Emoji picker with dark theme */}
      <EmojiPickerReact
        onEmojiClick={handleEmojiClick}
        theme={Theme.DARK}
        width="100%"
        height={280}
        searchPlaceholder="Search emojis..."
        previewConfig={{ showPreview: false }}
      />
    </div>
  );
}
