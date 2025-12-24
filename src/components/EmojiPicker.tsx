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
      <div className="mb-4 min-h-[60px] rounded-lg bg-gray-100 p-3">
        <div className="mb-2 text-sm text-gray-500">
          Selected Emojis ({selectedEmojis.length}):
        </div>
        <div className="flex flex-wrap gap-2">
          {selectedEmojis.map((emoji, index) => (
            <button
              key={index}
              onClick={() => onEmojiRemove(index)}
              className="rounded-lg bg-white p-2 text-2xl shadow transition-all hover:bg-red-50 hover:shadow-md"
              title="Click to remove"
            >
              {emoji}
            </button>
          ))}
          {selectedEmojis.length === 0 && (
            <span className="italic text-gray-400">
              Click emojis below to select...
            </span>
          )}
        </div>
      </div>

      <EmojiPickerReact
        onEmojiClick={handleEmojiClick}
        theme={Theme.LIGHT}
        width="100%"
        height={300}
        searchPlaceholder="Search emojis..."
        previewConfig={{ showPreview: false }}
      />
    </div>
  );
}
