# ============================================================================
# VSDX emitter for the Recruitment DFD, in the department's style.
# Built from two primitives: txtbox() (rounded rect + centered text) and
# poly() (filled polygon, no text). One model → valid Visio drawing.
# ============================================================================
import importlib,sys,zipfile,html
M=importlib.import_module(sys.argv[1] if len(sys.argv)>1 else 'model_framework')
C=M.C; PT=72.0; PW_IN,PH_IN=M.W/PT,M.H/PT
def ix(v): return round(v/PT,4)
def iy(v): return round(PH_IN - v/PT,4)
byid=M.byid
def _hx(c):
    c=str(c).strip()
    if c.startswith('#') and len(c)==4: c='#'+''.join(ch*2 for ch in c[1:])
    return c.upper() if c.startswith('#') else c
SH=[]; _id=[1]
def nid():
    i=_id[0]; _id[0]+=1; return i

def txtbox(x,y,w,h,fill,line,text="",tcol="#20323F",size=9.5,rounding=0.05,nofill=False,noline=False,dashed=False,bold=True):
    fill=_hx(fill); line=_hx(line); tcol=_hx(tcol)
    pinx=ix(x+w/2); piny=iy(y+h/2); win=round(w/PT,4); hin=round(h/PT,4)
    t=html.escape(text)
    fillcell = f"<Cell N='FillPattern' V='0'/>" if nofill else f"<Cell N='FillForegnd' V='{fill}'/><Cell N='FillPattern' V='1'/>"
    linecell = f"<Cell N='LinePattern' V='0'/>" if noline else f"<Cell N='LineColor' V='{line}'/><Cell N='LinePattern' V='{2 if dashed else 1}'/><Cell N='LineWeight' V='0.012'/>"
    return f"""<Shape ID='{nid()}' Type='Shape' LineStyle='0' FillStyle='0' TextStyle='0'>
<Cell N='PinX' V='{pinx}'/><Cell N='PinY' V='{piny}'/><Cell N='Width' V='{win}'/><Cell N='Height' V='{hin}'/>
<Cell N='LocPinX' V='{round(win/2,4)}' F='Width*0.5'/><Cell N='LocPinY' V='{round(hin/2,4)}' F='Height*0.5'/>
{fillcell}{linecell}<Cell N='Rounding' V='{rounding}'/>
<Cell N='VerticalAlign' V='1'/>
<Cell N='LeftMargin' V='0.03'/><Cell N='RightMargin' V='0.03'/><Cell N='TopMargin' V='0.02'/><Cell N='BottomMargin' V='0.02'/>
<Section N='Character'><Row IX='0'><Cell N='Color' V='{tcol}'/><Cell N='Size' V='{round(size/72.0,4)}'/><Cell N='Style' V='{1 if bold else 0}'/></Row></Section>
<Section N='Paragraph'><Row IX='0'><Cell N='HorzAlign' V='1'/></Row></Section>
<Section N='Geometry' IX='0'><Cell N='NoFill' V='{1 if nofill else 0}'/><Cell N='NoLine' V='{1 if noline else 0}'/>
<Row T='RelMoveTo' IX='1'><Cell N='X' V='0'/><Cell N='Y' V='0'/></Row>
<Row T='RelLineTo' IX='2'><Cell N='X' V='1'/><Cell N='Y' V='0'/></Row>
<Row T='RelLineTo' IX='3'><Cell N='X' V='1'/><Cell N='Y' V='1'/></Row>
<Row T='RelLineTo' IX='4'><Cell N='X' V='0'/><Cell N='Y' V='1'/></Row>
<Row T='RelLineTo' IX='5'><Cell N='X' V='0'/><Cell N='Y' V='0'/></Row></Section>
<Text><cp IX='0'/><pp IX='0'/>{t}</Text></Shape>"""

