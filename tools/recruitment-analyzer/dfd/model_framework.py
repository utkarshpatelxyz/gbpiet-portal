# ============================================================================
# Static Equipment — Digitalization Methodology Framework.
# A general, repeatable pattern: from a problem statement to a working, data-safe
# digital tool. Rendered in the department's DFD visual language. Bilingual:
# set FW_LANG=en|es. One model → SVG + VSDX.
# ============================================================================
import os
from model_dfd import C          # reuse the exact department palette
W, H = 2080, 1180

TXT = {
 "en": {
  "title":"Static Equipment — Digitalization Framework: from Problem to Working Tool",
  "flow":"How we turn a problem into a working digital tool — the repeatable pattern",
  "principlesLabel":"GUIDING PRINCIPLES — DATA-SAFE BY DESIGN",
  "legendLabel":"Legend",
  "stages":[
    ("1","IDENTIFY — frame the problem"),
    ("2","ANALYSE — process & data"),
    ("3","DESIGN — the digital approach"),
    ("4","BUILD — develop the tool"),
    ("5","VALIDATE — test & verify"),
    ("6","DEPLOY & REUSE"),
  ],
  "acts":[
    ["Capture the recurring pain — manual, repetitive or error-prone task",
     "Assess impact, frequency and who is affected",
     "Agree the goal and success criteria with the owner"],
    ["Map the current (as-is) workflow, inputs and outputs",
     "Classify data: confidential (framework, personal, project) vs generic logic",
     "Define what a good outcome looks like (measures)"],
    ["Separate the TOOL (logic + interface) from the DATA (configuration)",
     "Choose an in-browser web app — no server, no storage",
     "Define the configuration template the user will fill"],
    ["Fixed engine — extraction, calculations, scoring, checks",
     "Clean interface + configuration loader + report builder",
     "Commented code; data-sensitivity boundaries marked"],
    ["Test against real cases and the manual baseline",
     "Verify zero data leak — in-memory only, wiped on refresh",
     "Reviewer confirms results before use"],
    ["User uploads their confidential configuration at runtime",
     "Train users, collect feedback, iterate",
     "Reuse the same pattern for the next problem"],
  ],
  "outs":["Problem brief","Process map + data classification","Solution architecture + config schema",
          "Self-contained web app (single HTML)","Verified tool + evidence","Tool in use + reusable pattern"],
  "principles":[
    "Data stays with its owner — uploaded per session, held in memory only",
    "No server · no database · no storage — everything wiped on refresh",
    "Configurable — one tool adapts to any case, with no code change",
    "Reusable pattern — the same steps solve the next problem"],
  "legend":[("stage","Stage"),("proc","Activity"),("out","Output / deliverable"),
    ("person","Manual step"),("INHOUSE","In-house tool"),("arrow","Flow / sequence"),
    ("lock","Confidential — in-memory only")],
 },
 "es": {
  "title":"Equipos Estáticos — Marco de Digitalización: del Problema a una Herramienta Funcional",
  "flow":"Cómo convertimos un problema en una herramienta digital funcional — el patrón repetible",
  "principlesLabel":"PRINCIPIOS RECTORES — SEGURIDAD DE DATOS POR DISEÑO",
  "legendLabel":"Leyenda",
  "stages":[
    ("1","IDENTIFICAR — definir el problema"),
    ("2","ANALIZAR — proceso y datos"),
    ("3","DISEÑAR — el enfoque digital"),
    ("4","CONSTRUIR — desarrollar la herramienta"),
    ("5","VALIDAR — probar y verificar"),
    ("6","DESPLEGAR Y REUTILIZAR"),
  ],
  "acts":[
    ["Detectar la necesidad recurrente — tarea manual, repetitiva o propensa a errores",
     "Evaluar impacto, frecuencia y a quién afecta",
     "Acordar el objetivo y los criterios de éxito con el responsable"],
    ["Mapear el flujo actual (as-is), entradas y salidas",
     "Clasificar los datos: confidenciales (marco, personales, proyecto) vs lógica genérica",
     "Definir cómo se ve un buen resultado (indicadores)"],
    ["Separar la HERRAMIENTA (lógica + interfaz) de los DATOS (configuración)",
     "Elegir una app web en el navegador — sin servidor, sin almacenamiento",
     "Definir la plantilla de configuración que rellenará el usuario"],
    ["Motor fijo — extracción, cálculos, puntuación, comprobaciones",
     "Interfaz clara + cargador de configuración + generador de informes",
     "Código comentado; límites de sensibilidad de datos marcados"],
    ["Probar con casos reales y con la referencia manual",
     "Verificar cero fuga de datos — solo en memoria, se borra al recargar",
     "El revisor confirma los resultados antes de usarlos"],
    ["El usuario sube su configuración confidencial al ejecutar",
     "Formar a los usuarios, recoger comentarios, iterar",
     "Reutilizar el mismo patrón para el siguiente problema"],
  ],
  "outs":["Ficha del problema","Mapa de proceso + clasificación de datos","Arquitectura + esquema de configuración",
          "App web autónoma (un solo HTML)","Herramienta verificada + evidencia","Herramienta en uso + patrón reutilizable"],
  "principles":[
    "Los datos permanecen con su dueño — se suben por sesión, solo en memoria",
    "Sin servidor · sin base de datos · sin almacenamiento — todo se borra al recargar",
    "Configurable — una herramienta se adapta a cualquier caso, sin cambiar código",
    "Patrón reutilizable — los mismos pasos resuelven el siguiente problema"],
  "legend":[("stage","Etapa"),("proc","Actividad"),("out","Salida / entregable"),
    ("person","Paso manual"),("INHOUSE","Herramienta propia"),("arrow","Flujo / secuencia"),
    ("lock","Confidencial — solo en memoria")],
 },
}
L = TXT[os.environ.get("FW_LANG","en")]

