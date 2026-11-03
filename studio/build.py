#!/usr/bin/env python3
"""Build the published Studio page: app.html with rules.md, shape.json and template.html inlined."""
import json, pathlib
d = pathlib.Path(__file__).resolve().parent
files = {"rules": (d/"rules.md").read_text(), "shape": (d/"shape.json").read_text(), "template": (d/"template.html").read_text()}
blob = json.dumps(files, ensure_ascii=False).replace("<", "\\u003c")
app = (d/"app.html").read_text()
marker = '<script id="studio-files" type="application/json">{}</script>'
assert marker in app
(d/"index.html").write_text(app.replace(marker, f'<script id="studio-files" type="application/json">{blob}</script>'))
print("built index.html", len(blob), "bytes of inlined files")