def poly(pts,fill,line="#FFFFFF",noline=True):
    fill=_hx(fill); line=_hx(line)
    # pts: list of (x,y) in diagram points; absolute-inch geometry, pin at origin
    rows=[f"<Row T='MoveTo' IX='1'><Cell N='X' V='{ix(pts[0][0])}'/><Cell N='Y' V='{iy(pts[0][1])}'/></Row>"]
    for k,(px,py) in enumerate(pts[1:],start=2):
        rows.append(f"<Row T='LineTo' IX='{k}'><Cell N='X' V='{ix(px)}'/><Cell N='Y' V='{iy(py)}'/></Row>")
    rows.append(f"<Row T='LineTo' IX='{len(pts)+1}'><Cell N='X' V='{ix(pts[0][0])}'/><Cell N='Y' V='{iy(pts[0][1])}'/></Row>")
    lc = "<Cell N='NoLine' V='1'/>" if noline else f"<Cell N='NoLine' V='0'/>"
    linecell = "" if noline else f"<Cell N='LineColor' V='{line}'/><Cell N='LineWeight' V='0.01'/>"
    return f"""<Shape ID='{nid()}' Type='Shape'>
<Cell N='PinX' V='0'/><Cell N='PinY' V='0'/><Cell N='Width' V='1'/><Cell N='Height' V='1'/><Cell N='LocPinX' V='0'/><Cell N='LocPinY' V='0'/>
<Cell N='FillForegnd' V='{fill}'/><Cell N='FillPattern' V='1'/>{linecell}
<Section N='Geometry' IX='0'><Cell N='NoFill' V='0'/>{lc}{''.join(rows)}</Section></Shape>"""

def glyph(gx,gy,kind,s=30):
    col={"XLS":C["green"],"PDF":C["red"],"AI":C["ai"],"INHOUSE":C["inhouse"],"gearsoft":C["green"]}.get(kind,C["az"])
    lab={"XLS":"X","PDF":"PDF","AI":"AI","INHOUSE":"IN","gearsoft":"⚙"}.get(kind,"")
    SH.append(txtbox(gx,gy,s,s,col,col,lab,"#FFFFFF",8 if kind=="PDF" else 12,0.16))

def person(x,y,w,h):
    co=C["coral"]; hr=w*0.36
    SH.append(txtbox(x+w/2-hr,y,hr*2,hr*2,co,co,"", "#fff",8,0.5,noline=True))  # head (round)
    SH.append(poly([(x,y+h),(x+w*0.12,y+hr*1.5),(x+w*0.88,y+hr*1.5),(x+w,y+h)],co))  # shoulders