NODES=[]; EDGES=[]
def N(id,t,x,y,w,h,label="",**kw): d=dict(id=id,t=t,x=x,y=y,w=w,h=h,label=label,glyphs=kw.pop("glyphs",[]),**kw); NODES.append(d); return id
def E(a,b): EDGES.append((a,b,"flow"))
byid=lambda i:next(n for n in NODES if n["id"]==i)

# header
N("title","title",40,26,W-80,54,L["title"])
N("flow","band",40,96,W-80,32,L["flow"])

# 6 stage columns
x0=44; colw=316; gap=12.8
def cx(i): return x0+i*(colw+gap)
sy=146; sh=48
for i,(num,name) in enumerate(L["stages"]):
    N("st%d"%i,"stage",cx(i),sy,colw,sh,name,num=num)
for i in range(5): E("st%d"%i,"st%d"%(i+1))

# activities (3 per column) + output
ay=214; ah=78; ag=12
for i in range(6):
    for j in range(3):
        # first activity of a column that involves people → mark manual with a person icon to its left
        N("a%d_%d"%(i,j),"proc",cx(i),ay+j*(ah+ag),colw,ah,L["acts"][i][j])
    N("o%d"%i,"out",cx(i),ay+3*(ah+ag),colw,44,L["outs"][i])
    E("st%d"%i,"a%d_0"%i); E("a%d_0"%i,"a%d_1"%i); E("a%d_1"%i,"a%d_2"%i); E("a%d_2"%i,"o%d"%i)

# guiding principles boundary + 4 notes
pb_y=ay+3*(ah+ag)+70
N("pbound","boundary",40,pb_y,W-80,132,L["principlesLabel"])
pw=(W-80-3*16-40)/4
for k,txt in enumerate(L["principles"]):
    N("pr%d"%k,"soft",60+k*(pw+16),pb_y+34,pw,74,txt,glyphs=[])

# legend row (bottom)
lg_y=pb_y+150
N("lgband","band",40,lg_y,W-80,30,L["legendLabel"])
items=L["legend"]; iw=(W-80)/len(items)
for k,(kind,lab) in enumerate(items):
    N("lg%d"%k,"legend",50+k*iw,lg_y+40,iw-10,40,lab,kind=kind)
