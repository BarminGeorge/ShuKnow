## Task: Replace Text-Based Folder Icon Input with an Emoji Picker Popup

### Context
Currently, the folder icon/emoji is set via a plain text input field where users manually type an emoji character. This is a poor UX — most users don't know how to type emojis, and there's no visual preview or curated selection. The icon system needs to be completely reworked.

### Requirements

#### 1. Default State — No Icon
- New folders must be created with NO icon/emoji by default (empty string or null).
- In every place where the emoji is rendered (sidebar, grid cards, breadcrumbs, modals), handle the empty/null state gracefully — just show the folder name without any emoji prefix. Do NOT show a placeholder emoji.

#### 2. Emoji Picker Popup Component
Create a reusable <EmojiPicker /> component (or integrate a lightweight library like emoji-mart or build a custom grid) that:
- Opens as a floating popup/popover (not a modal) anchored to the clicked element.
- Contains a curated grid of commonly used emojis organized by categories (e.g., Smileys, Objects, Animals, Food, Travel, Symbols — at minimum 80-120 emojis).
- Has a search/filter input at the top of the popup to quickly find emojis by keyword.
- Closes on outside click or on emoji selection.
- Returns the selected emoji string to the parent via an onSelect(emoji: string) callback.

#### 3. "Remove Icon" Action
- At the top of the emoji picker popup, add a clearly visible button: "Remove Icon" (or "✕ Clear") that sets the emoji back to empty/null.
- This button should only appear when the folder currently HAS an icon set (conditional rendering).

#### 4. Integration Points — Where the Picker Must Work

A. Folder Creation Modal (Create New Folder):
- Replace the text input for emoji with a clickable area (e.g., a square button showing the selected emoji, or a "＋ Add Icon" placeholder if none is selected).
- Clicking this area opens the <EmojiPicker /> popover positioned near it.
- Selected emoji is stored in the folder creation form state.

B. Folder Edit Modal (Edit Folder Metadata):
- Same behavior as creation modal.
- If the folder already has an emoji, show it in the clickable area.
- User can change it (pick a new one) or remove it (via "Remove Icon" button in the picker).

C. Folder Content View Header (Grid / Workspace area):
- In the header area of the currently open folder (where the folder name and emoji are displayed), make the emoji (or an "Add Icon" placeholder if none exists) clickable.
- Clicking it opens the <EmojiPicker /> popover right there, inline.
- Selecting an emoji immediately updates the folder via onUpdateFolder({ emoji: selectedEmoji }).
- This gives users a quick way to set/change the icon without opening the full edit modal.

#### 5. Visual Design of the Picker
- Dark theme consistent with the app (bg-[#1a1a2e] or similar dark surface).
- Rounded corners, subtle border, drop shadow for the floating popover.
- Emoji grid: 6-8 columns, each emoji as a hoverable button with hover:bg-white/10 highlight.
- Category tabs or headers to separate emoji groups.
- Search input: dark styled, with a search icon, placeholder "Search emoji..."
- Max height ~300px with overflow-y scroll.
- Popover should be positioned smartly (flip if near viewport edge) — use absolute/fixed positioning with boundary detection.

#### 6. State & Data
- The Folder interface already has an emoji?: string field — continue using it.
- Ensure emoji can be "" or undefined (both treated as "no icon").
- All renders that display folder.emoji must check: {folder.emoji && <span>{folder.emoji}</span>} — no crashes on empty.

#### 7. Constraints
- Do NOT change any drag-and-drop logic, grid sorting, sidebar structure, or file-related components.
- Do NOT change the floating window system or markdown editor.
- Keep all existing functionality intact — this is purely an icon selection UX improvement.
- Reuse existing color palette and spacing conventions from the codebase.