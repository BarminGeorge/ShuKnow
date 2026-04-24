import { describe, expect, it } from "vitest";
import type { Folder, FileItem } from "../../../../../api/types";
import type { GridItem } from "../../types";
import {
  buildFolderContentReorderPlan,
  buildGridItems,
} from "../order";

const makeFolder = (id: string, sortOrder: number): Folder => ({
  id,
  name: id,
  description: "",
  sortOrder,
  fileCount: 0,
  subfolders: [],
});

const makeFile = (id: string, folderId: string, sortOrder: number): FileItem => ({
  id,
  name: `${id}.txt`,
  folderId,
  contentType: "text/plain",
  sizeBytes: 0,
  sortOrder,
});

describe("folder content order helpers", () => {
  it("builds grid items in mixed persisted sort order", () => {
    const folder: Folder = {
      ...makeFolder("parent", 0),
      subfolders: [
        makeFolder("folder-1", 1),
        makeFolder("folder-2", 3),
      ],
    };
    const files = [
      makeFile("file-1", "parent", 2),
      makeFile("file-2", "parent", 0),
    ];

    expect(buildGridItems(folder, files).map((item) => item.id)).toEqual([
      "file-2",
      "folder-1",
      "file-1",
      "folder-2",
    ]);
  });

  it("uses mixed grid positions for file reorder operations", () => {
    const gridItems: GridItem[] = [
      { id: "folder-2", type: "folder", data: makeFolder("folder-2", 1), order: 0 },
      { id: "file-1", type: "file", data: makeFile("file-1", "parent", 0), order: 1 },
      { id: "folder-1", type: "folder", data: makeFolder("folder-1", 0), order: 2 },
      { id: "file-2", type: "file", data: makeFile("file-2", "parent", 2), order: 3 },
    ];

    expect(buildFolderContentReorderPlan(gridItems, [
      makeFolder("folder-1", 0),
      makeFolder("folder-2", 1),
    ])).toEqual({
      folders: [
        { id: "folder-2", position: 0 },
        { id: "folder-1", position: 1 },
      ],
      files: [
        { id: "file-1", position: 1 },
        { id: "file-2", position: 3 },
      ],
    });
  });

  it("does not reorder folders when only file positions changed", () => {
    const gridItems: GridItem[] = [
      { id: "file-1", type: "file", data: makeFile("file-1", "parent", 0), order: 0 },
      { id: "folder-1", type: "folder", data: makeFolder("folder-1", 1), order: 1 },
      { id: "file-2", type: "file", data: makeFile("file-2", "parent", 2), order: 2 },
    ];

    expect(buildFolderContentReorderPlan(gridItems, [makeFolder("folder-1", 1)])).toEqual({
      folders: [],
      files: [],
    });
  });
});
