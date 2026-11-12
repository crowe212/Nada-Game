#!/usr/bin/env python3
"""Bundle www/ into one self-contained HTML file (fonts, styles and script inlined).
Usage: python3 tools/make-single-file.py OUTPUT.html
Useful for hosts that only take a single page."""
import base64, re, sys, pathlib
root = pathlib.Path(__file__).resolve().parent.parent / 'www'
css = (root / 'style.css').read_text()
def font(m):
    data = base64.b64encode((root / m.group(1)).read_bytes()).decode()
    return f'url(data:font/woff2;base64,{data})'
css = re.sub(r'url\((fonts/[^)]+)\)', font, css)
css = css.replace('height: 100vh;\n  height: 100dvh;', 'height: 100%;')
css = ':root { color-scheme: dark; height: 100%; box-sizing: border-box; }\n' + css
js = (root / 'game.js').read_text()
js = re.sub(r"\n  // Offline support.*?\n  }\n", "\n", js, flags=re.S)
body = re.search(r'<body>(.*)<script src="game.js"></script>', (root / 'index.html').read_text(), re.S).group(1)
out = f'<title>Coast to Coast</title>\n<style>\n{css}</style>\n{body}<script>\n{js}</script>\n'
pathlib.Path(sys.argv[1]).write_text(out)
print(len(out), 'bytes')
