#!/usr/bin/env python3
"""Bundle dist/ into a single self-contained HTML file for device testing.

Usage: python3 scripts/make-standalone.py

Reads dist/index.html, inlines the built CSS/JS, and writes
~/workspace/glyphdance-standalone.html.

IMPORTANT: the inlined script MUST keep type="module". The bundle can contain
`import.meta` (Vite's asset-URL helper pulls it in whenever a dependency
references one), which is a SyntaxError in a classic script — the whole app
then fails to parse and the page renders as a black screen. This bit us on
2026-09-16 when the Astryx audit pulled in BottomSheet/ToggleButton.
"""

import pathlib
import re
import subprocess
import sys

REPO = pathlib.Path(__file__).resolve().parent.parent
OUT = pathlib.Path.home() / "workspace" / "glyphdance-standalone.html"


def main() -> None:
    dist = REPO / "dist"
    html = (dist / "index.html").read_text()
    css_files = sorted((dist / "assets").glob("*.css"))
    js_files = sorted((dist / "assets").glob("*.js"))
    if not css_files or not js_files:
        sys.exit("dist/ looks unbuilt — run `npm run build` first.")

    css = css_files[0].read_text()
    js = js_files[0].read_text()

    css_tag = re.search(r'<link[^>]*href="[^"]*\.css"[^>]*>', html)
    if not css_tag:
        sys.exit("no stylesheet link found in dist/index.html")
    html = html.replace(css_tag.group(0), "<style>\n" + css + "\n</style>")

    js_tag = re.search(r'<script[^>]*src="[^"]*\.js"[^>]*></script>', html)
    if not js_tag:
        sys.exit("no script src found in dist/index.html")
    # Keep type="module": the bundle may contain import.meta, which is a
    # SyntaxError in a classic script (black screen, no React).
    html = html.replace(js_tag.group(0), '<script type="module">\n' + js + "\n</script>")

    # Guardrails: the file must be self-contained and syntactically valid.
    assert "/assets/" not in html, "un-inlined /assets/ reference remains"
    assert '<script type="module">' in html, "module script tag missing"

    probe = REPO / ".standalone-probe.mjs"
    probe.write_text(js)
    try:
        subprocess.run(
            ["node", "--check", str(probe)], check=True, capture_output=True
        )
    finally:
        probe.unlink()

    OUT.write_text(html)
    print(f"wrote {OUT} ({len(html)} bytes)")


if __name__ == "__main__":
    main()
