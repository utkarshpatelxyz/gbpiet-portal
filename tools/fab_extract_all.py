import pypdfium2 as pdfium, re, json
from PIL import Image
import numpy as np
PDF='/root/.claude/uploads/706cbad2-49b2-5620-866d-c844ed50268d/d8707eec-PO_1074503320_Manufacturing_Schedule_1.pdf'
doc=pdfium.PdfDocument(PDF); S=3.0
MONTHS=[('JUL',7),('AUG',8),('SEP',9),('OCT',10),('NOV',11),('DEC',12),('JAN',1),('FEB',2),('MAR',3),('APR',4),('MAY',5),('JUN',6)]
MONTH_ORDER=['JUL','AUG','SEP','OCT','NOV','DEC','JAN','FEB','MAR','APR','MAY','JUN']

def build_seq(full,chars):
    anchors=[]; pos=0
    for nm in MONTH_ORDER:
        idx=full.find(nm,pos)
        if idx>=0:
            t=min(chars[idx+k][2] for k in range(len(nm)))
            mo=dict(MONTHS)[nm]; anchors.append((mo,t,nm)); pos=idx+len(nm)
    return anchors

def t2date(t,seq):
    # seq: list (mo,t,nm) in chronological order
    for i in range(len(seq)-1):
        mo,t0,_=seq[i]; _,t1,_=seq[i+1]
        if t < t1 or i==len(seq)-2:
            frac=(t-t0)/(t1-t0) if t1>t0 else 0
            d=int(round(1+frac*30.4)); d=max(1,min(31,d))
            return mo,d,i
    mo,t0,_=seq[-1]; return mo,1,len(seq)-1

def page_data(pi):
    pg=doc[pi]; W,H=pg.get_size(); tp=pg.get_textpage(); n=tp.count_chars()
    chars=[]
    for i in range(n):
        ch=tp.get_text_range(i,1); l,b,r,t=tp.get_charbox(i)
        chars.append((ch,(l+r)/2,(t+b)/2))  # char, row(l), time(t)
    full=''.join(c[0] for c in chars)
    seq=build_seq(full,chars)
    def find(rx,d=''):
        m=re.search(rx,full); return m.group(1).strip() if m else d
    tag=find(r'FOR\s+([0-9A-Za-z\-\.]+)')
    docno=find(r'DOC\.?\s*NO\.?\s*([A-Za-z0-9\-]+)')
    wo=find(r'Supplier\s*W/O\s*([A-Za-z0-9\-]+)')
    delv=find(r'([0-9]{1,2}-[A-Za-z]{3}-[0-9]{2})')
    revdate=find(r'([0-9]{4}-[0-9]{2}-[0-9]{2})')
    qty=find(r"Q'?TY\s*([0-9]+)")
    # description labels (left column: time<128, row 112..275)
    rects=[]
    for i in range(tp.count_rects()):
        l,b,r,t=tp.get_rect(i); txt=tp.get_text_bounded(l,b,r,t).strip()
        if txt: rects.append((txt,(l+r)/2,(t+b)/2))  # txt,row,time
    labels=[]
    for txt,row,time in rects:
        if time<128 and 112<=row<=278:
            # strip leading number tokens for items
            labels.append((row,txt))
    labels.sort()
    # Gantt step chars: time>=128, row 128..276
    step=[c for c in chars if c[2]>=128 and 128<=c[1]<=278 and c[0].strip()]
    # cluster into rows by l with tolerance
    step.sort(key=lambda c:(round(c[1]/6)*6,c[2]))
    rows={}
    for ch,row,time in step:
        placed=False
        for k in list(rows):
            if abs(k-row)<6:
                rows[k].append((time,ch)); placed=True; break
        if not placed: rows[row]=[(time,ch)]
    def tokenize(lst):
        lst.sort()
        groups=[]; cur=None
        for time,ch in lst:
            if cur and time-cur[-1][0]<4.2: cur.append((time,ch))
            else:
                if cur: groups.append(cur)
                cur=[(time,ch)]
        if cur: groups.append(cur)
        out=[]
        for g in groups:
            s=''.join(c for _,c in g).strip().strip(',').strip()
            s=s.replace(',,',',')
            if s and re.search(r'[A-Za-z]',s):
                out.append((sum(t for t,_ in g)/len(g),s))
        return out
    activities=[]
    for rowl in sorted(rows):
        toks=tokenize(rows[rowl])
        if not toks: continue
        # activity name = nearest left label
        name=None; best=1e9
        for lr,lt in labels:
            if abs(lr-rowl)<8 and abs(lr-rowl)<best:
                best=abs(lr-rowl); name=lt
        steps=[]
        for t,s in toks:
            mo,d,_=t2date(t,seq)
            steps.append({'s':s,'m':mo,'d':d,'t':round(t,1)})
        activities.append({'row':round(rowl,1),'name':name,'steps':steps})
    # data date (red line) via image
    img=doc[pi].render(scale=S).to_pil().convert('RGB'); a=np.asarray(img).astype(int)
    Rr,Gg,Bb=a[:,:,0],a[:,:,1],a[:,:,2]
    red=(Rr>150)&(Gg<90)&(Bb<90); redcol=red.sum(axis=0)
    # tall line = column with count > 0.4*max height of table
    thr=max(30, red.sum(axis=0).max()*0.5)
    cand=[x for x in range(len(redcol)) if redcol[x]>thr]
    data_t=None
    if cand:
        # pick the leftish tall line (the data line, not the flag)
        # group consecutive, take the one with most red
        best_x=max(cand,key=lambda x:redcol[x])
        data_t=best_x/S
    dd=t2date(data_t,seq) if data_t else None
    return dict(tag=tag,doc=docno,wo=wo,delivery=delv,rev=revdate,qty=qty,
                months=[m[0] for m in seq], seq=[(m,round(t,1)) for m,t,_ in seq],
                data_month=dd[0] if dd else None, data_day=dd[1] if dd else None,
                activities=activities)

out=[]
for pi in range(len(doc)):
    out.append(page_data(pi))
json.dump(out,open('fab_data.json','w'),indent=1)
# print summary
for p in out:
    acts=[f"{a['name']}({len(a['steps'])})" for a in p['activities']]
    print(f"{p['tag']:12} del={p['delivery']:10} data={p['data_month']}/{p['data_day']}  acts:", ' '.join(acts))
