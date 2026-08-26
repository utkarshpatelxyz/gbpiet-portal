import pypdfium2 as pdfium, re, json, datetime
from PIL import Image
import numpy as np
PDF='/root/.claude/uploads/706cbad2-49b2-5620-866d-c844ed50268d/d8707eec-PO_1074503320_Manufacturing_Schedule_1.pdf'
doc=pdfium.PdfDocument(PDF); S=3.0
MONTHS_SEQ=[7,8,9,10,11,12,1,2,3,4,5,6]  # timeline month order starting JUL 2026

def chars_of(pg):
    tp=pg.get_textpage(); n=tp.count_chars(); C=[]
    for i in range(n):
        ch=tp.get_text_range(i,1); l,b,r,t=tp.get_charbox(i)
        C.append((ch,(l+r)/2,(t+b)/2))  # char, row(l), time(t)
    return C,tp

def day_anchors(C):
    """Build (t, date) anchors from the day-number header row (5,10,15,20,25,30 / month)."""
    day=[c for c in C if 110<=c[1]<=119 and c[0].strip().isdigit()]
    day.sort(key=lambda c:c[2])
    marks=[]; cur=None
    for ch,row,time in day:
        if cur and time-cur[-1][2]<6: cur.append((ch,row,time))
        else:
            if cur: marks.append(cur)
            cur=[(ch,row,time)]
    if cur: marks.append(cur)
    mk=[(sum(t for _,_,t in g)/len(g), int(''.join(c for c,_,_ in g))) for g in marks]
    anchors=[]
    for i,(t,dv) in enumerate(mk):
        mo=MONTHS_SEQ[(i//6) % len(MONTHS_SEQ)]
        yr=2026 if mo>=7 else 2027
        try: anchors.append((t, datetime.date(yr,mo,dv)))
        except ValueError: pass
    return anchors

def t_to_date(t, anchors):
    if not anchors: return None
    if t<=anchors[0][0]: return anchors[0][1]
    for i in range(len(anchors)-1):
        t0,d0=anchors[i]; t1,d1=anchors[i+1]
        if t<=t1:
            frac=(t-t0)/(t1-t0) if t1>t0 else 0
            return d0+(d1-d0)*frac
    # extrapolate slightly past last
    t0,d0=anchors[-2]; t1,d1=anchors[-1]
    frac=(t-t0)/(t1-t0) if t1>t0 else 0
    return d0+(d1-d0)*frac

def page_data(pi):
    pg=doc[pi]; W,H=pg.get_size(); C,tp=chars_of(pg)
    full=''.join(c[0] for c in C)
    anchors=day_anchors(C)
    def find(rx,d=''):
        m=re.search(rx,full); return m.group(1).strip() if m else d
    tag=find(r'FOR\s+([0-9A-Za-z\-\.]+)')
    docno=find(r'DOC\.?\s*NO\.?\s*([A-Za-z0-9\-]+)')
    wo=find(r'Supplier\s*W/O\s*([A-Za-z0-9\-]+)')
    delv=find(r'([0-9]{1,2}-[A-Za-z]{3}-[0-9]{2})')
    revdate=find(r'([0-9]{4}-[0-9]{2}-[0-9]{2})')
    qty=find(r"Q'?TY\s*([0-9]+)")
    # left-column description labels
    rects=[]
    for i in range(tp.count_rects()):
        l,b,r,t=tp.get_rect(i); txt=tp.get_text_bounded(l,b,r,t).strip()
        if txt: rects.append((txt,(l+r)/2,(t+b)/2))
    labels=[(row,txt) for txt,row,time in rects if time<128 and 112<=row<=278]
    labels.sort()
    # gantt step chars
    step=[c for c in C if c[2]>=128 and 128<=c[1]<=278 and c[0].strip()]
    step.sort(key=lambda c:(round(c[1]/6)*6,c[2]))
    rows={}
    for ch,row,time in step:
        placed=False
        for k in list(rows):
            if abs(k-row)<6: rows[k].append((time,ch)); placed=True; break
        if not placed: rows[row]=[(time,ch)]
    def tokenize(lst):
        lst.sort(); groups=[]; cur=None
        for time,ch in lst:
            if cur and time-cur[-1][0]<4.2: cur.append((time,ch))
            else:
                if cur: groups.append(cur)
                cur=[(time,ch)]
        if cur: groups.append(cur)
        out=[]
        for g in groups:
            s=''.join(c for _,c in g).strip().strip(',').strip().replace(',,',',')
            if s and re.search(r'[A-Za-z]',s): out.append((sum(t for t,_ in g)/len(g),s))
        return out
    activities=[]
    for rowl in sorted(rows):
        toks=tokenize(rows[rowl])
        if not toks: continue
        name=None; best=1e9
        for lr,lt in labels:
            if abs(lr-rowl)<8 and abs(lr-rowl)<best: best=abs(lr-rowl); name=lt
        steps=[]
        for t,s in toks:
            dt=t_to_date(t,anchors)
            if dt: steps.append({'s':s,'m':dt.month,'d':dt.day,'t':round(t,1)})
        activities.append({'row':round(rowl,1),'name':name,'steps':steps})
    # data date (red line)
    a=np.asarray(doc[pi].render(scale=S).to_pil().convert('RGB')).astype(int)
    R,G,B=a[:,:,0],a[:,:,1],a[:,:,2]; red=(R>150)&(G<90)&(B<90); rc=red.sum(axis=0)
    x=int(max(range(len(rc)),key=lambda i:rc[i]))
    dd=t_to_date(x/S,anchors)
    return dict(tag=tag,doc=docno,wo=wo,delivery=delv,rev=revdate,qty=qty,
                data_month=dd.month if dd else None, data_day=dd.day if dd else None,
                data_year=dd.year if dd else None, activities=activities)

out=[page_data(pi) for pi in range(len(doc))]
json.dump(out,open('fab_data.json','w'),indent=1)
for p in out:
    a0=p['activities'][0] if p['activities'] else {'steps':[]}
    s0=a0['steps'][:3]
    print(f"{p['tag']:12} del={p['delivery']:10} data={p['data_month']}/{p['data_day']}/{p['data_year']}  {a0.get('name')}: "+' '.join(f"{x['s']}@{x['m']}/{x['d']}" for x in s0))
