

# Prompt

---

```markdown
# System Role

You are a Senior Frontend Engineer specializing in React 18+, TypeScript, and Tailwind CSS.
You write clean, modular, strictly-typed code. You never use `any`. You follow React best
practices: proper hook dependencies, memoization where needed, and single-responsibility
components.

---

# Project Context

**App:** ShuKnow — a file manager SPA with a sidebar folder tree and a main workspace grid.

**Stack:** React 18, TypeScript, Tailwind CSS, `react-dnd` (used exclusively for grid
sorting and sidebar folder drag-and-drop).

**Design System:** Dark Mode (`bg-zinc-900/950`), `rounded-xl` corners, ghost-buttons,
`shadow-2xl` elevation, `border-zinc-700` borders.

**Existing Architecture:**

| Layer | Description |
|---|---|
| `App.tsx` | Centralized state: `folders`, `files: FileItem[]`, `selectedFolderPath` |
| `FolderContentView.tsx` | Workspace grid — renders file cards and subfolder cards |
| `EditFileModal.tsx` | Modal for editing file name + AI prompt (no content editing) |
| `FileContextMenu.tsx` | Dropdown with "Edit" and "Delete" actions |
| Grid DnD | `react-dnd` handles card reordering within the grid |

**`FileItem` interface (current):**

```ts
interface FileItem {
  id: string;
  name: string;
  type: "text" | "photo";
  folderId: string;
  content?: string;       // markdown string for text files
  imageUrl?: string;       // URL or base64 for photo files
  prompt?: string;         // AI instruction
  createdAt: string;
}
```

---

# Task

Implement a **floating window system** for opening and viewing files from the workspace
grid. Windows are **modeless** (non-blocking), **draggable**, **resizable**, and support
**multiple simultaneous instances**.

---

# Requirements

## 1. Opening a File

| Trigger | Behavior |
|---|---|
| **Double-click** on a file card in the grid | Opens a floating window with the file content |
| **File creation** (existing "Create file" button) | Immediately opens a floating window for the newly created file |
| **Single click** on a file card | Reserved for selection / grid DnD — must **NOT** open a window |
| **Click on ⋮ menu** | Must **NOT** trigger open (`e.stopPropagation()`) |

**Duplicate prevention:** If a window for the same `fileId` is already open, do not create
a second one — instead, bring the existing window to the front (raise `zIndex`).

---

## 2. Floating Window Component (`FloatingFileWindow`)

### 2.1 Layout Structure

```
┌─── Header (drag handle) ──────────────────── [—] [✕] ┐
│  [icon] File Name                                     │
├───────────────────────────────────────────────────────┤
│                                                       │
│                   Content Area                        │
│                                                       │
│                                                       │
│                                                       │
│                                                       │
└───────────────────────────────────── ◢ resize handle ─┘
```

### 2.2 Header Bar (Drag Handle)

- Displays **type icon** (`📄` for text, `🖼️` for photo) and **file name**.
- **Drag zone** — the user grabs the header to move the window.
  Cursor: `cursor-grab` → `cursor-grabbing` while dragging.
- **Minimize button** (`—`): Toggles the window between full view and collapsed state
  (only the header bar remains visible). Toggle on repeated click.
- **Close button** (`✕`): Removes the window from the `openWindows` array.
- Button styles: ghost, `hover:bg-zinc-700` for minimize, `hover:bg-red-500/80
  hover:text-white` for close.

### 2.3 Content Area — by File Type

| Type | Rendering | Editing |
|---|---|---|
| `"text"` | Render `content` as **live Markdown preview** (split view or toggle). Use a lightweight MD renderer (e.g., `react-markdown` or `marked` + `DOMPurify`). | **Editable.** Provide a code/text editor area (monospace `<textarea>` or a simple CodeMirror-lite input). Changes save to global `files` state on `onBlur` **and** on debounce every 800ms while typing. |
| `"photo"` | Render `<img>` with `object-contain`, centered. Below the image show file name and dimensions (if available). | **View-only.** No editing controls. |

**Text file editor detail:**
- Default mode: **split view** — left half is the editable raw markdown, right half is the
  rendered preview.
- If window width < 400px, switch to **tab mode**: two tabs ("Edit" / "Preview") to save
  space.
- Empty content placeholder: *"Start typing..."* in `text-zinc-500 italic`.

**Photo viewer detail:**
- If `imageUrl` is empty/undefined, show a placeholder: 🖼️ icon + *"No image loaded"*
  centered in `text-zinc-500`.

### 2.4 Resize Handle

- Place a **resize grip** (`◢`) at the bottom-right corner of the window.
- The user drags it to resize the window **both horizontally and vertically**.
- Implement via native mouse events (`onMouseDown` → `onMouseMove` → `onMouseUp`) on the
  grip element.

---

## 3. Window Dragging (Move)

- **Implementation:** Use **native mouse events** (`mousedown` / `mousemove` / `mouseup`)
  on the Header Bar. Do **NOT** use `react-dnd` for window dragging — it is already
  occupied by grid sorting and will conflict.
- **Positioning:** `position: fixed` with `top` / `left` stored in state.
- **Initial position:** Centered in the viewport. Each subsequent window offsets by
  `+30px` right and `+30px` down (cascade effect) to prevent full overlap.
- **Viewport clamping:** The window must not be dragged outside the visible viewport.
  Clamp `top` / `left` so that at least the header bar remains accessible.

---

## 4. Window Resizing

- **Minimum size:** `1/6 of the viewport` in both width and height
  (`minWidth = window.innerWidth / 6`, `minHeight = window.innerHeight / 6`).
  Recalculate on `window.resize`.
- **Maximum size:** Full viewport (`100vw × 100vh`).
- **Implementation:** Native mouse events on the resize handle (bottom-right corner).
  During resize, update `width` / `height` in the window's state. Apply
  `will-change: width, height` for paint performance.
- **Cursor:** `cursor-nwse-resize` on the grip element.

---

## 5. Multi-Window Management

### 5.1 State Shape

Store in `App.tsx` alongside `folders` and `files`:

```ts
interface OpenWindow {
  fileId: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;
  isMinimized: boolean;
}

