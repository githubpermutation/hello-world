import sherpa_onnx as so, soundfile as sf, numpy as np, sys, time
M='/tmp/claude-0/-home-user-hello-world/0ce8ef3a-a386-5d52-9d4d-d8a354473e2e/scratchpad/models/'
cfg=so.OfflineSourceSeparationConfig(model=so.OfflineSourceSeparationModelConfig(
    uvr=so.OfflineSourceSeparationUvrModelConfig(model=M+'UVR_MDXNET_Main.onnx'),num_threads=4))
sep=so.OfflineSourceSeparation(cfg)
x,sr=sf.read('analysis/song.wav',dtype='float32',always_2d=True)
t=time.time()
out=sep.process(sample_rate=sr,samples=np.ascontiguousarray(x.T))
print('took',time.time()-t, len(out.stems))
for i,st in enumerate(out.stems):
    d=np.array(st.data)
    print(i,d.shape)
    sf.write(f'analysis/stem{i}.wav',d.T,out.sample_rate)
