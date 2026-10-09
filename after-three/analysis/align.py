import json, re, difflib, subprocess
meta = subprocess.run(['ffprobe','-v','error','-show_entries','format_tags=lyrics','-of','json','../After Three.m4a'],capture_output=True,text=True).stdout
lyr = json.loads(meta)['format']['tags']['lyrics'].splitlines()
lines=[]; sec=None
for l in lyr:
    l=l.strip()
    if not l: continue
    if l.startswith('['): sec=l.strip('[]'); continue
    lines.append({'section':sec,'text':l})
norm=lambda w: re.sub(r"[^a-z0-9']","",w.lower().replace('’',"'"))
lw=[]
for i,L in enumerate(lines):
    for w in L['text'].split():
        if norm(w): lw.append((i,w))
r=json.load(open('analysis/stem0.wav.asr.json'))
asr=[]
for k,win in enumerate(r):
    s=win['start']; lo = 0 if k==0 else s+6; hi = s+18 if k<len(r)-1 else 999
    cur=None
    for tok,t in zip(win['tokens'],win['ts']):
        if tok.startswith(' ') or cur is None:
            if cur and lo<=cur[1]<hi: asr.append(cur)
            cur=[tok.strip(),t,t]
        else: cur[0]+=tok; cur[2]=t
    if cur and lo<=cur[1]<hi: asr.append(cur)
asr=[a for a in asr if norm(a[0])]
A=[norm(a[0]) for a in asr]; B=[norm(w) for _,w in lw]
# NW alignment
n,m=len(B),len(A)
import numpy as np
sim=lambda a,b: 2.0 if a==b else (1.0 if difflib.SequenceMatcher(None,a,b).ratio()>0.6 else -1.0)
D=np.zeros((n+1,m+1)); P=np.zeros((n+1,m+1),int)
gap=-0.6
for i in range(1,n+1): D[i,0]=i*gap; P[i,0]=1
for j in range(1,m+1): D[0,j]=j*gap; P[0,j]=2
for i in range(1,n+1):
    for j in range(1,m+1):
        c=[D[i-1,j-1]+sim(B[i-1],A[j-1]), D[i-1,j]+gap, D[i,j-1]+gap]
        k=int(np.argmax(c)); D[i,j]=c[k]; P[i,j]=k
i,j=n,m; match={}
while i>0 or j>0:
    k=P[i,j] if i>0 and j>0 else (1 if i>0 else 2)
    if k==0:
        if sim(B[i-1],A[j-1])>0: match[i-1]=j-1
        i-=1;j-=1
    elif k==1: i-=1
    else: j-=1
T=[None]*n
for i,j in match.items(): T[i]=asr[j][1]
# interpolate
known=[i for i in range(n) if T[i] is not None]
for i in range(n):
    if T[i] is None:
        prev=max([k for k in known if k<i],default=None); nxt=min([k for k in known if k>i],default=None)
        if prev is None: T[i]=T[nxt]-0.3*(nxt-i)
        elif nxt is None: T[i]=T[prev]+0.3*(i-prev)
        else: T[i]=T[prev]+(T[nxt]-T[prev])*(i-prev)/(nxt-prev)
print('matched',len(match),'of',n)
for L in lines: L['words']=[]
for (li,w),t,i in zip(lw,T,range(n)):
    lines[li]['words'].append({'w':w,'t':round(t,3),'m':i in match})
for L in lines:
    L['start']=L['words'][0]['t']
    print(f"{L['start']:7.2f} [{L['section'][:10]:10}] "+' '.join(f"{x['w']}{'' if x['m'] else '?'}@{x['t']:.2f}" for x in L['words']))
json.dump(lines,open('analysis/lyrics_aligned.json','w'),indent=1)
