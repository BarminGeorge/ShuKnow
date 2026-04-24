# ShuKnow DESIGN.md

## 1. Visual Theme & Atmosphere

ShuKnow is a dark, focused workspace for collecting learning and personal materials through an AI chat. The interface should feel like a calm command center: almost-black surfaces, quiet borders, compact controls, and a restrained violet glow that marks the AI-assisted parts of the product.

The product screen is not a marketing page. It is a repeat-use tool with three primary zones: sidebar file system, central chat/folder/editor area, and bottom input console. Prioritize scanability, predictable navigation, and low visual noise. The user should always understand where they are: chat, folder, or editor.

The landing and auth pages use the same visual language but are more expressive: larger type, stronger centered composition, dark editorial spacing, and soft violet-to-sky gradient text. The authenticated app should stay denser and more utilitarian.

**Key Characteristics:**

- Dark-first UI built around `#080808`, `#0d0d0d`, `#101010`, and near-black gradients.
- Violet/indigo is the signature AI accent, used for primary actions, focus states, drop states, links, and agent identity.
- White borders are usually translucent (`white/7` to `white/10`) and combined with subtle inset highlights.
- Surfaces feel slightly dimensional through layered shadows, not through heavy elevation.
- Cards are functional objects: files, folders, messages, modals, auth panels, and attachment chips.
- The workspace is dense but breathable: compact sidebars and tabs, generous message width, stable grid cards.
- Icons come from `lucide-react`; use icons to clarify actions rather than adding explanatory UI text.

## 2. Color Palette & Roles

### Core Surfaces

- **App Black** (`#080808`): Root background for landing, auth, and main shell.
- **Workspace Black** (`#0d0d0d`): Sidebar, modal, and editor base surface.
- **Panel Black** (`#101010`): Inputs, raised panels, fallback image blocks, modal fields.
- **Card Black** (`#111111`): Feature/use-case cards and solid card surfaces.
- **Card Hover Black** (`#141414`): Hover state for dark cards.
- **Deep Ink** (`#171718` / `#181818` / `#1f1f21`): Gradient stops for chat bubbles, attachment strips, and input console.

### Text

- **Primary Text** (`#ffffff`, `rgb(244 244 245)`): Main headings, active labels, strong content.
- **Soft Primary** (`rgba(255,255,255,0.92)`): Folder/file names and high-priority card text.
- **Body Text** (`rgb(212 212 216)` / Tailwind `zinc-300`): Markdown and readable long-form content.
- **Secondary Text** (`rgb(156 163 175)` / `gray-400`): Descriptions, labels, nav links.
- **Muted Text** (`#717182`, `rgb(107 114 128)` / `gray-500`): Metadata, placeholders, inactive tabs.
- **Deep Muted** (`rgb(75 85 99)` / `gray-600`): Very quiet placeholders and helper text.

### Brand & AI Accent

- **Primary Indigo** (`#4f46e5`): Light-theme token and core primary semantic color.
- **Dark Primary Indigo** (`#6366f1`): Dark-theme primary token.
- **Violet Glow** (`rgba(167,139,250,0.85)` / `violet-300`): AI accents, links, focus emphasis, active icon color.
- **Violet Surface** (`rgba(76,29,149,0.26)`): Primary button gradient start.
- **Violet Border** (`rgba(221,214,254,0.12-0.30)`): Primary action borders, selected states, hover outlines.
- **Violet Drop State** (`rgba(139,92,246,0.05-0.14)`): Drag-and-drop overlays and upload focus rings.
- **Sky Accent** (`rgba(125,211,252,0.74)`, `sky-200/sky-300`): Secondary gradient stop and generic non-text file color.

### File-Type Accents

- **Folder Violet** (`rgba(76,29,149,0.13)`): Folder cards and folder-specific lines.
- **Text Indigo** (`rgba(67,56,202,0.14)`, `#818cf8`): Text, markdown, and note files.
- **PDF Rose** (`rgba(157,23,77,0.13)`, `rose-200`): PDF files and error-adjacent document styling.
- **Generic File Sky** (`rgba(3,105,161,0.13)`, `sky-200`): Other files.
- **Error Rose** (`#d4183d`, `rose-300/rose-500`): Errors, destructive feedback, failed processing.
- **Success Violet** (`violet-200`): Successful AI actions, saved states, completion icons.

### Borders, Rings, Overlays