def emit(n):
    t=n["t"]; x,y,w,h=n["x"],n["y"],n["w"],n["h"]
    if t=="title":
        SH.append(txtbox(x,y,w,h,C["grey"],C["grey"],n["label"],C["htxt"],16,0.04)); return
    if t=="band":
        SH.append(txtbox(x,y,w,h,C["grey"],C["grey"],n["label"],C["htxt"],12,0.04)); return
    if t=="stage":
        SH.append(txtbox(x,y,w,h,C["az"],C["az"],(str(n.get("num",""))+"   "+n["label"]),"#FFFFFF",12,0.09)); return
    if t=="term":
        r=h/2+5
        SH.append(txtbox(x+r-2,y,w-r+2,h,C["azMed"],C["azMed"],n["label"],"#0d2a3a",9.5,0.5,noline=True))
        SH.append(txtbox(x,y+ (h-2*r)/2,2*r,2*r,C["circ"],C["circ"],"", "#000",8,0.5,noline=True)); return
    if t=="proc":
        SH.append(txtbox(x,y,w,h,C["azLt"],C["azLt"],"", "#000",9,0.08,noline=True))
        SH.append(poly([(x,y+4),(x+40,y+4),(x+40,y+h-4),(x,y+h-4)],C["azMed"]))
        SH.append(txtbox(x+40,y,w-40,h,"#000","#000",n["label"],"#0d2a3a",9,0.05,nofill=True,noline=True)); return
    if t=="soft":
        SH.append(txtbox(x,y,w,h,C["azVlt"],C["azVlt"],n["label"],"#0d2a3a",9,0.10,noline=True))
        SH.append(poly([(x+w-34,y-2),(x+w+4,y-2),(x+w-2,y+h*0.5),(x+w-30,y+h*0.5)],C["az"])); return
    if t=="out":
        sk=16; bar=30
        SH.append(poly([(x+sk,y),(x+w,y),(x+w-sk,y+h),(x,y+h)],"#FFFFFF",C["line"],noline=False))
        SH.append(poly([(x+sk,y),(x+sk+bar,y),(x+bar,y+h),(x,y+h)],C["azMed"]))
        SH.append(txtbox(x+bar,y,w-bar-sk,h,"#000","#000",n["label"],"#0d2a3a",8.5,0.05,nofill=True,noline=True)); return
    if t=="person":
        person(x,y,w,h); return
    if t=="boundary":
        SH.append(txtbox(x,y,w,h,C["white"],C["boundary"],"", "#000",8,0.03,nofill=True,dashed=True))
        SH.append(txtbox(x+16,y-13,len(n["label"])*6+26,26,C["note"],C["boundary"],"🔒 "+n["label"],C["boundary"],9,0.5)); return
    if t=="legend":
        k=n["kind"]; sw=58
        if k in ("XLS","PDF","AI","INHOUSE","gearsoft"): glyph(x+14,y+5,k,30)
        elif k=="person": person(x+16,y+4,24,30)
        elif k=="proc":
            SH.append(txtbox(x,y+8,sw,24,C["azLt"],C["azLt"],"","#000",8,0.1,noline=True)); SH.append(poly([(x,y+8),(x+14,y+8),(x+14,y+32),(x,y+32)],C["azMed"]))
        elif k=="soft":
            SH.append(txtbox(x,y+8,sw,24,C["azVlt"],C["azVlt"],"","#000",8,0.12,noline=True)); SH.append(poly([(x+sw-14,y+8),(x+sw+4,y+8),(x+sw,y+20),(x+sw-16,y+20)],C["az"]))
        elif k=="out":
            SH.append(poly([(x+10,y+8),(x+sw,y+8),(x+sw-10,y+32),(x,y+32)],"#FFFFFF",C["line"],noline=False)); SH.append(poly([(x+10,y+8),(x+26,y+8),(x+16,y+32),(x,y+32)],C["azMed"]))
        elif k=="term":
            SH.append(txtbox(x+16,y+9,sw-16,22,C["azMed"],C["azMed"],"","#000",8,0.5,noline=True)); SH.append(txtbox(x+2,y+7,26,26,C["circ"],C["circ"],"","#000",8,0.5,noline=True))
        elif k=="arrow":
            SH.append(conn_pts(x,y+20,x+sw,y+20))
        elif k=="lock":
            SH.append(txtbox(x,y+8,sw,24,C["white"],C["boundary"],"🔒","#b45309",11,0.1,nofill=True,dashed=True))
        SH.append(txtbox(x+sw+12,y,240,40,"#000","#000",n["label"],C["ink"],10,0.05,nofill=True,noline=True,bold=False)); return

def conn_pts(x1,y1,x2,y2,col=None):
    col=col or C["az"]
    return f"""<Shape ID='{nid()}' Type='Shape'>
<Cell N='PinX' V='0'/><Cell N='PinY' V='0'/><Cell N='Width' V='1'/><Cell N='Height' V='1'/><Cell N='LocPinX' V='0'/><Cell N='LocPinY' V='0'/>
<Cell N='LineColor' V='{col}'/><Cell N='LineWeight' V='0.013'/><Cell N='EndArrow' V='4'/><Cell N='EndArrowSize' V='2'/>
<Section N='Geometry' IX='0'><Cell N='NoFill' V='1'/>
<Row T='MoveTo' IX='1'><Cell N='X' V='{ix(x1)}'/><Cell N='Y' V='{iy(y1)}'/></Row>
<Row T='LineTo' IX='2'><Cell N='X' V='{ix(x2)}'/><Cell N='Y' V='{iy(y2)}'/></Row></Section></Shape>"""

