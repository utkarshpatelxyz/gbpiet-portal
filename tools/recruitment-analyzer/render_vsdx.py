# ============================================================================
# VSDX emitter — builds a Visio 2013+ drawing (.vsdx = OPC/ZIP) from model.py.
# Same boxes/edges as the SVG. Units: inches. Visio origin is bottom-left, so Y
# is flipped from the SVG's top-left convention.
# ============================================================================
import model as M, zipfile, html
PT=72.0
PW_IN, PH_IN = M.W/PT, M.H/PT     # page size in inches
def ix(v): return round(v/PT,4)                    # x point -> inch
def iy(v): return round(PH_IN - v/PT,4)            # y point -> inch (flipped)
byid={b["id"]:b for b in M.BOX}

FILL={"title":"#EEF4FF","phase":"#FFFFFF","tool":"#EEF4FF","toolsub":"#FFFFFF",
      "data":"#FDF3E3","datasub":"#FFFFFF","run":"#EEF4FF","reset":"#FDECEC","note":"#F8FAFC"}
LINE={"title":"#1D4ED8","phase":"#2563EB","tool":"#1D4ED8","toolsub":"#CFD7E3",
      "data":"#B45309","datasub":"#CFD7E3","run":"#2563EB","reset":"#D64545","note":"#CFD7E3"}
TXT ={"title":"#12234A","phase":"#1D4ED8","tool":"#1D4ED8","toolsub":"#1F2733",
      "data":"#B45309","datasub":"#1F2733","run":"#1D4ED8","reset":"#D64545","note":"#1F2733"}

def shape_xml(sid,b):
    x,y,w,h=b["x"],b["y"],b["w"],b["h"]
    pinx=ix(x+w/2); piny=iy(y+h/2); win=round(w/PT,4); hin=round(h/PT,4)
    k=b["kind"]
    # text = title + detail lines (kept so the diagram is complete inside Visio too)
    num=""
    if k=="phase":
        try: num=str(int(b["id"][2:])+1)+".  "
        except: num=""
    lines=[num+b["title"]]+b["lines"]
    text=html.escape("\n".join(l for l in lines if l))
    fill=FILL[k]; line=LINE[k]; tc=TXT[k]
    bold_size = 12 if k in ("title","tool","data") else 9
    return f'''<Shape ID='{sid}' Type='Shape' LineStyle='0' FillStyle='0' TextStyle='0'>
 <Cell N='PinX' V='{pinx}'/><Cell N='PinY' V='{piny}'/>
 <Cell N='Width' V='{win}'/><Cell N='Height' V='{hin}'/>
 <Cell N='LocPinX' V='{round(win/2,4)}' F='Width*0.5'/><Cell N='LocPinY' V='{round(hin/2,4)}' F='Height*0.5'/>
 <Cell N='FillForegnd' V='{fill}'/><Cell N='FillPattern' V='1'/>
 <Cell N='LineColor' V='{line}'/><Cell N='LineWeight' V='0.013'/><Cell N='Rounding' V='0.08'/>
 <Cell N='Char.Color' V='{tc}'/><Cell N='Char.Size' V='{bold_size}pt'/>
 <Cell N='VerticalAlign' V='0'/><Cell N='Para.HorzAlign' V='0'/>
 <Cell N='LeftMargin' V='0.08'/><Cell N='TopMargin' V='0.04'/><Cell N='BottomMargin' V='0.04'/>
 <Section N='Geometry' IX='0'>
  <Cell N='NoFill' V='0'/><Cell N='NoLine' V='0'/>
  <Row T='RelMoveTo' IX='1'><Cell N='X' V='0'/><Cell N='Y' V='0'/></Row>
  <Row T='RelLineTo' IX='2'><Cell N='X' V='1'/><Cell N='Y' V='0'/></Row>
  <Row T='RelLineTo' IX='3'><Cell N='X' V='1'/><Cell N='Y' V='1'/></Row>
  <Row T='RelLineTo' IX='4'><Cell N='X' V='0'/><Cell N='Y' V='1'/></Row>
  <Row T='RelLineTo' IX='5'><Cell N='X' V='0'/><Cell N='Y' V='0'/></Row>
 </Section>
 <Text>{text}</Text>
</Shape>'''

def anchor(a,b):
    A,B=byid[a],byid[b]
    ay=A["y"]+A["h"]/2; by=B["y"]+B["h"]/2
    if abs(ay-by)<40 and B["x"]>A["x"]: return (A["x"]+A["w"],ay,B["x"],by)
    if abs(ay-by)<40 and B["x"]<A["x"]: return (A["x"],ay,B["x"]+B["w"],by)
    if by>ay: return (A["x"]+A["w"]/2,A["y"]+A["h"],B["x"]+B["w"]/2,B["y"])
    return (A["x"]+A["w"]/2,A["y"],B["x"]+B["w"]/2,B["y"]+B["h"])