- **Subtle Border** (`rgba(255,255,255,0.07)`): Default card, message, tab, and nav separator border.
- **Standard Border** (`rgba(255,255,255,0.08-0.10)`): Modal panels, auth cards, secondary buttons.
- **Hover Border** (`rgba(255,255,255,0.12-0.14)`): Secondary hover state.
- **Focus Border** (`rgba(221,214,254,0.18-0.28)`): Inputs and active controls.
- **Backdrop** (`rgba(0,0,0,0.75)`): Modal overlay with backdrop blur.
- **Tooltip** (`rgba(20,20,20,0.85)`): Tooltip background.

## 3. Typography Rules

### Font Family

- **Primary UI font**: system sans stack through Tailwind defaults.
- **Code and editor font**: `ui-monospace`, `SFMono-Regular`, `Menlo`, `Monaco`, `Consolas`, `monospace`.
- **Base size**: `16px`.
- **Default weights**: `400` for readable text, `500` for UI controls, `600-700` only for headings or strong marketing type.
- **Letter spacing**: keep at `0` by default. Use `tracking-tight` only for large landing headings where the existing UI already does it.

### Hierarchy

| Role | Size | Weight | Line Height | Usage |
| --- | --- | --- | --- | --- |
| Landing Hero Brand | `7xl-9xl` | `700` | `1.0` | `ShuKnow` on the landing page only |
| Landing Hero Claim | `5xl-7xl` | `700` | `1.1` | Large gradient marketing statement |
| Section Heading | `30-36px` | `700` | `1.2-1.3` | Landing sections |
| Workspace Title | `20px` | `600` | `1.5` | Sidebar brand, modal titles, page titles |
| Card Title | `18px` | `500` | `1.4` | File/folder names, compact cards |
| Body | `15-16px` | `400` | `1.6-1.75` | Chat text, descriptions, markdown body |
| UI Label | `14px` | `500` | `1.4-1.5` | Buttons, labels, tabs, nav |
| Metadata | `12-13px` | `400-600` | `1.3-1.5` | Dates, counts, file extensions, counters |
| Code | `14-15px` | `400` | `1.7-1.85` | Code blocks, editor, markdown code |

### Principles

- Use size and muted color for hierarchy before adding more weight.
- Keep workspace text compact; hero-scale typography belongs only on the landing page.
- Long-form markdown should read softly on dark backgrounds: `gray-300` body, white strong text, violet links.
- File and folder names must truncate cleanly; never allow card titles to resize or shift layouts.
- Uppercase is appropriate only for file extension badges and compact technical labels.

## 4. Component Stylings

### Buttons

**Primary / AI Action**

- Background: dark violet gradient, typically `linear-gradient(135deg, rgba(76,29,149,0.26), rgba(17,16,24,0.58) 60%, rgba(109,40,217,0.08))`.
- Text: `violet-100` to `violet-200`.
- Border: `1px solid rgba(221,214,254,0.12-0.18)`.
- Radius: `8px` for normal actions, `12px` for large landing CTA.
- Shadow: subtle inset white highlight plus low-opacity violet glow.
- Hover: stronger violet border, slightly brighter text, stronger glow.
- Use for: chat entry point, send/open-folder/retry/create-file, auth submit, main CTA.

**Secondary**

- Background: `white/[0.035-0.055]`.
- Text: `gray-300`, hover to `gray-100`.
- Border: `white/10`, hover to `white/14`.
- Radius: `8px`.
- Use for: create folder, settings, neutral modal actions, sidebar utilities.

**Icon Button**

- Size: `32-40px` square.
- Radius: `8px`.
- Background: transparent or `white/5`.
- Hover: `white/10` for neutral actions or `violet-500/10` for AI/primary actions.
- Always include an accessible `title` or `aria-label` for icon-only controls.

**Destructive / Error**

- Background: `rose-400/10`.
- Border: `rose-400/18` or `rose-500/30`.
- Text: `rose-300` or `rose-500`.
- Use only for validation, failed processing, and destructive confirmations.

### Cards & Containers

**Workspace File/Folder Cards**

- Fixed height: `180px`.
- Grid width: `repeat(auto-fill, minmax(280px, 1fr))`.
- Radius: `16px`.
- Padding: `28px 24px` equivalent.
- Border: translucent file-type accent (`violet`, `indigo`, `rose`, or `sky` at `10-20%`).
- Background: dark diagonal gradient with a subtle colored first stop and near-black final stop.
- Shadow: inset top highlight + `0 10px 26px rgba(0,0,0,0.16)`.
- Hover: `translateY(-1px)`, stronger border, slightly stronger shadow.

**Chat Messages**