def anchor(a,b):
    A,B=byid(a),byid(b); ay=A["y"]+A["h"]/2; by=B["y"]+B["h"]/2; ax,bx=A["x"]+A["w"]/2,B["x"]+B["w"]/2
    if abs(ay-by)<28 and B["x"]>A["x"]: return (A["x"]+A["w"],ay,B["x"],by)
    if abs(ay-by)<28 and B["x"]<A["x"]: return (A["x"],ay,B["x"]+B["w"],by)
    if by>ay: return (ax,A["y"]+A["h"],bx,B["y"])
    return (ax,A["y"],bx,B["y"]+B["h"])

# boundary behind
for n in M.NODES:
    if n["t"]=="boundary": emit(n)
# edges (orthogonal: V, H, V)
for a,b,st in M.EDGES:
    x1,y1,x2,y2=anchor(a,b)
    if abs(x1-x2)>4 and abs(y1-y2)>4:
        my=(y1+y2)/2
        SH.append(conn_pts(x1,y1,x1,my)); SH.append(conn_pts(x1,my,x2,my)); SH.append(conn_pts(x2,my,x2,y2))
    else:
        SH.append(conn_pts(x1,y1,x2,y2))
# nodes + attached glyphs
for n in M.NODES:
    if n["t"]=="boundary": continue
    emit(n)
    if n["glyphs"]:
        gx=n["x"]+n["w"]+(14 if n["t"]!="soft" else 22); gy=n["y"]+n["h"]/2-15
        for i,k in enumerate(n["glyphs"]): glyph(gx+i*36,gy,k,30)

page1=("<?xml version='1.0' encoding='UTF-8' standalone='yes'?>\n"
 "<PageContents xmlns='http://schemas.microsoft.com/office/visio/2012/main' "
 "xmlns:r='http://schemas.openxmlformats.org/officeDocument/2006/relationships' xml:space='preserve'>\n<Shapes>\n"
 +"\n".join(SH)+"\n</Shapes>\n</PageContents>")
pages=("<?xml version='1.0' encoding='UTF-8' standalone='yes'?>\n"
 "<Pages xmlns='http://schemas.microsoft.com/office/visio/2012/main' xmlns:r='http://schemas.openxmlformats.org/officeDocument/2006/relationships' xml:space='preserve'>\n"
 f"<Page ID='0' NameU='Recruitment DFD' Name='Recruitment DFD' ViewScale='-1' ViewCenterX='{PW_IN/2}' ViewCenterY='{PH_IN/2}'>\n"
 f"<PageSheet><Cell N='PageWidth' V='{round(PW_IN,4)}'/><Cell N='PageHeight' V='{round(PH_IN,4)}'/><Cell N='DrawingScale' V='1'/><Cell N='PageScale' V='1'/></PageSheet>\n"
 "<Rel r:id='rId1'/>\n</Page>\n</Pages>")
document=("<?xml version='1.0' encoding='UTF-8' standalone='yes'?>\n"
 "<VisioDocument xmlns='http://schemas.microsoft.com/office/visio/2012/main' xmlns:r='http://schemas.openxmlformats.org/officeDocument/2006/relationships' xml:space='preserve'>"
 "<DocumentSettings TopPage='0' DefaultTextStyle='0'><GlyphSettingsEnabled>0</GlyphSettingsEnabled></DocumentSettings>"
 "<Colors><ColorEntry IX='0' RGB='#000000'/><ColorEntry IX='1' RGB='#FFFFFF'/></Colors>"
 "<FaceNames><FaceName ID='1' Name='Calibri'/></FaceNames>"
 "<StyleSheets><StyleSheet ID='0' NameU='No Style' Name='No Style'>"
 "<Cell N='LineWeight' V='0.01'/><Cell N='LineColor' V='#000000'/><Cell N='LinePattern' V='1'/>"
 "<Cell N='FillForegnd' V='#FFFFFF'/><Cell N='FillPattern' V='1'/><Cell N='CharColor' V='#000000'/><Cell N='CharSize' V='0.12'/>"
 "</StyleSheet></StyleSheets></VisioDocument>")
