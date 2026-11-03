# Framoid Studio (source)

The Studio is a claude.ai artifact: https://claude.ai/artifact/XE2asYKpzc8BVdZ13UYnEx (slug f4c3ce13-060d-4e0a-a1a7-791c4f54a545).
It only works inside claude.ai; this folder is its source, kept here for history.

Files published to the artifact:
- `index.html`: the Studio app (shaping chat, writing, revising, publishing handoff).
- `rules.md`: the Pantheon rules sent to Claude with every call. Keep it in step with PANTHEON_CONCEPT_EN.md and the project instructions.
- `shape.json`: the sample Reflection without number/date/schema, used as the shape example.
- `template.html`: not stored here; it is `../template/index.html` published under that name.

Capabilities: `sample` (Claude on the viewer's plan) and `db` with rule `{path: "", read: "owner", write: "owner"}`.
Data: collection `reflections`, one document per session: id, status (shaping | written | sent), number, turns, proposal, reflection, revisions, timestamps.
