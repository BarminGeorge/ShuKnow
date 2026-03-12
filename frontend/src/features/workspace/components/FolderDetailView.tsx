import { useState, useMemo } from "react";
import { ArrowLeft, ChevronRight, LayoutGrid, List, ArrowUp, ArrowDown, FolderPlus, FilePlus } from "lucide-react";
import { FolderHeader } from "./FolderHeader";
import { FolderContentGrid } from "./FolderContentGrid";
import { useFileSystemStore } from "@/stores/fileSystemStore";
import { useUiStore } from "@/stores/uiStore";
import { generateFolderId, generateFileId } from "@/utils/fileHelpers";
import type { Folder, FolderId, SortField, SortDir } from "@/types";

interface FolderDetailViewProps {
  folderId: FolderId;
}

/** Build a flat lookup map from the folder tree */
function buildFlatMap(list: Folder[]): Map<FolderId, Folder> {
  const map = new Map<FolderId, Folder>();
  function traverse(items: Folder[]) {
    for (const f of items) {
      map.set(f.id, f);
      traverse(f.subfolders);
    }
  }
  traverse(list);
  return map;
}

/**
 * Returns the ancestor chain [root, …, parent, current] for the given folderId,
 * by traversing parentId links.
 */
function getAncestors(folderId: FolderId, folders: Folder[]): Folder[] {
  const map = buildFlatMap(folders);
  const chain: Folder[] = [];
  let current = map.get(folderId);
  while (current) {
    chain.unshift(current);
    if (!current.parentId) break;
    current = map.get(current.parentId);
  }
  return chain;
}

const SORT_LABELS: Record<SortField, string> = {
  name: "По имени",
  date: "По дате",
  type: "По типу",
};

export function FolderDetailView({ folderId }: FolderDetailViewProps) {
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const folders = useFileSystemStore((s) => s.folders);
  const updateFolder = useFileSystemStore((s) => s.updateFolder);
  const addFolder = useFileSystemStore((s) => s.addFolder);
  const addFile = useFileSystemStore((s) => s.addFile);
  const setRightPanel = useUiStore((s) => s.setRightPanel);

  const ancestors = useMemo(
    () => getAncestors(folderId, folders),
    [folderId, folders],
  );

  const folder = useMemo(() => {
    const map = buildFlatMap(folders);
    return map.get(folderId) ?? null;
  }, [folderId, folders]);

  // ── Folder not found ──────────────────────────────────────────────────────

  if (!folder) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[#0d0d0d] text-gray-400 gap-4">
        <p className="text-lg font-medium">Папка не найдена</p>
        <button
          type="button"
          onClick={() => setRightPanel({ type: "chat" })}
          className="flex items-center gap-2 px-4 py-2 bg-white/8 border border-white/15
            rounded-lg hover:bg-white/12 transition-colors text-sm text-gray-300"
        >
          <ArrowLeft size={16} />
          Назад
        </button>
      </div>
    );
  }

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleUpdate = (patch: Partial<Omit<Folder, "id">>) => {
    updateFolder(folderId, patch);
  };

  const handleCreateSubfolder = () => {
    const now = new Date().toISOString();
    addFolder({
      id: generateFolderId(),
      name: "Новая папка",
      description: "",
      parentId: folderId,
      iconEmoji: "📁",
      order: Date.now(),
      subfolders: [],
      createdAt: now,
      updatedAt: now,
    });
  };

  const handleCreateFile = () => {
    const now = new Date().toISOString();
    const newFileId = generateFileId();
    addFile({
      id: newFileId,
      name: "Новый файл.md",
      description: "",
      folderId,
      content: "",
      type: "markdown",
      mimeType: "text/markdown",
      size: 0,
      order: Date.now(),
      createdAt: now,
      updatedAt: now,
    });
    setRightPanel({ type: "file", fileId: newFileId });
  };

  const toggleSortDir = () =>
    setSortDir((d) => (d === "asc" ? "desc" : "asc"));

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col bg-[#0d0d0d] overflow-hidden">
      {/* ── Breadcrumb ── */}
      <nav
        aria-label="Навигация"
        className="flex items-center gap-1 px-6 py-2.5 border-b border-white/6 text-sm flex-shrink-0 min-w-0"
      >
        <button
          type="button"
          onClick={() => setRightPanel({ type: "chat" })}
          className="text-gray-500 hover:text-gray-300 transition-colors whitespace-nowrap"
        >
          Чат
        </button>

        {ancestors.map((ancestor, idx) => {
          const isLast = idx === ancestors.length - 1;
          return (
            <span key={ancestor.id} className="flex items-center gap-1 min-w-0">
              <ChevronRight size={13} className="text-gray-700 flex-shrink-0" />
              {isLast ? (
                <span className="text-gray-200 font-medium truncate">
                  {ancestor.iconEmoji && (
                    <span className="mr-1">{ancestor.iconEmoji}</span>
                  )}
                  {ancestor.name}
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() =>
                    setRightPanel({ type: "folder", folderId: ancestor.id })
                  }
                  className="text-gray-500 hover:text-gray-300 transition-colors truncate"
                >
                  {ancestor.iconEmoji && (
                    <span className="mr-1">{ancestor.iconEmoji}</span>
                  )}
                  {ancestor.name}
                </button>
              )}
            </span>
          );
        })}
      </nav>

      {/* ── Folder header (name, description, icon) ── */}
      <FolderHeader folder={folder} onUpdate={handleUpdate} />

      {/* ── Actions bar ── */}
      <div className="flex items-center justify-between px-6 py-2.5 border-b border-white/6 flex-shrink-0 gap-2">
        {/* Sort controls */}
        <div className="flex items-center gap-2">
          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value as SortField)}
            className="bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs
              text-gray-300 outline-none focus:border-white/20 transition-colors cursor-pointer"
          >
            {(Object.keys(SORT_LABELS) as SortField[]).map((f) => (
              <option key={f} value={f}>
                {SORT_LABELS[f]}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={toggleSortDir}
            title={sortDir === "asc" ? "По возрастанию" : "По убыванию"}
            className="p-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10
              transition-colors text-gray-400 hover:text-gray-200"
          >
            {sortDir === "asc" ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
          </button>
        </div>

        {/* Right: view toggle + create buttons */}
        <div className="flex items-center gap-2">
          {/* View mode */}
          <div className="flex items-center bg-white/5 border border-white/10 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              title="Сетка"
              className={`p-1.5 transition-colors ${
                viewMode === "grid"
                  ? "bg-white/15 text-white"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <LayoutGrid size={14} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              title="Список"
              className={`p-1.5 transition-colors ${
                viewMode === "list"
                  ? "bg-white/15 text-white"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <List size={14} />
            </button>
          </div>

          {/* Create folder */}
          <button
            type="button"
            onClick={handleCreateSubfolder}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-300
              bg-white/5 border border-white/10 rounded-lg hover:bg-white/10
              hover:border-white/20 transition-colors whitespace-nowrap"
          >
            <FolderPlus size={13} />
            Папка
          </button>

          {/* Create file */}
          <button
            type="button"
            onClick={handleCreateFile}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-300
              bg-white/5 border border-white/10 rounded-lg hover:bg-white/10
              hover:border-white/20 transition-colors whitespace-nowrap"
          >
            <FilePlus size={13} />
            Файл
          </button>
        </div>
      </div>

      {/* ── Content grid ── */}
      <div className="flex-1 overflow-y-auto p-6">
        <FolderContentGrid
          folderId={folderId}
          sortField={sortField}
          sortDir={sortDir}
          viewMode={viewMode}
        />
      </div>
    </div>
  );
}