def conn_xml(sid,a,b,style):
    x1,y1,x2,y2=anchor(a,b)
    col="#B45309" if style=="cross" else "#64748B"
    # 1-D line: pin at origin, absolute-inch geometry, no rotation
    return f'''<Shape ID='{sid}' Type='Shape' LineStyle='0' FillStyle='0' TextStyle='0'>
 <Cell N='PinX' V='0'/><Cell N='PinY' V='0'/><Cell N='Width' V='1'/><Cell N='Height' V='1'/>
 <Cell N='LocPinX' V='0'/><Cell N='LocPinY' V='0'/>
 <Cell N='LineColor' V='{col}'/><Cell N='LineWeight' V='0.014'/>
 <Cell N='EndArrow' V='4'/><Cell N='EndArrowSize' V='2'/>
 <Section N='Geometry' IX='0'>
  <Cell N='NoFill' V='1'/><Cell N='NoLine' V='0'/>
  <Row T='MoveTo' IX='1'><Cell N='X' V='{ix(x1)}'/><Cell N='Y' V='{iy(y1)}'/></Row>
  <Row T='LineTo' IX='2'><Cell N='X' V='{ix(x2)}'/><Cell N='Y' V='{iy(y2)}'/></Row>
 </Section>
</Shape>'''

shapes=[]; sid=1
for b in M.BOX: shapes.append(shape_xml(sid,b)); sid+=1
# trust boundary dashed line (manual)
bx=(byid["toolPanel"]["x"]+byid["toolPanel"]["w"]+byid["dataPanel"]["x"])/2
shapes.append(f'''<Shape ID='{sid}' Type='Shape'><Cell N='PinX' V='0'/><Cell N='PinY' V='0'/><Cell N='Width' V='1'/><Cell N='Height' V='1'/><Cell N='LocPinX' V='0'/><Cell N='LocPinY' V='0'/><Cell N='LineColor' V='#D64545'/><Cell N='LineWeight' V='0.02'/><Cell N='LinePattern' V='2'/><Section N='Geometry' IX='0'><Cell N='NoFill' V='1'/><Row T='MoveTo' IX='1'><Cell N='X' V='{ix(bx)}'/><Cell N='Y' V='{iy(222)}'/></Row><Row T='LineTo' IX='2'><Cell N='X' V='{ix(bx)}'/><Cell N='Y' V='{iy(742)}'/></Row></Section></Shape>'''); sid+=1
for a,b,label,style in M.EDGE: shapes.append(conn_xml(sid,a,b,style)); sid+=1

page1 = "<?xml version='1.0' encoding='UTF-8' standalone='yes'?>\n" \
 "<PageContents xmlns='http://schemas.microsoft.com/office/visio/2012/main' " \
 "xmlns:r='http://schemas.openxmlformats.org/officeDocument/2006/relationships' xml:space='preserve'>\n" \
 "<Shapes>\n"+"\n".join(shapes)+"\n</Shapes>\n</PageContents>"

pages = "<?xml version='1.0' encoding='UTF-8' standalone='yes'?>\n" \
 "<Pages xmlns='http://schemas.microsoft.com/office/visio/2012/main' " \
 "xmlns:r='http://schemas.openxmlformats.org/officeDocument/2006/relationships' xml:space='preserve'>\n" \
 f"<Page ID='0' NameU='Architecture' Name='Architecture' ViewScale='-1' ViewCenterX='{PW_IN/2}' ViewCenterY='{PH_IN/2}'>\n" \
 f"<PageSheet><Cell N='PageWidth' V='{round(PW_IN,4)}'/><Cell N='PageHeight' V='{round(PH_IN,4)}'/>" \
 "<Cell N='DrawingScale' V='1'/><Cell N='PageScale' V='1'/></PageSheet>\n" \
 "<Rel r:id='rId1'/>\n</Page>\n</Pages>"

document = ("<?xml version='1.0' encoding='UTF-8' standalone='yes'?>\n"
 "<VisioDocument xmlns='http://schemas.microsoft.com/office/visio/2012/main' "
 "xmlns:r='http://schemas.openxmlformats.org/officeDocument/2006/relationships' xml:space='preserve'>"
 "<DocumentSettings TopPage='0' DefaultTextStyle='0'><GlyphSettingsEnabled>0</GlyphSettingsEnabled></DocumentSettings>"
 "<Colors><ColorEntry IX='0' RGB='#000000'/><ColorEntry IX='1' RGB='#FFFFFF'/></Colors>"
 "<FaceNames><FaceName ID='1' Name='Calibri' UnicodeRanges='0'/></FaceNames>"
 "<StyleSheets>"
 "<StyleSheet ID='0' NameU='No Style' Name='No Style'>"
 "<Cell N='LineWeight' V='0.01'/><Cell N='LineColor' V='#000000'/><Cell N='LinePattern' V='1'/>"
 "<Cell N='FillForegnd' V='#FFFFFF'/><Cell N='FillPattern' V='1'/>"
 "<Cell N='CharColor' V='#000000'/><Cell N='CharSize' V='0.12'/>"
 "</StyleSheet>"
 "</StyleSheets>"
 "</VisioDocument>")

