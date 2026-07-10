import { useEffect, useRef, useState } from 'react';
import ImageZoomModal from './ImageZoomModal';

export default function PrintArea({ artworkUrl, pokemonName, outlineDataUrl, presetLabel }) {
  const canvasRef = useRef(null);
  const [showRefZoom, setShowRefZoom] = useState(false);

  useEffect(() => {
    if (!outlineDataUrl || !canvasRef.current) return;

    const img = new Image();
    img.onload = () => {
      const canvas = canvasRef.current;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext('2d').drawImage(img, 0, 0);
    };
    img.src = outlineDataUrl;
  }, [outlineDataUrl]);

  return (
    <>
      <div className="content-card print-area visible">
        <div className="outline-wrap">
          <canvas ref={canvasRef} className="outline-canvas" />
          <button
            type="button"
            className="ref-image-btn"
            onClick={() => setShowRefZoom(true)}
            aria-label={`${pokemonName} 원본 이미지 크게 보기`}
          >
            <img
              className="ref-image"
              src={artworkUrl}
              alt={`${pokemonName} 원본`}
              crossOrigin="anonymous"
            />
          </button>
        </div>
        <p className="pokemon-name-tag">
          {pokemonName}
          {presetLabel ? ` · ${presetLabel}` : ''}
        </p>
      </div>

      <ImageZoomModal
        isOpen={showRefZoom}
        imageUrl={artworkUrl}
        title={`${pokemonName} · 원본`}
        subtitle="컬러 일러스트"
        onClose={() => setShowRefZoom(false)}
      />
    </>
  );
}
