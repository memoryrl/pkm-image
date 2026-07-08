function boxBlur(src, w, h, radius) {
  const dst = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      let count = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
            sum += src[ny * w + nx];
            count++;
          }
        }
      }
      dst[y * w + x] = sum / count;
    }
  }
  return dst;
}

function sobelEdges(gray, w, h) {
  const edges = new Float32Array(w * h);
  const gxK = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const gyK = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      let gx = 0;
      let gy = 0;
      let ki = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const val = gray[(y + ky) * w + (x + kx)];
          gx += val * gxK[ki];
          gy += val * gyK[ki];
          ki++;
        }
      }
      edges[y * w + x] = Math.sqrt(gx * gx + gy * gy);
    }
  }
  return edges;
}

function dilate(mask, w, h, radius) {
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let found = 0;
      for (let dy = -radius; dy <= radius && !found; dy++) {
        for (let dx = -radius; dx <= radius && !found; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx >= 0 && nx < w && ny >= 0 && ny < h && mask[ny * w + nx]) {
            found = 1;
          }
        }
      }
      out[y * w + x] = found;
    }
  }
  return out;
}

/**
 * 컬러 일러스트 → 투명 배경 + 검은 외곽선 색칠도안 (초기 버전)
 * Sobel 엣지 검출 + 1px 팽창으로 선을 두껍게
 */
export function convertToOutline(sourceImg, canvas, maxSize = 900) {
  let w = sourceImg.naturalWidth;
  let h = sourceImg.naturalHeight;

  if (w > maxSize || h > maxSize) {
    const scale = maxSize / Math.max(w, h);
    w = Math.round(w * scale);
    h = Math.round(h * scale);
  }

  const temp = document.createElement('canvas');
  temp.width = w;
  temp.height = h;
  const tctx = temp.getContext('2d', { willReadFrequently: true });
  tctx.drawImage(sourceImg, 0, 0, w, h);

  const { data } = tctx.getImageData(0, 0, w, h);
  const gray = new Float32Array(w * h);

  for (let i = 0; i < w * h; i++) {
    const p = i * 4;
    const a = data[p + 3] / 255;
    gray[i] = (0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2]) * a;
  }

  const blurred = boxBlur(gray, w, h, 1);
  const edges = sobelEdges(blurred, w, h);

  let maxEdge = 0;
  for (let i = 0; i < edges.length; i++) {
    if (edges[i] > maxEdge) maxEdge = edges[i];
  }
  const threshold = maxEdge * 0.12;

  const edgeMask = new Uint8Array(w * h);
  for (let i = 0; i < edges.length; i++) {
    edgeMask[i] = edges[i] > threshold ? 1 : 0;
  }

  const dilated = dilate(edgeMask, w, h, 1);

  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  const out = ctx.createImageData(w, h);

  for (let i = 0; i < w * h; i++) {
    const p = i * 4;
    if (dilated[i]) {
      out.data[p] = 0;
      out.data[p + 1] = 0;
      out.data[p + 2] = 0;
      out.data[p + 3] = 255;
    } else {
      out.data[p + 3] = 0;
    }
  }

  ctx.putImageData(out, 0, 0);
}
