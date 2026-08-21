import model as M
C=M.C; W,H=M.W,M.H
byid={b["id"]:b for b in M.BOX}

STYLE={
 "title":   dict(fill="#eef4ff",  stroke="#1d4ed8",  tc="#12234a", sc="#3b5a86"),
 "phase":   dict(fill="#ffffff",  stroke=C["brand"], tc=C["brand"], sc=C["ink2"]),
 "tool":    dict(fill=C["toolBg"],stroke=C["tool"],  tc=C["tool"],  sc=C["ink2"]),
 "toolsub": dict(fill="#ffffff",  stroke=C["line"],  tc=C["ink"],   sc=C["ink2"]),
 "data":    dict(fill=C["dataBg"],stroke=C["data"],  tc=C["data"],  sc=C["ink2"]),
 "datasub": dict(fill="#ffffff",  stroke=C["line"],  tc=C["ink"],   sc=C["ink2"]),
 "run":     dict(fill=C["brand50"],stroke=C["brand"],tc=C["brandD"],sc=C["ink2"]),
 "reset":   dict(fill="#fdecec",  stroke=C["boundary"],tc=C["boundary"],sc=C["ink2"]),
 "note":    dict(fill="#f8fafc",  stroke=C["line"],  tc=C["ink"],   sc=C["ink2"]),
}
def esc(s): return s.replace("&","&amp;").replace("<","&lt;").replace(">","&gt;")

out=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" font-family="Segoe UI, Arial, sans-serif">']
out.append(f'<rect width="{W}" height="{H}" fill="#f4f6f9"/>')

# arrow marker
out.append('<defs><marker id="arw" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto">'
           '<path d="M0,0 L7,3 L0,6 Z" fill="#64748b"/></marker>'
           '<marker id="arwR" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto">'
           '<path d="M0,0 L7,3 L0,6 Z" fill="#b45309"/></marker></defs>')

# trust boundary (dashed vertical between the two panels)
bx=(byid["toolPanel"]["x"]+byid["toolPanel"]["w"]+byid["dataPanel"]["x"])/2
out.append(f'<line x1="{bx}" y1="222" x2="{bx}" y2="742" stroke="{C["boundary"]}" stroke-width="2" stroke-dasharray="8 6"/>')
out.append(f'<g transform="translate({bx},214)"><rect x="-92" y="-18" width="184" height="26" rx="13" fill="#fdecec" stroke="{C["boundary"]}"/>'
           f'<text x="0" y="-1" text-anchor="middle" font-size="12" font-weight="700" fill="{C["boundary"]}">🔒 TRUST BOUNDARY</text></g>')

def wrap_text(x,y,lines,size,color,anchor="start",lh=None,weight="400"):
    lh=lh or size+4
    r=[]
    for i,ln in enumerate(lines):
        r.append(f'<text x="{x}" y="{y+i*lh}" font-size="{size}" fill="{color}" text-anchor="{anchor}" font-weight="{weight}">{esc(ln)}</text>')
    return "".join(r)

def draw_box(b):
    s=STYLE[b["kind"]]; x,y,w,h=b["x"],b["y"],b["w"],b["h"]
    rad=12 if b["kind"] in("title","tool","data","note") else 9
    o=[f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rad}" fill="{s["fill"]}" stroke="{s["stroke"]}" stroke-width="{2 if b["kind"] in("tool","data") else 1.3}"/>']
    tfs=b.get("tfs") or b["fs"]+2
    if b["kind"]=="title":
        o.append(f'<text x="{x+26}" y="{y+34}" font-size="21" font-weight="800" fill="{s["tc"]}">{esc(b["title"])}</text>')
        o.append(wrap_text(x+27,y+52,b["lines"],12.5,s["sc"]))
    elif b["kind"]=="phase":
        o.append(f'<circle cx="{x+18}" cy="{y+20}" r="10" fill="{C["brand"]}"/>')
        o.append(f'<text x="{x+18}" y="{y+24}" text-anchor="middle" font-size="11" font-weight="700" fill="#fff">{b["id"][-1] and str(int(b["id"][2:])+1)}</text>')
        o.append(f'<text x="{x+36}" y="{y+25}" font-size="{tfs}" font-weight="700" fill="{s["tc"]}">{esc(b["title"])}</text>')
        o.append(wrap_text(x+16,y+45,b["lines"],10.5,s["sc"]))
    elif b["kind"] in("tool","data"):
        o.append(f'<text x="{x+22}" y="{y+30}" font-size="{tfs}" font-weight="800" fill="{s["tc"]}">{esc(b["title"])}</text>')
        o.append(wrap_text(x+22,y+50,b["lines"],11.5,s["sc"]))
    elif b["kind"] in("run","reset"):
        o.append(wrap_text(x+w/2,y+ (30 if "\n" in b["title"] else 42),b["title"].split("\n"),b["fs"],s["tc"],"middle",lh=16,weight="700"))
    else:
        o.append(f'<text x="{x+16}" y="{y+25}" font-size="{tfs}" font-weight="700" fill="{s["tc"]}">{esc(b["title"])}</text>')
        o.append(wrap_text(x+16,y+45,b["lines"],b["fs"],s["sc"],lh=b["fs"]+5.5))
    return "".join(o)

# edges first (under boxes)
def anchor_pts(a,b):
    A,B=byid[a],byid[b]
    ax,ay=A["x"]+A["w"]/2,A["y"]+A["h"]/2
    bx2,by=B["x"]+B["w"]/2,B["y"]+B["h"]/2
    # horizontal neighbours
    if abs(ay-by)<40 and B["x"]>A["x"]:
        return (A["x"]+A["w"],ay,B["x"],by)
    if abs(ay-by)<40 and B["x"]<A["x"]:
        return (A["x"],ay,B["x"]+B["w"],by)
    # vertical
    if by>ay: return (ax,A["y"]+A["h"],bx2,B["y"])
    return (ax,A["y"],bx2,B["y"]+B["h"])

edge_svg=[]
for a,b,label,style in M.EDGE:
    x1,y1,x2,y2=anchor_pts(a,b)
    if style=="cross":
        col=C["data"]; mk="arwR"; dash='stroke-dasharray="6 4"'
    else:
        col="#64748b"; mk="arw"; dash=""
    edge_svg.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{col}" stroke-width="1.8" marker-end="url(#{mk})" {dash}/>')
    if label:
        mx,my=(x1+x2)/2,(y1+y2)/2-4
        edge_svg.append(f'<rect x="{mx-18}" y="{my-12}" width="36" height="16" rx="8" fill="#fff" stroke="{col}"/><text x="{mx}" y="{my}" text-anchor="middle" font-size="10" font-weight="700" fill="{col}">{esc(label)}</text>')
out+=edge_svg
for b in M.BOX: out.append(draw_box(b))
out.append("</svg>")
open("architecture.svg","w",encoding="utf-8").write("\n".join(out))
print("architecture.svg written")
