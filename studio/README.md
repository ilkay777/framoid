# Framoid Studio (source)

The Studio is a claude.ai artifact: https://claude.ai/artifact/XE2asYKpzc8BVdZ13UYnEx (slug f4c3ce13-060d-4e0a-a1a7-791c4f54a545).
It only works inside claude.ai; this folder is its source, kept here for history.

The artifact is ONE self-contained file (separate files failed to load in some claude.ai views).
- `app.html`: the Studio app (shaping chat, writing, revising, publishing handoff), with an empty `studio-files` block.
- `rules.md`: the Pantheon rules sent to Claude with every call. Keep it in step with PANTHEON_CONCEPT_EN.md and the project instructions.
- `shape.json`: the sample Reflection without number/date/schema, used as the shape example.
- `build.py`: inlines rules.md, shape.json and template.html into app.html, writing index.html.

To republish: `cp ../template/index.html template.html && python3 build.py`, then publish only `index.html` to the artifact (mode replace). Do not commit the generated index.html or template.html.

Capabilities: `sample` (Claude on the viewer's plan) and `db` with rule `{path: "", read: "owner", write: "owner"}`.
Data: collection `reflections`, one document per session: id, status (shaping | written | sent), number, turns, proposal, reflection, revisions, timestamps.