CT = "<?xml version='1.0' encoding='UTF-8' standalone='yes'?>\n" \
 "<Types xmlns='http://schemas.openxmlformats.org/package/2006/content-types'>" \
 "<Default Extension='rels' ContentType='application/vnd.openxmlformats-package.relationships+xml'/>" \
 "<Default Extension='xml' ContentType='application/xml'/>" \
 "<Override PartName='/visio/document.xml' ContentType='application/vnd.ms-visio.drawing.main+xml'/>" \
 "<Override PartName='/visio/pages/pages.xml' ContentType='application/vnd.ms-visio.pages+xml'/>" \
 "<Override PartName='/visio/pages/page1.xml' ContentType='application/vnd.ms-visio.page+xml'/>" \
 "<Override PartName='/docProps/core.xml' ContentType='application/vnd.openxmlformats-package.core-properties+xml'/>" \
 "<Override PartName='/docProps/app.xml' ContentType='application/vnd.openxmlformats-officedocument.extended-properties+xml'/>" \
 "</Types>"

RELS = "<?xml version='1.0' encoding='UTF-8' standalone='yes'?>\n" \
 "<Relationships xmlns='http://schemas.openxmlformats.org/package/2006/relationships'>" \
 "<Relationship Id='rId1' Type='http://schemas.microsoft.com/visio/2010/relationships/document' Target='visio/document.xml'/>" \
 "<Relationship Id='rId2' Type='http://schemas.openxmlformats.org/officeDocument/2006/relationships/core-properties' Target='docProps/core.xml'/>" \
 "<Relationship Id='rId3' Type='http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties' Target='docProps/app.xml'/>" \
 "</Relationships>"

DOCRELS = "<?xml version='1.0' encoding='UTF-8' standalone='yes'?>\n" \
 "<Relationships xmlns='http://schemas.openxmlformats.org/package/2006/relationships'>" \
 "<Relationship Id='rId1' Type='http://schemas.microsoft.com/visio/2010/relationships/pages' Target='pages/pages.xml'/>" \
 "</Relationships>"

PAGESRELS = "<?xml version='1.0' encoding='UTF-8' standalone='yes'?>\n" \
 "<Relationships xmlns='http://schemas.openxmlformats.org/package/2006/relationships'>" \
 "<Relationship Id='rId1' Type='http://schemas.microsoft.com/visio/2010/relationships/page' Target='page1.xml'/>" \
 "</Relationships>"

CORE = "<?xml version='1.0' encoding='UTF-8' standalone='yes'?>\n" \
 "<cp:coreProperties xmlns:cp='http://schemas.openxmlformats.org/package/2006/metadata/core-properties' " \
 "xmlns:dc='http://purl.org/dc/elements/1.1/' xmlns:dcterms='http://purl.org/dc/terms/' xmlns:xsi='http://www.w3.org/2001/XMLSchema-instance'>" \
 "<dc:title>Recruitment Analyzer — Method &amp; Architecture</dc:title><dc:creator>Recruitment Analyzer</dc:creator></cp:coreProperties>"

APP = "<?xml version='1.0' encoding='UTF-8' standalone='yes'?>\n" \
 "<Properties xmlns='http://schemas.openxmlformats.org/officeDocument/2006/extended-properties'>" \
 "<Application>Microsoft Visio</Application><Company>Recruitment Analyzer</Company></Properties>"

with zipfile.ZipFile("Architecture_Framework.vsdx","w",zipfile.ZIP_DEFLATED) as z:
    z.writestr("[Content_Types].xml",CT)
    z.writestr("_rels/.rels",RELS)
    z.writestr("docProps/core.xml",CORE)
    z.writestr("docProps/app.xml",APP)
    z.writestr("visio/document.xml",document)
    z.writestr("visio/_rels/document.xml.rels",DOCRELS)
    z.writestr("visio/pages/pages.xml",pages)
    z.writestr("visio/pages/_rels/pages.xml.rels",PAGESRELS)
    z.writestr("visio/pages/page1.xml",page1)
print("Architecture_Framework.vsdx written; shapes:",sid-1)
