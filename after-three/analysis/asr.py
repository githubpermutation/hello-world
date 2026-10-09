import sherpa_onnx as so, soundfile as sf, numpy as np, json, librosa
M='/tmp/claude-0/-home-user-hello-world/0ce8ef3a-a386-5d52-9d4d-d8a354473e2e/scratchpad/models/sherpa-onnx-nemo-parakeet-tdt-0.6b-v2-int8/'
for i in (0,1):
    d,sr=sf.read(f'analysis/stem{i}.wav',dtype='float32')
    print(i, 'rms 0-2s',np.sqrt((d[:2*sr]**2).mean()), 'rms 112-118', np.sqrt((d[112*sr:118*sr]**2).mean()), 'rms all', np.sqrt((d**2).mean()))
rec=so.OfflineRecognizer.from_transducer(encoder=M+'encoder.int8.onnx',decoder=M+'decoder.int8.onnx',joiner=M+'joiner.int8.onnx',tokens=M+'tokens.txt',model_type='nemo_transducer',num_threads=4)
import sys
stem=sys.argv[1]
d,sr=sf.read(stem,dtype='float32'); d=d.mean(1)
d=librosa.resample(d,orig_sr=sr,target_sr=16000); sr=16000
res=[]
W=24; H=12
for s in np.arange(0,166,H):
    seg=d[int(s*sr):int((s+W)*sr)]
    st=rec.create_stream(); st.accept_waveform(sr,seg); rec.decode_stream(st)
    r=st.result
    print(f'[{s}] {r.text}')
    res.append({'start':float(s),'text':r.text,'tokens':list(r.tokens),'ts':[float(x)+s for x in r.timestamps]})
json.dump(res,open(stem+'.asr.json','w'))
