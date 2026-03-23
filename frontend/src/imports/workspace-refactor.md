# Role
You are a Senior React/TypeScript Developer and UI/UX Expert specializing in building desktop-grade web applications with complex state management and Tailwind CSS.

# Context
We are developing "ShuKnow", a dark-mode, AI-powered knowledge management web app. Currently, the main workspace toggles between an AI Chat view and a Folder Content view. 
We recently implemented a file editing system using floating windows with a split-pane Markdown editor (input on the left, preview on the right). 
**The Problem:** The floating windows and split-pane approach feel too cluttered. We want to pivot to a focused, unified editing experience heavily inspired by Obsidian.

# Task
Refactor the current floating window Markdown editor into a centralized, tabbed workspace within the main right-hand layout area. 

# Detailed Requirements

## 1. Tabbed Workspace (Obsidian Style)
- Completely remove the floating window logic (dragging, resizing, z-index, etc.).
- When a user double-clicks a file from the Folder View (or clicks a file in the sidebar), it should open in the Main Workspace as a **Tab**.
- Create a **Top Tab Bar** (stack of open files) at the top of the main workspace.
- Each tab should display the file name, an icon, and a small "x" button to close it.
- Implement active/inactive tab styling using our existing dark mode Tailwind palette (e.g., active tab matches the editor background, inactive tabs are slightly dimmed).
- Support switching between multiple open files by clicking their respective tabs.

## 2. Unified Editor (Single Pane)
- Completely remove the split-pane (edit/preview) view.
- The editor must be a **single, unified pane** taking up the full width and height under the tab bar.
- If we are using a standard textarea, style it beautifully with a maximum reading width (e.g., `max-w-3xl mx-auto`) and large typography, similar to Obsidian's distraction-free mode.
- *Note: Do not implement a complex WYSIWYG library from scratch right now, just ensure the UI layout is a single pane focused purely on the content.*

## 3. Navigation: "Back to Chat / Folders"
- Add a clear UI mechanism to exit the Editor Workspace and return to the primary AI Chat / Folder view.
- **Implementation:** 
  - Add a persistent "← Back to Chat" ghost-button on the far left of the Tab Bar, OR
  - Automatically revert the main workspace to the AI Chat view when the last open tab is closed.

## 4. State Management Refactoring
- Refactor the existing floating window state (which probably stores x/y coordinates, width/height) into a simpler `openTabs` array and `activeTabId` state.
- Keep the existing auto-save logic (800ms debounce, save on blur/unmount) intact for the active tab.

# Technical Constraints & Parameters
- **Tech Stack:** React, TypeScript, Tailwind CSS.
- **Styling:** Strict Dark Mode. Use neutral grays (e.g., `bg-gray-900` for background, `bg-gray-800` for UI elements).
- **Code Quality:** Ensure strict TypeScript typing for the new Tab interfaces. Clean up unused floating window components and hooks to avoid technical debt.

# Expected Output
Please provide the updated code for:
1. The new Tab Bar component.
2. The refactored Single-Pane Editor component.
3. The updated Main Workspace / Layout component that handles the conditional rendering (Chat vs. Folder View vs. Tabbed Editor).
4. Any updated state management hooks/contexts.