"""ACE-Step で作ったBGMを、アプリで流せる形に整える。
   1) 頭の小さいイントロと末尾の無音を切る  2) 低音を持ち上げる
   3) 音量をそろえ、ピークを -1dBFS に抑えて音割れを防ぐ
   使い方: python master_bgm.py <入力フォルダ> <出力フォルダ>
   ComfyUI の venv（numpy / scipy / av 入り）で動かす。"""
import sys, glob, os
import numpy as np
import av
from scipy.signal import lfilter
from scipy.ndimage import maximum_filter1d, uniform_filter1d

SR = 48000
BASS_DB, BASS_HZ = 8.0, 100.0   # 低音の持ち上げ量と境目
TARGET_RMS_DB = -13.0          # そろえる音量
CEILING = 10 ** (-1.0 / 20)     # ピーク上限 -1dBFS


def load(path):
    c = av.open(path)
    rs = av.AudioResampler(format='fltp', layout='stereo', rate=SR)
    parts = []
    for fr in c.decode(audio=0):
        for r in rs.resample(fr):
            parts.append(r.to_ndarray())
    return np.concatenate(parts, axis=1).astype(np.float64)


def rms_db(x):
    return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12)


def trim(x):
    """本編の音量から12dB以上小さい頭と尻を落とす（50ms単位で判定）"""
    w = SR // 20
    mono = x.mean(0)
    n = len(mono) // w
    lv = np.array([rms_db(mono[i * w:(i + 1) * w]) for i in range(n)])
    body = np.median(lv[lv > lv.max() - 30])
    loud = np.where(lv > body - 12)[0]
    a, b = loud[0] * w, min(len(mono), (loud[-1] + 1) * w)
    y = x[:, a:b].copy()
    fi, fo = int(SR * 0.01), int(SR * 0.5)
    y[:, :fi] *= np.linspace(0, 1, fi)
    y[:, -fo:] *= np.linspace(1, 0, fo)
    return y, a / SR, (len(mono) - b) / SR


def low_shelf(x, gain_db, f0):
    """RBJ のローシェルフ"""
    A = 10 ** (gain_db / 40)
    w0 = 2 * np.pi * f0 / SR
    alpha = np.sin(w0) / 2 * np.sqrt(2)
    cw = np.cos(w0)
    b = [A * ((A + 1) - (A - 1) * cw + 2 * np.sqrt(A) * alpha),
         2 * A * ((A - 1) - (A + 1) * cw),
         A * ((A + 1) - (A - 1) * cw - 2 * np.sqrt(A) * alpha)]
    a = [(A + 1) + (A - 1) * cw + 2 * np.sqrt(A) * alpha,
         -2 * ((A - 1) + (A + 1) * cw),
         (A + 1) + (A - 1) * cw - 2 * np.sqrt(A) * alpha]
    return lfilter(np.array(b) / a[0], np.array(a) / a[0], x, axis=1)


def limit(x):
    """先読み付きの簡易リミッター。ピークが上限を超える所だけ滑らかに下げる"""
    peak = np.abs(x).max(0)
    look = int(SR * 0.005)
    env = maximum_filter1d(peak, size=2 * look + 1)
    gain = np.minimum(1.0, CEILING / np.maximum(env, 1e-9))
    gain = maximum_filter1d(gain[::-1], size=1, mode='nearest')[::-1]
    gain = uniform_filter1d(gain, size=look * 2 + 1)            # 角を丸める
    gain = np.minimum(gain, CEILING / np.maximum(env, 1e-9))    # 丸めた分の超過を戻す
    return x * gain


def save(path, x):
    c = av.open(path, 'w')
    s = c.add_stream('libmp3lame', rate=SR, layout='stereo')
    s.bit_rate = 192000
    x = np.clip(x, -1, 1).astype(np.float32)
    step = 1152 * 8
    for i in range(0, x.shape[1], step):
        fr = av.AudioFrame.from_ndarray(np.ascontiguousarray(x[:, i:i + step]), format='fltp', layout='stereo')
        fr.sample_rate = SR
        for p in s.encode(fr):
            c.mux(p)
    for p in s.encode(None):
        c.mux(p)
    c.close()


def main(src, dst):
    os.makedirs(dst, exist_ok=True)
    for f in sorted(glob.glob(os.path.join(src, '*.mp3'))):
        x = load(f)
        x, cut_head, cut_tail = trim(x)
        x = low_shelf(x, BASS_DB, BASS_HZ)
        x *= 10 ** ((TARGET_RMS_DB - rms_db(x)) / 20)
        before = int((np.abs(x) > CEILING).sum())
        x = limit(x)
        name = os.path.basename(f).replace('_00001', '')
        save(os.path.join(dst, name), x)
        print(f"{name}: 頭{cut_head:.1f}s/尻{cut_tail:.1f}s カット, 長さ{x.shape[1]/SR:.0f}s, "
              f"RMS {rms_db(x):.1f}dB, ピーク {20*np.log10(np.abs(x).max()):.1f}dB, 抑えた箇所 {before}")


if __name__ == '__main__':
    main(sys.argv[1], sys.argv[2])
