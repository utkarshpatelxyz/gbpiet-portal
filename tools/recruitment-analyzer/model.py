# ============================================================================
# Single source of truth for the architecture diagram.
# Both the SVG (verifiable twin) and the VSDX (Visio) are emitted from THIS.
# Coordinates are in "diagram units" = points, origin top-left (SVG convention).
# The VSDX emitter flips Y (Visio origin is bottom-left).
# ============================================================================
W, H = 1620, 1040

C = {
  "ink":"#1f2733","ink2":"#5b6675","ink3":"#8a94a3","line":"#cfd7e3",
  "brand":"#2563eb","brandD":"#1d4ed8","brand50":"#eef4ff",
  "tool":"#1d4ed8","toolBg":"#eef4ff",
  "data":"#b45309","dataBg":"#fdf3e3",
  "good":"#0f9d6c","goodBg":"#e7f6ef",
  "boundary":"#d64545","white":"#ffffff","panel":"#ffffff","band":"#0f172a",
  "phase":"#111827","chip":"#eef2f8",
}

# Boxes: id -> dict(x,y,w,h,title,lines,kind)
# kind drives fill/stroke: title, phase, tool, toolsub, data, datasub, run, note
BOX = []
def box(id,x,y,w,h,title,lines=None,kind="tool",fs=13,tfs=None):
    BOX.append(dict(id=id,x=x,y=y,w=w,h=h,title=title,lines=lines or [],kind=kind,fs=fs,tfs=tfs))
    return id

# ---- header ----
box("title",40,26,W-80,58,
    "From Problem Statement to a Self-Configuring, Zero-Leak Screening Tool",
    ["Method & reference architecture  ·  how one tool serves any department without ever holding its data"],
    kind="title")

# ---- phase ribbon (methodology) ----
phases=[("P1","Frame the problem","name the decision + its hidden framework"),
        ("P2","Separate data from logic","what is Tool vs what is Confidential Data"),
        ("P3","Build the tool","fixed engine + UI + config loader + report builder"),
        ("P4","Configure","department fills the config workbook — not the tool"),
        ("P5","Run a session","upload · analyse · export, all in the browser"),
        ("P6","Reset","refresh wipes framework + resumes")]
px,pw,pg = 40,246,12
for i,(k,t,s) in enumerate(phases):
    box("ph"+str(i), px+i*(pw+pg), 104, pw, 66, t, [s], kind="phase", fs=11, tfs=13)

# ---- trust boundary panel background (drawn as a big note) ----
# Two architecture columns inside a boundary
LY=232; LH=498
box("toolPanel", 40, LY, 720, LH, "THE TOOL   ·   this single HTML file",
    ["Ships with ZERO framework. Identical for every customer. Shareable and demoable."], kind="tool", tfs=15)
box("dataPanel", 860, LY, 720, LH, "CONFIDENTIAL DATA   ·   stays yours",
    ["Never written into the tool. Lives only in browser memory during a session."], kind="data", tfs=15)

# tool sub-boxes
box("eng", 66, LY+92, 320, 150, "Fixed engine  [ENGINE]",
    ["• PDF text extraction + on-device OCR","• Date / experience reconciliation","• Generic keyword scoring (PCI)","• Best-fit level + screening flags","No company data. Same for all."], kind="toolsub", fs=11.5)
box("ui", 410, LY+92, 324, 150, "User interface  [UI]",
    ["• 3-step wizard: load → add → review","• Enterprise dashboard + tables","• Experience audit (reviewer edits)","• In-memory only; reset button"], kind="toolsub", fs=11.5)
box("loader", 66, LY+264, 320, 200, "Config loader  [CONFIG]",
    ["Reads the uploaded workbook and","builds the in-memory framework:","levels · skills · scoring · questions.","The ONLY bridge between the","tool and your data. Strict, with","clear validation errors."], kind="toolsub", fs=11.5)
box("report", 410, LY+264, 324, 200, "Report builder  [CONFIG]",
    ["Generates the evaluation kit LIVE","from the loaded framework.","No confidential template is baked","into the tool — the kit format","comes from your workbook."], kind="toolsub", fs=11.5)

# data sub-boxes
box("wbk", 886, LY+92, 668, 168, "Configuration workbook  (.xlsx template you fill)",
    ["Setup  ·  Levels  ·  Technical Skills  ·  Behavioral  ·  Competencies  ·  Questions",
     "Mirrors the Master-Skills format. Yellow sample cells → replace with your framework.",
     "You keep this file. Upload it to run; it is never stored by the tool."], kind="datasub", fs=12)
box("cvs", 886, LY+284, 668, 176, "Resumes  (PDF)",
    ["Uploaded per session, parsed in the browser (text layer or OCR).",
     "Held in memory as extracted text only. Never uploaded anywhere.",
     "Erased with everything else on refresh / close / Reset."], kind="datasub", fs=12)

# ---- runtime flow (bottom) ----
RY=762
run=[("r1","Open the tool"),("r2","Upload config\n(in memory)"),("r3","Upload resumes\n(in memory)"),
     ("r4","Analyse\n(fixed engine)"),("r5","Review dashboard"),("r6","Export kit\n(built from config)"),
     ("r7","Refresh ⇒ ERASE\nframework + resumes")]
rw,rg=196,20; rx=40
for i,(k,t) in enumerate(run):
    kind="run" if k!="r7" else "reset"
    box(k, rx+i*(rw+rg), RY, rw, 74, t, [], kind=kind, fs=12)

# ---- boundary + legend note ----
box("legend", 40, RY+104, W-80, 92, "Data-sensitivity boundary",
    ["The dashed boundary is the trust line. Left of it = code that carries no data and can be shared freely.",
     "Right of it = your framework and the resumes, which exist only in this browser tab and are wiped on refresh.",
     "There is no server, no upload, no database, no localStorage for any confidential data — separation is structural, not a policy."],
    kind="note", fs=12)

# ---- edges: (from,to,label,style) style: 'flow'|'dash'|'up' ----
EDGE=[]
def edge(a,b,label="",style="flow"): EDGE.append((a,b,label,style))
for i in range(len(phases)-1): edge("ph"+str(i),"ph"+str(i+1),"","flow")
# data feeds tool across the boundary
edge("wbk","loader","load","cross")
edge("cvs","eng","read","cross")
# runtime chain
for i in range(len(run)-1): edge(run[i][0],run[i+1][0],"","flow")
