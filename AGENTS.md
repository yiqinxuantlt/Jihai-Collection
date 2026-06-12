# AGENTS.md

This project is a desktop-first web app for managing reading essays, excerpts, notes, and personal knowledge organization. It is not an online ebook reader. The core workflows are managing books, collecting excerpts, writing essays or reflections from those excerpts, and organizing ideas by tags, books, favorites, and timeline.

## UI Development Rules

- Before any UI change, read `DESIGN.md` from the project root and follow its product tone, layout, color, typography, component, and interaction guidance.
- Keep the interface aligned with a quiet, restrained knowledge-workbench feel: Notion-like softness, Mintlify-like reading comfort, and Linear-like desktop precision.
- Prefer a desktop three-column layout:
  - Left: bookshelf, tags, favorites, timeline.
  - Middle: books, excerpts, and essay/note lists.
  - Right: excerpt detail or essay editor.
- Preserve the editor as the highest-priority surface. Avoid marketing-page hero layouts, social-media feeds, loud visual decoration, strong neon colors, heavy gradients, and complex glassmorphism.

## Code Organization

- Keep UI work componentized. Do not pile all new behavior and markup into one large file.
- When changing UI, split responsibilities into focused units where the project structure allows it: layout, navigation, lists, editor, metadata panel, shared controls, and state helpers should remain understandable independently.
- Follow existing patterns first, but if a file becomes too large during a UI change, prefer a small, targeted extraction over adding more unrelated logic to it.
- Do not introduce a framework, build system, or large dependency just to reorganize UI unless the user explicitly asks for it.

## Checks

- If `package.json` exists after a change, run the available project checks where applicable, such as `npm run build`, `npm run lint`, or `npm test`.
- If those commands do not exist, do not add complex tooling only to satisfy a check. State clearly which command was not run and why.
- If no `package.json` exists, use the existing lightweight checks when relevant, such as the Node test file under `tests/`.
- For documentation-only changes, no UI runtime verification is required unless the user asks for it.

## Completion

- Every completed task should end with a git commit.
- Keep commits focused on the requested scope.
- Do not modify actual UI code when the user asks only for documentation or planning files.
