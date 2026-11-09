#!/usr/bin/env python3
"""Copy tools/balance.js into every page that uses it (between <!-- balance:start --> and <!-- balance:end -->),
and keep the Studio's copy of the template in step. Run after changing balance.js or template/index.html."""
import pathlib, re
root = pathlib.Path(__file__).resolve().parent.parent
js = "\n".join((root / "tools" / f).read_text() for f in ["balance.js", "toolbar.js", "account.js"])
block = '<!-- balance:start --><script id="fb-balance">\n' + js + '</script><!-- balance:end -->'
for rel in ["template/index.html", "explore/index.html", "studio/app.html"]:
    p = root / rel
    s = p.read_text()
    new, n = re.subn(r"<!-- balance:start -->.*?<!-- balance:end -->", lambda m: block, s, flags=re.S)
    assert n == 1, f"{rel}: expected one balance block, found {n}"
    p.write_text(new)
    print("synced", rel)
(root / "studio/template.html").write_text((root / "template/index.html").read_text())
print("copied template/index.html to studio/template.html")
