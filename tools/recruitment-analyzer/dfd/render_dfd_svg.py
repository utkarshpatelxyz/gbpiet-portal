import model_dfd as M
C=M.C; W,H=M.W,M.H; byid=M.byid
def esc(s): return str(s).replace("&","&amp;").replace("<","&lt;").replace(">","&gt;")
O=[f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" font-family="Segoe UI,Arial,sans-serif">']
O.append(f'<rect width="{W}" height="{H}" fill="#ffffff"/>')
O.append('<defs><marker id="a" markerWidth="8" markerHeight="8" refX="6.5" refY="3" orient="auto">'
         f'<path d="M0,0 L6.5,3 L0,6 Z" fill="{C["az"]}"/></marker></defs>')

def wrap(s,n):
    words=s.split(); lines=[]; cur=""
    for w in words:
        if len(cur)+len(w)+1<=n: cur=(cur+" "+w).strip()
        else: lines.append(cur); cur=w
    if cur: lines.append(cur)
    return lines[:3]

def text_block(x,y,w,h,s,size=12.5,col=None,weight="400",anchor="middle"):
    col=col or C["ink"]; ls=wrap(s,int(w/ (size*0.56)))
    tot=len(ls)*(size+3); sy=y+h/2-tot/2+size
    tx = x+w/2 if anchor=="middle" else x+10
    return "".join(f'<text x="{tx}" y="{sy+i*(size+3)}" font-size="{size}" fill="{col}" text-anchor="{anchor}" font-weight="{weight}">{esc(l)}</text>' for i,l in enumerate(ls))

def glyph(gx,gy,kind,s=30):
    r=s*0.18
    if kind=="XLS": return f'<g><rect x="{gx}" y="{gy}" width="{s}" height="{s}" rx="4" fill="{C["green"]}"/><text x="{gx+s/2}" y="{gy+s*0.68}" font-size="{s*0.5}" fill="#fff" text-anchor="middle" font-weight="800">X</text></g>'
    if kind=="PDF": return f'<g><rect x="{gx}" y="{gy}" width="{s}" height="{s}" rx="4" fill="{C["red"]}"/><text x="{gx+s/2}" y="{gy+s*0.63}" font-size="{s*0.32}" fill="#fff" text-anchor="middle" font-weight="800">PDF</text></g>'
    if kind=="AI":  return f'<g><rect x="{gx}" y="{gy}" width="{s}" height="{s}" rx="4" fill="{C["ai"]}"/><text x="{gx+s/2}" y="{gy+s*0.64}" font-size="{s*0.42}" fill="#fff" text-anchor="middle" font-weight="800">AI</text></g>'
    if kind=="INHOUSE": return (f'<g><rect x="{gx}" y="{gy}" width="{s}" height="{s}" rx="6" fill="{C["inhouse"]}"/>'
        f'<path d="M{gx+s*0.5},{gy+s*0.28} L{gx+s*0.76},{gy+s*0.52} L{gx+s*0.68},{gy+s*0.52} L{gx+s*0.68},{gy+s*0.74} L{gx+s*0.32},{gy+s*0.74} L{gx+s*0.32},{gy+s*0.52} L{gx+s*0.24},{gy+s*0.52} Z" fill="#fff"/></g>')
    if kind=="gearsoft": return f'<circle cx="{gx+s/2}" cy="{gy+s/2}" r="{s*0.42}" fill="none" stroke="{C["green"]}" stroke-width="3"/><circle cx="{gx+s/2}" cy="{gy+s/2}" r="{s*0.14}" fill="{C["green"]}"/>'
    return ""

def person(n):
    x,y,w,h=n["x"],n["y"],n["w"],n["h"]; cx=x+w/2; co=C["coral"]
    hr=w*0.32
    return (f'<circle cx="{cx}" cy="{y+hr}" r="{hr}" fill="{co}"/>'
            f'<path d="M{x},{y+h} Q{x},{y+hr*1.6} {cx},{y+hr*1.6} Q{x+w},{y+hr*1.6} {x+w},{y+h} Z" fill="{co}"/>')

def draw(n):
    t=n["t"]; x,y,w,h=n["x"],n["y"],n["w"],n["h"]; g=[]
    if t=="title":
        g.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="6" fill="{C["grey"]}"/>')
        g.append(f'<text x="{x+22}" y="{y+h/2+7}" font-size="20" font-weight="800" fill="{C["htxt"]}">{esc(n["label"])}</text>')
    elif t=="band":
        g.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="5" fill="{C["grey"]}"/>')
        g.append(f'<text x="{x+w/2}" y="{y+h/2+5}" font-size="13.5" font-weight="700" fill="{C["htxt"]}" text-anchor="middle">{esc(n["label"])}</text>')
    elif t=="term":
        r=h/2+5; pill_x=x+r
        g.append(f'<rect x="{pill_x}" y="{y}" width="{w-r}" height="{h}" rx="{h/2}" fill="{C["azMed"]}"/>')
        g.append(f'<circle cx="{x+r}" cy="{y+h/2}" r="{r}" fill="{C["circ"]}"/>')
        g.append(text_block(pill_x,y,w-r,h,n["label"],12,"#0d2a3a","600"))
    elif t=="proc":
        tab=42
        g.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="6" fill="{C["azLt"]}"/>')
        g.append(f'<path d="M{x+6},{y} L{x+tab},{y} L{x+tab},{y+h} L{x+6},{y+h} Q{x},{y+h} {x},{y+h-6} L{x},{y+6} Q{x},{y} {x+6},{y} Z" fill="{C["azMed"]}"/>')
        g.append(text_block(x+tab,y,w-tab,h,n["label"],11.5,"#0d2a3a","600"))
    elif t=="soft":
        notch=40
        g.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="8" fill="{C["azVlt"]}"/>')
        g.append(f'<path d="M{x+w-notch},{y-4} L{x+w},{y-4} Q{x+w+8},{y-4} {x+w+2},{y+h*0.5} L{x+w-notch+4},{y+h*0.5} Z" fill="{C["az"]}"/>')
        g.append(text_block(x,y,w-14,h,n["label"],11.5,"#0d2a3a","600"))
    elif t=="out":
        sk=16; bar=30
        g.append(f'<path d="M{x+sk},{y} L{x+w},{y} L{x+w-sk},{y+h} L{x},{y+h} Z" fill="#fff" stroke="{C["line"]}"/>')
        g.append(f'<path d="M{x+sk},{y} L{x+sk+bar},{y} L{x+bar},{y+h} L{x},{y+h} Z" fill="{C["azMed"]}"/>')
        g.append(text_block(x+bar,y,w-bar-sk,h,n["label"],11,"#0d2a3a","600"))
    elif t=="person":
        g.append(person(n))
    elif t=="boundary":
        g.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="12" fill="none" stroke="{C["boundary"]}" stroke-width="2" stroke-dasharray="9 6"/>')
        g.append(f'<rect x="{x+18}" y="{y-13}" width="{len(n["label"])*6.4+18}" height="26" rx="13" fill="{C["note"]}" stroke="{C["boundary"]}"/>')
        g.append(f'<text x="{x+27}" y="{y+4}" font-size="11.5" font-weight="800" fill="{C["boundary"]}">🔒 {esc(n["label"])}</text>')
    elif t=="legend":
        k=n["kind"]; iy=y; ix=x
        # sample glyph/shape (~54 wide), then label
        sw=58
        if k in ("XLS","PDF","AI","INHOUSE","gearsoft"):
            g.append(glyph(ix+14,iy+5,k,30))
        elif k=="person":
            g.append(person(dict(x=ix+18,y=iy+4,w=24,h=30)))
        elif k=="proc":
            g.append(f'<rect x="{ix}" y="{iy+8}" width="{sw}" height="24" rx="4" fill="{C["azLt"]}"/><rect x="{ix}" y="{iy+8}" width="14" height="24" rx="3" fill="{C["azMed"]}"/>')
        elif k=="soft":
            g.append(f'<rect x="{ix}" y="{iy+8}" width="{sw}" height="24" rx="6" fill="{C["azVlt"]}"/><path d="M{ix+sw-14},{iy+8} L{ix+sw},{iy+8} Q{ix+sw+6},{iy+8} {ix+sw},{iy+20} L{ix+sw-16},{iy+20} Z" fill="{C["az"]}"/>')
        elif k=="out":
            g.append(f'<path d="M{ix+10},{iy+8} L{ix+sw},{iy+8} L{ix+sw-10},{iy+32} L{ix},{iy+32} Z" fill="#fff" stroke="{C["line"]}"/><path d="M{ix+10},{iy+8} L{ix+26},{iy+8} L{ix+16},{iy+32} L{ix},{iy+32} Z" fill="{C["azMed"]}"/>')
        elif k=="term":
            g.append(f'<rect x="{ix+16}" y="{iy+9}" width="{sw-16}" height="22" rx="11" fill="{C["azMed"]}"/><circle cx="{ix+16}" cy="{iy+20}" r="13" fill="{C["circ"]}"/>')
        elif k=="arrow":
            g.append(f'<line x1="{ix}" y1="{iy+20}" x2="{ix+sw}" y2="{iy+20}" stroke="{C["az"]}" stroke-width="2" marker-end="url(#a)"/>')
        elif k=="lock":
            g.append(f'<rect x="{ix}" y="{iy+8}" width="{sw}" height="24" rx="6" fill="none" stroke="{C["boundary"]}" stroke-width="1.6" stroke-dasharray="6 4"/><text x="{ix+sw/2}" y="{iy+25}" font-size="14" text-anchor="middle">🔒</text>')
        g.append(f'<text x="{ix+sw+16}" y="{iy+25}" font-size="12.5" fill="{C["ink"]}">{esc(n["label"])}</text>')
    return "".join(g)

def anchor(a,b):
    A,B=byid(a),byid(b); ay=A["y"]+A["h"]/2; by=B["y"]+B["h"]/2
    ax,bx=A["x"]+A["w"]/2,B["x"]+B["w"]/2
    if abs(ay-by)<28 and B["x"]>A["x"]: return (A["x"]+A["w"],ay,B["x"],by)
    if abs(ay-by)<28 and B["x"]<A["x"]: return (A["x"],ay,B["x"]+B["w"],by)
    if by>ay: return (ax,A["y"]+A["h"],bx,B["y"])
    return (ax,A["y"],bx,B["y"]+B["h"])

# boundary first (behind)
for n in M.NODES:
    if n["t"]=="boundary": O.append(draw(n))
# edges
for a,b,st in M.EDGES:
    x1,y1,x2,y2=anchor(a,b)
    O.append(f'<path d="M{x1},{y1} L{x1},{(y1+y2)/2} L{x2},{(y1+y2)/2} L{x2},{y2}" fill="none" stroke="{C["az"]}" stroke-width="1.7" marker-end="url(#a)"/>' if abs(x1-x2)>4 and abs(y1-y2)>4 else f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{C["az"]}" stroke-width="1.7" marker-end="url(#a)"/>')
# nodes (skip boundary already drawn)
for n in M.NODES:
    if n["t"]=="boundary": continue
    O.append(draw(n))
    # attached glyphs to the right of proc/soft boxes
    if n["glyphs"]:
        gx=n["x"]+n["w"]+ (14 if n["t"]!="soft" else 22); gy=n["y"]+n["h"]/2-15
        for i,k in enumerate(n["glyphs"]):
            O.append(glyph(gx+i*36,gy,k,30))
O.append("</svg>")
open("dfd.svg","w",encoding="utf-8").write("\n".join(O))
print("dfd.svg written")