- User bubbles: right aligned, max width `85%`, rounded `16px`, dark dimensional gradient, `white/[0.07]` border.
- Agent bubbles: full-width up to `5xl`, rounded `16px`, left accent line via violet gradient, circular Sparkles avatar.
- Message actions: small floating icon buttons below/near hover target; hidden until group hover.
- Attachments: horizontal strip, `220px` wide chips, thumbnail square `40px`, rounded `12px`.

**Input Console**

- Container radius: `16px`.
- Background: layered dark gradient from `#19191a` through `#161617` to `#111112`.
- Border: `white/[0.085]`, focus `violet-200/18`.
- Shadow: inset top highlight, inset bottom darkening, external dark elevation.
- On drag: shift to violet-tinted background, border `violet-200/26`, ring `violet-300/14`.
- Send and attach controls are icon buttons, not text buttons.

**Modals and Auth Panels**

- Radius: `16px` for product modals, `8px` for auth cards.
- Background: `#0d0d0d`.
- Border: `white/[0.08]`.
- Shadow: `0 24px 80px rgba(0,0,0,0.58)` plus inset top highlight.
- Headers/footers use `white/[0.07]` separators.
- Forms use dark fields with focus violet borders and no loud outlines.

### Inputs & Forms

- Height: `46px` for auth fields; flexible textareas for chat and prompts.
- Background: `#101010` or `white/[0.025]`.
- Border: `white/10`; focus `violet-300/28` or `violet-200/18`.
- Placeholder: `gray-600`.
- Text: `gray-100` to `gray-200`.
- Radius: `8px`.
- Avoid floating labels; use compact labels above fields.

### Navigation

- Landing nav: fixed, `#080808/82`, backdrop blur, bottom border `white/[0.07]`, logo left, auth link right, hamburger on mobile.
- Sidebar: fixed-width dark rail, `#0d0d0d`, vertical file-system navigation, collapsible to icon-only mode.
- Tab bar: `44px` high, `#0e0e0e`, compact horizontal scroll, active tab `white/10` with `white/10` ring.
- Breadcrumb/back controls should be compact, subdued, and icon-led.

### Editor & Markdown

- Code editor uses transparent dark background inside the editor pane.
- Code text: `#d4d4d4`, line height around `1.85`.
- Markdown preview uses `prose-invert`, violet links, subtle code backgrounds, and `#18181b` code block surfaces.
- Code blocks include compact copy/language controls in the top-right.

## 5. Layout Principles

### Workspace Structure

- Main app shell is full viewport height.
- Sidebar sits on the left and may collapse into an icon rail.
- Main content is a vertical stack: optional `TabBar`, active view, fixed bottom composer when in chat.
- Views are mutually clear:
  - `chat`: message stream plus bottom input console.
  - `folder`: folder header plus responsive grid of files/folders.
  - `editor`: tabbed editor/preview/file viewer.

### Spacing System

- Base unit: `4px`.
- Common gaps: `8px`, `12px`, `16px`, `24px`, `32px`.
- Product controls: compact, usually `8-12px` vertical padding.
- Landing sections: large vertical rhythm, `80-128px` between feature blocks.
- Modal body: `20-24px` padding, header/footer `16-24px`.

### Grid & Containers

- Chat content max width: `7xl` with generous side padding on desktop.
- Agent message max width: `5xl` inside the chat stream.
- Folder grid: auto-fill cards with minimum `280px`, gap `16px`.
- Cards and toolbars must use stable dimensions to avoid layout shift during hover, drag, or loading.
- Avoid nested card surfaces; major page regions are unframed full-width areas.

### Empty States

- Use a centered vertical stack.
- Icon/emoji container: `96px` circle.
- Primary empty-state action should be available without explanatory clutter.
- Drag-over empty states use violet ring and upload icon.

## 6. Depth & Elevation

| Level | Treatment | Use |
| --- | --- | --- |
| Flat | No shadow, pure dark background | Page shell, large content regions |
| Hairline | `1px` translucent white border | Nav, tab bar, separators, fields |
| Inset Highlight | `inset 0 1px 0 rgba(255,255,255,0.035-0.075)` | Buttons, cards, modals, input console |
| Card Lift | `0 10px 26px rgba(0,0,0,0.16-0.24)` | File cards, message bubbles, attachment chips |
| Composer Lift | `0 18px 46px rgba(0,0,0,0.34)` plus inset darkening | Chat input console |
| Modal Lift | `0 24px 80px rgba(0,0,0,0.58)` | Dialogs and auth panels |
| Accent Glow | `0 0 14-28px rgba(167,139,250,0.035-0.14)` | Primary, AI, focus, and drop states |

Depth should feel like glassy dark product chrome, not floating material cards. Keep shadows dark and low-opacity; let violet glow appear only around meaningful AI or active states.

