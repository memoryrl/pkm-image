/**
 * 색칠도안 품질 프리셋
 *
 * 포켓몬 공식 일러스트에는 이미 어두운 외곽선이 그려져 있으므로,
 * "주변보다 확실히 어두운 픽셀"만 골라내면(적응형 임계값) 원본의
 * 선을 그대로 추출할 수 있다. 그라데이션·그림자는 주변과의 밝기
 * 차가 작아 자동으로 제외된다.
 *
 * darknessDelta: 주변 평균보다 이만큼 어두워야 선으로 인정 (클수록 단순)
 * maxLineLum:   선으로 인정할 최대 밝기 (절대값 상한)
 * dilateRadius: 선 두께
 * minComponentSize: 제거할 잡티 최소 크기(px)
 * smoothRadius: 선 가장자리 둥글리기 강도
 */
export const OUTLINE_PRESETS = [
  {
    id: 'simple',
    label: '심플',
    description: '굵은 선 · 쉬운 색칠',
    darknessDelta: 52,
    maxLineLum: 115,
    dilateRadius: 3,
    minComponentSize: 80,
    smoothRadius: 2,
  },
  {
    id: 'standard',
    label: '기본',
    description: '균형 잡힌 도안',
    darknessDelta: 44,
    maxLineLum: 135,
    dilateRadius: 2,
    minComponentSize: 40,
    smoothRadius: 1.5,
  },
  {
    id: 'detailed',
    label: '디테일',
    description: '섬세한 선',
    darknessDelta: 34,
    maxLineLum: 155,
    dilateRadius: 2,
    minComponentSize: 20,
    smoothRadius: 1,
  },
  {
    id: 'fine',
    label: '정밀',
    description: '세밀한 표현',
    darknessDelta: 26,
    maxLineLum: 175,
    dilateRadius: 1,
    minComponentSize: 10,
    smoothRadius: 1,
  },
];

/** 적분 이미지 기반 박스 블러 (큰 반경도 O(n)) */
function boxBlurFloat(src, w, h, radius) {
  if (radius <= 0) return src;

  const iw = w + 1;
  const integral = new Float64Array(iw * (h + 1));
  for (let y = 0; y < h; y++) {
    let rowSum = 0;
    for (let x = 0; x < w; x++) {
      rowSum += src[y * w + x];
      integral[(y + 1) * iw + (x + 1)] = integral[y * iw + (x + 1)] + rowSum;
    }
  }

  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - radius);
    const y1 = Math.min(h - 1, y + radius);
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - radius);
      const x1 = Math.min(w - 1, x + radius);
      const sum =
        integral[(y1 + 1) * iw + (x1 + 1)] -
        integral[y0 * iw + (x1 + 1)] -
        integral[(y1 + 1) * iw + x0] +
        integral[y0 * iw + x0];
      out[y * w + x] = sum / ((y1 - y0 + 1) * (x1 - x0 + 1));
    }
  }
  return out;
}

/** 가로/세로 2패스 팽창 (사각 구조 요소) */
function dilate(mask, w, h, radius) {
  if (radius <= 0) return mask;

  const tmp = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let found = 0;
      const x0 = Math.max(0, x - radius);
      const x1 = Math.min(w - 1, x + radius);
      for (let nx = x0; nx <= x1 && !found; nx++) {
        if (mask[y * w + nx]) found = 1;
      }
      tmp[y * w + x] = found;
    }
  }

  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    const y0 = Math.max(0, y - radius);
    const y1 = Math.min(h - 1, y + radius);
    for (let x = 0; x < w; x++) {
      let found = 0;
      for (let ny = y0; ny <= y1 && !found; ny++) {
        if (tmp[ny * w + x]) found = 1;
      }
      out[y * w + x] = found;
    }
  }
  return out;
}

function erode(mask, w, h, radius) {
  if (radius <= 0) return mask;

  const inverted = new Uint8Array(w * h);
  for (let i = 0; i < mask.length; i++) inverted[i] = mask[i] ? 0 : 1;
  const dilatedInv = dilate(inverted, w, h, radius);
  const out = new Uint8Array(w * h);
  for (let i = 0; i < mask.length; i++) out[i] = dilatedInv[i] ? 0 : 1;
  return out;
}

/** 끊긴 선 잇기 (닫힘 연산) */
function closing(mask, w, h, radius) {
  if (radius <= 0) return mask;
  return erode(dilate(mask, w, h, radius), w, h, radius);
}

/** 작은 잡티 제거 (연결 요소 분석) */
function removeSmallComponents(mask, w, h, minSize) {
  if (minSize <= 1) return mask;

  const cleaned = new Uint8Array(mask);
  const visited = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);

  for (let start = 0; start < w * h; start++) {
    if (!cleaned[start] || visited[start]) continue;

    let head = 0;
    let tail = 0;
    queue[tail++] = start;
    visited[start] = 1;

    while (head < tail) {
      const current = queue[head++];
      const cx = current % w;
      const cy = (current / w) | 0;

      if (cx > 0) {
        const ni = current - 1;
        if (cleaned[ni] && !visited[ni]) { visited[ni] = 1; queue[tail++] = ni; }
      }
      if (cx < w - 1) {
        const ni = current + 1;
        if (cleaned[ni] && !visited[ni]) { visited[ni] = 1; queue[tail++] = ni; }
      }
      if (cy > 0) {
        const ni = current - w;
        if (cleaned[ni] && !visited[ni]) { visited[ni] = 1; queue[tail++] = ni; }
      }
      if (cy < h - 1) {
        const ni = current + w;
        if (cleaned[ni] && !visited[ni]) { visited[ni] = 1; queue[tail++] = ni; }
      }
    }

    if (tail < minSize) {
      for (let k = 0; k < tail; k++) cleaned[queue[k]] = 0;
    }
  }

  return cleaned;
}