// In App state:
const [openWindows, setOpenWindows] = useState<OpenWindow[]>([]);
const zIndexCounter = useRef<number>(100);
```

### 5.2 Z-Index (Focus / Bring to Front)

- Clicking **anywhere** inside a window raises it to the top:
  `zIndexCounter.current += 1`, assign to that window.
- The topmost window has the highest `zIndex`.

### 5.3 Window Lifecycle Events

| Event | Action |
|---|---|
| File deleted (via context menu) | Auto-close its window if open |
| File renamed (via `EditFileModal`) | Update header title reactively (read from global `files` state) |
| File content changed (in window editor) | Sync to global `files` state (debounced) |
| Folder switched (sidebar click) | **Keep windows open** — they are independent of active folder |

---

## 6. Integration with File Creation Flow

Current behavior: clicking "Create file" in `FolderContentView` creates a `FileItem` and
activates inline name editing in the grid.

**Updated behavior:**
1. Create the `FileItem` (keep existing logic).
2. **Immediately** open a `FloatingFileWindow` for the new file.
3. For `type: "text"`: auto-focus the editor area so the user can start typing.
4. For `type: "photo"`: show the empty-image placeholder.
5. Inline name editing in the grid card can remain — renaming syncs to the window header
   via global state.

---

## 7. Styling Spec

| Element | Classes |
|---|---|
| Window container | `fixed bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden` |
| Header bar | `bg-zinc-800 px-3 py-2 flex items-center justify-between rounded-t-xl` |
| Header text | `text-sm font-medium text-zinc-300 truncate` |
| Content area | `p-4 overflow-auto` (scrollable if content exceeds height) |
| Resize grip | `absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize text-zinc-600 hover:text-zinc-400` |
| MD editor (textarea) | `bg-zinc-950 text-zinc-200 font-mono text-sm border border-zinc-700 rounded-lg p-3 resize-none w-full h-full` |
| MD preview | `prose prose-invert prose-sm max-w-none` (Tailwind Typography plugin, dark mode) |
| Appear animation | `transition-all duration-150` from `opacity-0 scale-95` to `opacity-100 scale-100` |

**Default window sizes:**

| Type | Width | Height |
|---|---|---|
| `"text"` | `560px` | `460px` |
| `"photo"` | `620px` | `520px` |

*(clamped to min 1/6 viewport on small screens)*

---

## 8. File Structure to Produce

```
src/app/components/
├── windows/
│   ├── WindowManager.tsx         # Renders all OpenWindow[] as FloatingFileWindow instances
│   ├── FloatingFileWindow.tsx    # Universal window shell (header + drag + resize + z-index)
│   ├── TextFileContent.tsx       # MD editor + preview (split/tab)
│   ├── ImageFileContent.tsx      # Image viewer
│   └── useWindowDrag.ts          # Custom hook: native drag logic for moving
│   └── useWindowResize.ts        # Custom hook: native resize logic
```

---

## 9. Edge Cases & Constraints

1. **No conflict with `react-dnd`:** Window dragging and resizing must use native mouse
   events only. Do not register any `react-dnd` drag sources or drop targets on window
   elements.
2. **Double-click vs. drag ambiguity:** In grid cards, distinguish between double-click
   (open window) and drag-start (reorder). Use a threshold: if mouse moves > 5px between
   `mousedown` and `mouseup`, treat as drag, not click.
3. **Responsive min-size:** If viewport resizes and an open window becomes smaller than
   1/6, clamp it. If window position goes out of bounds, reposition to nearest valid
   coordinates.
4. **Memory:** Limit max open windows to **8**. If user tries to open a 9th, show a
   toast/notification: *"Close a window before opening another"*.
5. **Text save reliability:** On `beforeunload`, trigger a final save of any dirty text
   buffers to state.
6. **Do not break** existing features: sidebar DnD, grid DnD, breadcrumbs, context menus,
   `EditFolderModal`, `EditFileModal`, `customOrder` persistence.

---

## 10. Deliverables

1. All files listed in Section 8.
2. Updated `App.tsx` with `openWindows` state and handler functions (`handleOpenWindow`,
   `handleCloseWindow`, `handleUpdateWindowPosition`, `handleUpdateWindowSize`,
   `handleBringToFront`).
3. Updated `FolderContentView.tsx` with `onDoubleClick` on file cards and auto-open on
   file creation.
4. Brief inline comments (`// ...`) explaining non-obvious logic (drag clamping, debounce
   save, z-index management).

Confirm understanding, then implement all points sequentially.
```