## 7. Do's and Don'ts

### Do

- Use dark, near-black surfaces as the default.
- Use violet/indigo for AI identity, primary actions, links, focus, and active/drop states.
- Keep controls compact in the workspace; this is a tool users will live in.
- Use `lucide-react` icons for actions, file system controls, chat status, and navigation.
- Use file-type color accents consistently: folder violet, text indigo, PDF rose, generic sky.
- Keep card radii between `8px` and `16px`; use `16px` for file cards/message bubbles/composer, `8px` for buttons and compact fields.
- Make hover states subtle but tactile: border brightening, slight glow, `translateY(-1px)` on cards.
- Truncate long file/folder names and preserve stable card heights.
- Keep drag-and-drop feedback explicit with violet rings, overlays, and upload icons.

### Don't

- Don't introduce a bright or light workspace theme unless the full token system is updated.
- Don't use violet everywhere; it loses meaning if neutral controls also glow.
- Don't use large hero typography inside the authenticated app.
- Don't add decorative blobs, orbs, or broad gradients behind operational screens.
- Don't put cards inside cards; use cards for repeated items, dialogs, and real tool surfaces only.
- Don't rely on text instructions where an icon button or direct affordance is clearer.
- Don't use heavy shadows or saturated neon borders.
- Don't allow hover menus, action buttons, or badges to change card size.
- Don't create marketing-style layouts for `/app`; keep it dense and task-focused.

## 8. Responsive Behavior

| Breakpoint | Width | Behavior |
| --- | --- | --- |
| Mobile Small | `<400px` | Single-column layout, tighter padding, icon-led controls |
| Mobile | `400-640px` | Landing stacks vertically, nav collapses, auth cards full width |
| Tablet | `640-1024px` | Folder grid begins multi-column, landing feature blocks may still stack |
| Desktop | `1024-1400px` | Full sidebar + content, chat max-width containers active |
| Large Desktop | `>1400px` | Center content with max-width; do not stretch text lines indefinitely |

### Touch and Collapse Rules

- Icon buttons should remain at least `32x32px`; primary touch targets should be closer to `40px`.
- Sidebar may collapse to a `40px` icon rail with tooltips/titles.
- Tab bar scrolls horizontally; tabs have a max width around `180px`.
- Folder grid cards retain `180px` height and reflow by column count.
- Chat composer remains readable and should not cover the last message; reserve bottom padding based on composer height.
- Landing hero type scales down by breakpoint, but workspace type should not scale with viewport width.

## 9. Agent Prompt Guide

### Quick Color Reference

- App background: `#080808`.
- Workspace/sidebar/modal background: `#0d0d0d`.
- Input/panel background: `#101010`.
- Primary text: `#ffffff` / `gray-100`.
- Body text: `gray-300`.
- Muted text: `gray-400` to `gray-500`.
- Primary accent: `#6366f1`, `violet-300`, `rgba(167,139,250,0.85)`.
- Primary button gradient: `rgba(76,29,149,0.26)` to `rgba(17,16,24,0.58)` to `rgba(109,40,217,0.08)`.
- Default border: `rgba(255,255,255,0.07-0.10)`.
- Focus/drop border: `rgba(221,214,254,0.18-0.35)`.

### Example Component Prompts

- "Create a ShuKnow primary button: 8px radius, violet dark gradient, `violet-100` text, translucent violet border, inset top highlight, and a subtle violet glow on hover."
- "Create a file card for the folder grid: fixed 180px height, 16px radius, diagonal near-black gradient, file-type accent border, top extension badge, bottom filename and relative date, hover translate up 1px."
- "Create an agent message: max width `5xl`, rounded 16px, dark gradient surface, subtle white border, left violet accent line, circular Sparkles avatar, markdown content in `gray-300` with violet links."
- "Create a modal: centered on black/75 blurred backdrop, `#0d0d0d` panel, 16px radius, `white/[0.08]` border, 24px/80px dark shadow, header and footer separated by `white/[0.07]`."
- "Create an input console: rounded 16px, dark layered gradient, translucent border, inset highlights, attach icon button left, textarea center, violet send icon button right, drag-over violet ring."

### Iteration Guide

1. Start from the dark workspace shell and add surfaces only where they clarify a task.
2. Use neutral controls first; reserve violet for AI, primary actions, focus, and active states.
3. Keep repeated items stable in size: file cards, tabs, attachment chips, and icon buttons must not resize on hover.
4. Prefer existing Tailwind patterns from `src/app/components` and tokens from `src/styles/theme.css`.
5. When adding a new component, define default, hover, focus, disabled, loading, and error states in the same visual language.
