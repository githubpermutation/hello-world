import json, numpy as np, soundfile as sf
from scipy.signal import butter, sosfiltfilt
lines=json.load(open('analysis/lyrics_aligned.json'))
def setw(L, times):
    for w,t in zip(L['words'],times): w['t']=t; w['m']=True
    L['start']=L['words'][0]['t']
# chorus "One," fixes: one bar (4 beats) before "Two"
for i,L in enumerate(lines):
    if L['words'][0]['w'].lower().startswith('one') and L['section'].startswith('Chorus'):
        L['words'][0]['t']=round(lines[i+1]['start']-2.288,3); L['start']=L['words'][0]['t']
outro=[i for i,L in enumerate(lines) if L['text'].startswith('Never made')]
setw(lines[outro[1]],[147.95,148.72,148.96,149.12,149.36,149.6])
setw(lines[outro[2]],[152.2,152.72,153.36,153.52,153.84,154.08])
setw(lines[outro[3]],[160.85,161.44,162.16,162.32,162.64,162.8])
# Verse 3 "in my shoe": shoe 121.44 ok
for i,L in enumerate(lines):
    nxt = lines[i+1]['start'] if i+1<len(lines) else 165
    last=L['words'][-1]['t']
    L['end']=round(min(nxt-0.05, last+1.6),3)
    for j,w in enumerate(L['words']):
        w['d']=round(((L['words'][j+1]['t'] if j+1<len(L['words']) else min(L['end'],w['t']+0.8))-w['t']),3)
        w.pop('m',None)
# envelopes
x,sr=sf.read('analysis/song.wav',dtype='float32'); x=x.mean(1)
def bp(lo,hi):
    if lo==0: sos=butter(4,hi,btype='low',fs=sr,output='sos')
    elif hi==0: sos=butter(4,lo,btype='high',fs=sr,output='sos')
    else: sos=butter(4,[lo,hi],btype='band',fs=sr,output='sos')
    return sosfiltfilt(sos,x)
FPS=60; hop=sr//FPS
def env(sig, att=0.0, rel=0.85):
    n=len(sig)//hop
    r=np.sqrt((sig[:n*hop].reshape(n,hop)**2).mean(1))
    db=20*np.log10(r+1e-7)
    lo,hi=np.percentile(db,5),np.percentile(db,99.5)
    v=np.clip((db-lo)/(hi-lo),0,1)
    out=np.zeros_like(v); s=0
    for i,a in enumerate(v):
        s = a if a>s else s*rel+a*(1-rel)
        out[i]=s
    return out
voc,_=sf.read('analysis/stem0.wav',dtype='float32'); voc=voc.mean(1)
E={'rms':env(x),'low':env(bp(0,110),rel=0.8),'mid':env(bp(300,2500)),'high':env(bp(5000,0),rel=0.7)}
n=len(voc)//hop; vr=np.sqrt((voc[:n*hop].reshape(n,hop)**2).mean(1)); vdb=20*np.log10(vr+1e-7)
E['voc']=np.clip((vdb-np.percentile(vdb,20))/(np.percentile(vdb,99.5)-np.percentile(vdb,20)),0,1)
# kick onsets
low=bp(0,110); n=len(low)//hop; lr=np.sqrt((low[:n*hop].reshape(n,hop)**2).mean(1))
ld=np.log(lr+1e-5); fl=np.maximum(0,np.diff(ld,prepend=ld[0]))
kicks=[]
for i in range(2,n-2):
    if fl[i]>0.35 and fl[i]==fl[i-2:i+3].max() and lr[i+2]>0.02:
        if not kicks or i/FPS-kicks[-1]>0.2: kicks.append(round(i/FPS,3))
bpm=104.91; ph=0.369; p=60/bpm
beats=[round(ph+i*p,3) for i in range(int((165-ph)/p)+1)]
down=[round(ph+i*p,3) for i in range(len(beats)) if (i%4==3 if i<208 else i%4==0)]
data={'duration':165.0,'bpm':bpm,'beats':beats,'downbeats':down,'kicks':kicks,'fps':FPS,
 'env':{k:[int(round(v*255)) for v in a] for k,a in E.items()},'lines':lines}
json.dump(data,open('analysis/data.json','w'),separators=(',',':'))
print(len(kicks),'kicks; first', kicks[:12]); print('size',len(json.dumps(data))//1024,'KB')
