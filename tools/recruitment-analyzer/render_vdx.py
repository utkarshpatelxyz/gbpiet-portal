# ============================================================================
# VDX emitter (Visio 2003 XML drawing) from model.py. Single self-contained
# XML file; opened natively by Microsoft Visio and parsed by libvisio (our gate).
# ============================================================================
import model as M, html
PT=72.0; PW_IN,PH_IN = M.W/PT, M.H/PT
def ix(v): return round(v/PT,4)
def iy(v): return round(PH_IN - v/PT,4)
byid={b["id"]:b for b in M.BOX}
FILL={"title":"#EEF4FF","phase":"#FFFFFF","tool":"#EEF4FF","toolsub":"#FFFFFF","data":"#FDF3E3",
      "datasub":"#FFFFFF","run":"#EEF4FF","reset":"#FDECEC","note":"#F8FAFC"}
LINE={"title":"#1D4ED8","phase":"#2563EB","tool":"#1D4ED8","toolsub":"#CFD7E3","data":"#B45309",
      "datasub":"#CFD7E3","run":"#2563EB","reset":"#D64545","note":"#CFD7E3"}
TXT ={"title":"#12234A","phase":"#1D4ED8","tool":"#1D4ED8","toolsub":"#1F2733","data":"#B45309",
      "datasub":"#1F2733","run":"#1D4ED8","reset":"#D64545","note":"#1F2733"}

def box_shape(sid,b):
    x,y,w,h=b["x"],b["y"],b["w"],b["h"]
    pinx=ix(x+w/2); piny=iy(y+h/2); win=round(w/PT,4); hin=round(h/PT,4)
    k=b["kind"]
    num=""
    if k=="phase":
        try: num=str(int(b["id"][2:])+1)+".  "
        except: num=""
    text=html.escape("\n".join([num+b["title"]]+[l for l in b["lines"] if l]))
    tsize=0.16 if k in ("title","tool","data") else 0.11
    return f'''<Shape ID='{sid}' Type='Shape'>
<XForm><PinX>{pinx}</PinX><PinY>{piny}</PinY><Width>{win}</Width><Height>{hin}</Height><LocPinX>{round(win/2,4)}</LocPinX><LocPinY>{round(hin/2,4)}</LocPinY><Angle>0</Angle></XForm>
<Fill><FillForegnd>{FILL[k]}</FillForegnd><FillPattern>1</FillPattern></Fill>
<Line><LineWeight>0.013</LineWeight><LineColor>{LINE[k]}</LineColor><LinePattern>1</LinePattern><Rounding>0.06</Rounding></Line>
<Char><Color>{TXT[k]}</Color><Size>{tsize}</Size></Char>
<Para><HorzAlign>0</HorzAlign></Para>
<TextBlock><VerticalAlign>0</VerticalAlign><LeftMargin>0.08</LeftMargin><RightMargin>0.05</RightMargin><TopMargin>0.05</TopMargin><BottomMargin>0.05</BottomMargin></TextBlock>
<Geom><NoFill>0</NoFill><NoLine>0</NoLine>
<MoveTo IX='1'><X>0</X><Y>0</Y></MoveTo>
<LineTo IX='2'><X>{win}</X><Y>0</Y></LineTo>
<LineTo IX='3'><X>{win}</X><Y>{hin}</Y></LineTo>
<LineTo IX='4'><X>0</X><Y>{hin}</Y></LineTo>
<LineTo IX='5'><X>0</X><Y>0</Y></LineTo></Geom>
<Text>{text}</Text>
</Shape>'''

def anchor(a,b):
    A,B=byid[a],byid[b]; ay=A["y"]+A["h"]/2; by=B["y"]+B["h"]/2
    if abs(ay-by)<40 and B["x"]>A["x"]: return (A["x"]+A["w"],ay,B["x"],by)
    if abs(ay-by)<40 and B["x"]<A["x"]: return (A["x"],ay,B["x"]+B["w"],by)
    if by>ay: return (A["x"]+A["w"]/2,A["y"]+A["h"],B["x"]+B["w"]/2,B["y"])
    return (A["x"]+A["w"]/2,A["y"],B["x"]+B["w"]/2,B["y"]+B["h"])

def line_shape(sid,x1,y1,x2,y2,col,dashed=False,arrow=True):
    return f'''<Shape ID='{sid}' Type='Shape'>
<XForm><PinX>0</PinX><PinY>0</PinY><Width>1</Width><Height>1</Height><LocPinX>0</LocPinX><LocPinY>0</LocPinY><Angle>0</Angle></XForm>
<Line><LineWeight>0.014</LineWeight><LineColor>{col}</LineColor><LinePattern>{2 if dashed else 1}</LinePattern>{"<EndArrow>4</EndArrow><EndArrowSize>2</EndArrowSize>" if arrow else ""}</Line>
<Geom><NoFill>1</NoFill><NoLine>0</NoLine>
<MoveTo IX='1'><X>{ix(x1)}</X><Y>{iy(y1)}</Y></MoveTo>
<LineTo IX='2'><X>{ix(x2)}</X><Y>{iy(y2)}</Y></LineTo></Geom>
</Shape>'''

shapes=[]; sid=1
for b in M.BOX: shapes.append(box_shape(sid,b)); sid+=1
bx=(byid["toolPanel"]["x"]+byid["toolPanel"]["w"]+byid["dataPanel"]["x"])/2
shapes.append(line_shape(sid,bx,222,bx,742,"#D64545",dashed=True,arrow=False)); sid+=1
for a,b,label,style in M.EDGE:
    x1,y1,x2,y2=anchor(a,b)
    shapes.append(line_shape(sid,x1,y1,x2,y2,"#B45309" if style=="cross" else "#64748B",dashed=(style=="cross"))); sid+=1

vdx=f'''<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<VisioDocument xmlns="http://schemas.microsoft.com/visio/2003/core" xmlns:vx="http://schemas.microsoft.com/visio/2006/extension">
<DocumentProperties><Creator>Recruitment Analyzer</Creator><Title>Method &amp; Architecture</Title></DocumentProperties>
<Colors><ColorEntry IX="0" RGB="#000000"/><ColorEntry IX="1" RGB="#FFFFFF"/></Colors>
<FaceNames><FaceName ID="1" Name="Calibri"/></FaceNames>
<StyleSheets>
<StyleSheet ID="0" NameU="No Style" Name="No Style"><Line><LineWeight>0.01</LineWeight><LineColor>#000000</LineColor><LinePattern>1</LinePattern></Line><Fill><FillForegnd>#FFFFFF</FillForegnd><FillPattern>1</FillPattern></Fill><Char><Color>#000000</Color><Size>0.12</Size></Char></StyleSheet>
</StyleSheets>
<Pages>
<Page ID="0" NameU="Architecture" Name="Architecture">
<PageSheet><PageProps><PageWidth>{round(PW_IN,4)}</PageWidth><PageHeight>{round(PH_IN,4)}</PageHeight></PageProps></PageSheet>
<Shapes>
{chr(10).join(shapes)}
</Shapes>
</Page>
</Pages>
</VisioDocument>'''
open("Architecture_Framework.vdx","w",encoding="utf-8").write(vdx)
print("VDX written; shapes:",sid-1)
