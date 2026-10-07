"""Build index.html (the GitHub Pages file) from tools/index.template.html and data/wiki_data.json.
The template is a fragment (title, fonts, style, body, script). Pages needs a full document, so this adds the doctype,
charset, viewport and the small reset the artifact host normally supplies. Run from the repo root."""
import json
t=open('tools/index.template.html',encoding='utf8').read()
d=open('data/wiki_data.json',encoding='utf8').read()
i=t.index('</style>')+len('</style>')
head,body=t[:i],t[i:]
reset='''<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<style>:root{color-scheme:light}body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style>
'''
html='<!doctype html>\n<html lang="en">\n<head>\n'+reset+head+'\n</head>\n<body>'+body.replace('__DATA__',d)+'\n</body>\n</html>\n'
open('index.html','w',encoding='utf8').write(html)
print(len(html))
