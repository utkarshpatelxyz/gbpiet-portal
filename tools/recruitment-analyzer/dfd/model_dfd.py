# ============================================================================
# Recruitment Screening Data Flow — in the department's DFD visual language.
# One model → SVG (verifiable twin) + VSDX (Visio). Coordinates in points,
# origin top-left (SVG). The VSDX emitter flips Y.
# ============================================================================
W, H = 1740, 1200

# palette sampled from the department's 133 DFD
C = dict(
  az="#29ABE2", azMed="#4FB6E8", azLt="#AFDCF3", azVlt="#DFF1FB", circ="#C7E7F7",
  grey="#F2F2F2", htxt="#2BA8E0", coral="#F79892", ink="#20323f", line="#7FC3E6",
  white="#FFFFFF", boundary="#E0662B", note="#FCEEE6", green="#1D9C57",
  red="#E03B2E", inhouse="#2E7DD6", ai="#2AA7C9", grey2="#9aa7b3",
)

NODES=[]
def N(id,t,x,y,w,h,label="",glyphs=None,**kw):
    d=dict(id=id,t=t,x=x,y=y,w=w,h=h,label=label,glyphs=glyphs or [],**kw); NODES.append(d); return id
byid=lambda i:next(n for n in NODES if n["id"]==i)
EDGES=[]
def E(a,b,style="flow"): EDGES.append((a,b,style))

# ---- header bands ----
N("t_title","title",40,26,W-80,54,
  "Recruitment Screening — Data Flow  (Static Equipment, Dept 133)")
N("b0","band",40,100,360,34,"Screening Data Flow — Lvl 0")
N("b1","band",430,100,860,34,"Screening Data Flow — Lvl 1")
N("bl","band",1320,100,380,34,"Legend")

# =====================================================================
# LVL 0  — the simple top-down story (left column)
# =====================================================================
cx=210; bw=250
N("l0_start","term", cx-60,150,bw,44,"Open Analyzer (browser)")
N("l0_p1","person", cx+8,214,26,30)
N("l0_cfg","proc",  cx-60,250,bw,50,"Upload Framework Config", ["XLS"])
N("l0_p2","person", cx+8,318,26,30)
N("l0_cv","proc",   cx-60,352,bw,50,"Upload Résumé (PDF)", ["PDF"])
N("l0_p3","person", cx+8,420,26,30)
N("l0_eng","soft",  cx-60,452,bw,54,"Analyzer Engine (in-house)", ["INHOUSE","AI"])
N("l0_o1","out",    cx-60,548,bw,40,"Candidate Dashboard")
N("l0_o2","out",    cx-60,600,bw,40,"Interview Evaluation Kit")
N("l0_o3","out",    cx-60,652,bw,40,"Shortlist Decision")
for a,b in [("l0_start","l0_cfg"),("l0_cfg","l0_cv"),("l0_cv","l0_eng"),
            ("l0_eng","l0_o1"),("l0_o1","l0_o2"),("l0_o2","l0_o3")]: E(a,b)

# =====================================================================
# LVL 1 — expanded, with the in-memory trust boundary (middle column)
# =====================================================================
# inputs (top)
N("cfg","proc", 470,168,300,54,"Configuration Workbook  (levels · skills · scoring)", ["XLS"])
N("cv","proc",  980,168,300,54,"Résumés  (PDF, incl. scanned)", ["PDF"])
N("cfg_m","person",610,238,24,28)
N("cv_m","person", 1120,238,24,28)

# trust boundary enclosure
N("tb","boundary",452,290,846,470,
  "IN-BROWSER  ·  IN-MEMORY ONLY  ·  NO SERVER  ·  WIPED ON REFRESH")

# engine sub-processes (software boxes) inside the boundary
N("loader","soft", 476,330,300,50,"Config Loader  (framework → memory)", ["INHOUSE"])
N("ocr","soft",    980,330,300,50,"PDF Text / OCR Extraction", ["INHOUSE","AI"])
N("dates","soft",  980,404,300,50,"Experience Engine  (date reconciliation)", ["INHOUSE"])
N("score","soft",  476,478,300,50,"Skill Scoring  (PCI 0–4, keywords)", ["INHOUSE"])
N("fit","soft",    980,478,300,50,"Best-fit Level + Screening Flags", ["INHOUSE"])
N("report","soft", 728,560,300,50,"Report Builder  (kit from framework)", ["INHOUSE","XLS"])
N("rev_m","person",690,646,24,28)

# outputs (bottom, below boundary)
N("o_dash","out", 470,792,300,42,"Candidate Dashboard")
N("o_kit","out",  728,792,300,42,"Interview Evaluation Kit (Excel)")
N("o_short","out",986,792,300,42,"Shortlist / Interview Decision")

E("cfg","loader"); E("cv","ocr")
E("ocr","dates"); E("dates","score"); E("loader","score"); E("score","fit")
E("fit","report"); E("loader","report")
E("fit","o_dash"); E("report","o_kit"); E("o_dash","o_short")

# =====================================================================
# LEGEND (right column) — mirrors the department's, plus our in-memory marker
# =====================================================================
lx=1340; ly=160; dy=52
legend=[("person","Manual step"),("gearsoft","In-browser / automatic"),
        ("XLS","Excel"),("PDF","PDF"),("AI","OCR / AI extraction"),
        ("INHOUSE","In-house software"),
        ("proc","Document / process"),("soft","Software"),
        ("out","Output"),("term","Start / user"),
        ("arrow","Data flow"),("lock","Confidential — in-memory only")]
for i,(k,t) in enumerate(legend):
    N("lg%d"%i,"legend",lx,ly+i*dy,300,40,t,kind=k)