/**
 * 마스크를 살짝 블러링한 뒤 부드러운 알파로 그려
 * 계단 현상 없는 매끄러운 선을 만든다.
 */
function renderSmoothMask(mask, w, h, canvas, smoothRadius) {
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  const out = ctx.createImageData(w, h);

  const float = new Float32Array(w * h);
  for (let i = 0; i < mask.length; i++) float[i] = mask[i];
  const blurred = boxBlurFloat(float, w, h, Math.max(1, Math.round(smoothRadius)));

  for (let i = 0; i < w * h; i++) {
    // 0.5 근처를 급격히 전환시켜 선명하면서도 부드러운 가장자리 생성
    const v = Math.min(1, Math.max(0, (blurred[i] - 0.3) / 0.4));
    const p = i * 4;
    out.data[p] = 0;
    out.data[p + 1] = 0;
    out.data[p + 2] = 0;
    out.data[p + 3] = Math.round(v * 255);
  }

  ctx.putImageData(out, 0, 0);
}

/**
 * 컬러 일러스트 → 투명 배경 + 검은 외곽선 색칠도안
 */
export function convertToOutline(
  sourceImg,
  canvas,
  {
    maxSize = 900,
    darknessDelta = 44,
    maxLineLum = 135,
    dilateRadius = 2,
    minComponentSize = 40,
    smoothRadius = 1.5,
  } = {},
) {
  // 작은 원본도 maxSize까지 확대해 보간으로 매끄러운 경계를 얻는다
  const srcW = sourceImg.naturalWidth;
  const srcH = sourceImg.naturalHeight;
  const scale = maxSize / Math.max(srcW, srcH);
  const w = Math.round(srcW * scale);
  const h = Math.round(srcH * scale);

  const temp = document.createElement('canvas');
  temp.width = w;
  temp.height = h;
  const tctx = temp.getContext('2d', { willReadFrequently: true });
  tctx.imageSmoothingEnabled = true;
  tctx.imageSmoothingQuality = 'high';
  tctx.drawImage(sourceImg, 0, 0, w, h);

  const { data } = tctx.getImageData(0, 0, w, h);

  // 흰 배경 합성 밝기 + 알파
  const lum = new Float32Array(w * h);
  const alpha = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const p = i * 4;
    const a = data[p + 3] / 255;
    const l = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
    lum[i] = l * a + 255 * (1 - a);
    alpha[i] = a;
  }

  // 적응형 임계값: 주변 평균보다 darknessDelta 이상 어두운 픽셀만 선으로
  const meanRadius = Math.max(6, Math.round(Math.max(w, h) / 40));
  const localMean = boxBlurFloat(lum, w, h, meanRadius);

  const mask = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) {
    if (alpha[i] < 0.4) continue;
    if (lum[i] < localMean[i] - darknessDelta && lum[i] < maxLineLum) {
      mask[i] = 1;
    }
  }

  // 실루엣(외곽 윤곽)은 항상 포함해 닫힌 도안을 보장
  const alphaBlurred = boxBlurFloat(alpha, w, h, 2);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const inside = alphaBlurred[i] >= 0.5;
      if (!inside) continue;
      if (
        alphaBlurred[i - 1] < 0.5 ||
        alphaBlurred[i + 1] < 0.5 ||
        alphaBlurred[i - w] < 0.5 ||
        alphaBlurred[i + w] < 0.5
      ) {
        mask[i] = 1;
      }
    }
  }

  let result = closing(mask, w, h, 1);
  result = removeSmallComponents(result, w, h, minComponentSize);
  result = dilate(result, w, h, dilateRadius);

  renderSmoothMask(result, w, h, canvas, smoothRadius);
}

export function generateOutlineVariants(sourceImg, { previewMaxSize = 512, fullMaxSize = 1000 } = {}) {
  return OUTLINE_PRESETS.map((preset) => {
    const previewCanvas = document.createElement('canvas');
    convertToOutline(sourceImg, previewCanvas, {
      maxSize: previewMaxSize,
      darknessDelta: preset.darknessDelta,
      maxLineLum: preset.maxLineLum,
      // 미리보기는 해상도가 절반이므로 두께·잡티 기준도 비례 축소
      dilateRadius: Math.max(1, Math.round(preset.dilateRadius / 2)),
      minComponentSize: Math.max(4, Math.round(preset.minComponentSize / 4)),
      smoothRadius: 1,
    });

    return {
      ...preset,
      previewDataUrl: previewCanvas.toDataURL('image/png'),
      fullMaxSize,
    };
  });
}

export function generateOutlineForPreset(sourceImg, preset, maxSize = 1000) {
  const canvas = document.createElement('canvas');
  convertToOutline(sourceImg, canvas, {
    maxSize,
    darknessDelta: preset.darknessDelta,
    maxLineLum: preset.maxLineLum,
    dilateRadius: preset.dilateRadius,
    minComponentSize: preset.minComponentSize,
    smoothRadius: preset.smoothRadius,
  });
  return canvas.toDataURL('image/png');
}