CT=("<?xml version='1.0' encoding='UTF-8' standalone='yes'?>\n<Types xmlns='http://schemas.openxmlformats.org/package/2006/content-types'>"
 "<Default Extension='rels' ContentType='application/vnd.openxmlformats-package.relationships+xml'/><Default Extension='xml' ContentType='application/xml'/>"
 "<Override PartName='/visio/document.xml' ContentType='application/vnd.ms-visio.drawing.main+xml'/>"
 "<Override PartName='/visio/pages/pages.xml' ContentType='application/vnd.ms-visio.pages+xml'/>"
 "<Override PartName='/visio/pages/page1.xml' ContentType='application/vnd.ms-visio.page+xml'/>"
 "<Override PartName='/docProps/core.xml' ContentType='application/vnd.openxmlformats-package.core-properties+xml'/>"
 "<Override PartName='/docProps/app.xml' ContentType='application/vnd.openxmlformats-officedocument.extended-properties+xml'/></Types>")
RELS=("<?xml version='1.0' encoding='UTF-8' standalone='yes'?>\n<Relationships xmlns='http://schemas.openxmlformats.org/package/2006/relationships'>"
 "<Relationship Id='rId1' Type='http://schemas.microsoft.com/visio/2010/relationships/document' Target='visio/document.xml'/>"
 "<Relationship Id='rId2' Type='http://schemas.openxmlformats.org/officeDocument/2006/relationships/core-properties' Target='docProps/core.xml'/>"
 "<Relationship Id='rId3' Type='http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties' Target='docProps/app.xml'/></Relationships>")
DR=("<?xml version='1.0' encoding='UTF-8' standalone='yes'?>\n<Relationships xmlns='http://schemas.openxmlformats.org/package/2006/relationships'>"
 "<Relationship Id='rId1' Type='http://schemas.microsoft.com/visio/2010/relationships/pages' Target='pages/pages.xml'/></Relationships>")
PR=("<?xml version='1.0' encoding='UTF-8' standalone='yes'?>\n<Relationships xmlns='http://schemas.openxmlformats.org/package/2006/relationships'>"
 "<Relationship Id='rId1' Type='http://schemas.microsoft.com/visio/2010/relationships/page' Target='page1.xml'/></Relationships>")
CORE=("<?xml version='1.0' encoding='UTF-8' standalone='yes'?>\n<cp:coreProperties xmlns:cp='http://schemas.openxmlformats.org/package/2006/metadata/core-properties' xmlns:dc='http://purl.org/dc/elements/1.1/'>"
 "<dc:title>Recruitment Screening Data Flow — Static Equipment</dc:title><dc:creator>Recruitment Analyzer</dc:creator></cp:coreProperties>")
APP=("<?xml version='1.0' encoding='UTF-8' standalone='yes'?>\n<Properties xmlns='http://schemas.openxmlformats.org/officeDocument/2006/extended-properties'><Application>Microsoft Visio</Application></Properties>")
with zipfile.ZipFile("Recruitment_DFD_StaticEquipment.vsdx","w",zipfile.ZIP_DEFLATED) as z:
    z.writestr("[Content_Types].xml",CT); z.writestr("_rels/.rels",RELS)
    z.writestr("docProps/core.xml",CORE); z.writestr("docProps/app.xml",APP)
    z.writestr("visio/document.xml",document); z.writestr("visio/_rels/document.xml.rels",DR)
    z.writestr("visio/pages/pages.xml",pages); z.writestr("visio/pages/_rels/pages.xml.rels",PR)
    z.writestr("visio/pages/page1.xml",page1)
print("VSDX written; shapes:",_id[0]-1)
