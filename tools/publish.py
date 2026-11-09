#!/usr/bin/env python3
"""Publish Reflections to the framoid.com site (Framoid).

Usage:
  python3 tools/publish.py add PATH/TO/reflection.json   # add or replace one Reflection
  python3 tools/publish.py remove SLUG                   # take one Reflection off the site
  python3 tools/publish.py rebuild                       # check and re-render every page from template/index.html
  python3 tools/publish.py inbox                         # publish every inbox/*.json, then remove it (used by GitHub Actions)

Each Reflection lives in r/<slug>/ as index.html (the template, with its own <title>)
plus reflection.json (the content, unchanged). The slug is the Reflection's "number",
lower-cased ("7", "sample"). The home page (index.html, also rendered from the template) and Explore
(explore/index.html) read reflections.json, which this script rebuilds from the folders in r/.
"""
import json, re, shutil, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TEMPLATE = ROOT / "template" / "index.html"
R = ROOT / "r"
GODS = ["rodim", "aromi", "mir", "ora", "idrom", "doria"]


def slug_of(data):
    s = re.sub(r"[^a-z0-9-]+", "-", str(data.get("number", "")).strip().lower()).strip("-")
    if not s:
        sys.exit("reflection.json has no 'number'")
    return s


def title_of(data):
    n = str(data.get("number", "")).strip()
    t = (data.get("subject") or {}).get("title", "").strip()
    head = "Framoid Reflection" if n.lower() == "sample" else f"Framoid Reflection {n}"
    return f"{head}: {t}" if t else head


def check(data, name):
    """Refuse anything that is not a Reflection, so a bad paste cannot break the site."""
    problems = []
    if not isinstance(data, dict):
        sys.exit(f"{name}: not a JSON object")
    if not str(data.get("number", "")).strip():
        problems.append("no number")
    if not (data.get("subject") or {}).get("title"):
        problems.append("no subject.title")
    pairs = data.get("pairs") or {}
    for g in GODS:
        if not any(isinstance(p, dict) and isinstance(p.get(g), dict) and p[g].get("answer") for p in pairs.values()):
            problems.append(f"no Reading for {g}")
    if not (data.get("field") or {}).get("paragraphs"):
        problems.append("no field.paragraphs")
    if problems:
        sys.exit(f"{name}: not a Reflection ({', '.join(problems)})")


def render(folder):
    data = json.loads((folder / "reflection.json").read_text(encoding="utf-8"))
    tpl = TEMPLATE.read_text(encoding="utf-8")
    title = title_of(data).replace("&", "&amp;").replace("<", "&lt;")
    if "<title>Framoid Reflection</title>" not in tpl:
        sys.exit("template/index.html has no <title>Framoid Reflection</title> to replace")
    (folder / "index.html").write_text(tpl.replace("<title>Framoid Reflection</title>", f"<title>{title}</title>", 1), encoding="utf-8")
    return data


def stances(data):
    out = {}
    for pair in (data.get("pairs") or {}).values():
        for g in GODS:
            if isinstance(pair, dict) and isinstance(pair.get(g), dict) and pair[g].get("stance"):
                out[g] = pair[g]["stance"]
    return out


def render_home():
    """The home page is the same app as every Reflection page: it starts at the newest Reflection."""
    tpl = TEMPLATE.read_text(encoding="utf-8")
    (ROOT / "index.html").write_text(tpl.replace("<title>Framoid Reflection</title>", "<title>Framoid</title>", 1), encoding="utf-8")


def manifest():
    items = []
    for folder in sorted(p for p in R.iterdir() if (p / "reflection.json").exists()):
        d = json.loads((folder / "reflection.json").read_text(encoding="utf-8"))
        s = d.get("subject") or {}
        items.append({"slug": folder.name, "number": str(d.get("number", "")), "date": d.get("date", ""),
                      "title": s.get("title", ""), "statement": s.get("statement", ""), "stances": stances(d)})
    def key(i):
        return (i["date"], int(i["number"]) if i["number"].isdigit() else -1)
    items.sort(key=key, reverse=True)
    (ROOT / "reflections.json").write_text(json.dumps({"reflections": items}, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    return items


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    cmd = sys.argv[1]
    R.mkdir(exist_ok=True)
    if cmd == "add" and len(sys.argv) == 3:
        src = Path(sys.argv[2])
        data = json.loads(src.read_text(encoding="utf-8"))
        check(data, src.name)
        folder = R / slug_of(data)
        folder.mkdir(exist_ok=True)
        if src.resolve() != (folder / "reflection.json").resolve():
            shutil.copyfile(src, folder / "reflection.json")
        render(folder)
        print(f"published r/{folder.name}/")
    elif cmd == "remove" and len(sys.argv) == 3:
        folder = R / sys.argv[2]
        if not folder.exists():
            sys.exit(f"r/{sys.argv[2]} not found")
        shutil.rmtree(folder)
        print(f"removed r/{sys.argv[2]}/")
    elif cmd == "inbox":
        inbox = ROOT / "inbox"
        for src in sorted(inbox.glob("*.json")) if inbox.exists() else []:
            data = json.loads(src.read_text(encoding="utf-8"))
            check(data, src.name)
            folder = R / slug_of(data)
            folder.mkdir(exist_ok=True)
            shutil.copyfile(src, folder / "reflection.json")
            render(folder)
            src.unlink()
            print(f"published r/{folder.name}/ from inbox/{src.name}")
    elif cmd == "rebuild":
        # Pages can be edited in place on GitHub (Studio: Publish again), so check each one before rendering.
        for folder in sorted(p for p in R.iterdir() if (p / "reflection.json").exists()):
            name = f"r/{folder.name}/reflection.json"
            try:
                data = json.loads((folder / "reflection.json").read_text(encoding="utf-8"))
            except ValueError as e:
                sys.exit(f"{name}: not valid JSON ({e})")
            check(data, name)
            if slug_of(data) != folder.name:
                sys.exit(f"{name}: its number gives the slug '{slug_of(data)}', not '{folder.name}'")
            render(folder)
            print(f"rendered r/{folder.name}/")
    else:
        sys.exit(__doc__)
    render_home()
    print(f"{len(manifest())} Reflection(s) in reflections.json; home page rendered")


if __name__ == "__main__":
    main()
