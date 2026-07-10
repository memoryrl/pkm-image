import { useEffect, useRef, useState } from 'react';
import ImageZoomModal from './ImageZoomModal';

export default function PrintArea({
  artworkUrl,
  pokemonName,
  speciesId,
  types,
  outlineDataUrl,
}) {
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
        <div className="print-sheet">
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
          <div className="print-meta">
            <div className="print-meta-main">
              {speciesId != null && (
                <span className="print-outline-text print-species-no">
                  No. {String(speciesId).padStart(4, '0')}
                </span>
              )}
              <h2 className="print-outline-text print-outline-name">{pokemonName}</h2>
            </div>
            {types?.length > 0 && (
              <div className="print-types" aria-label="타입">
                {types.map((type) => (
                  <span key={type.name} className="print-type-badge">
                    {type.koreanName}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <ImageZoomModal
        isOpen={showRefZoom}
        imageUrl={artworkUrl}
        title={`${pokemonName} · 원본`}
        subtitle="컬러 일러스트"
        speciesId={speciesId}
        types={types}
        onClose={() => setShowRefZoom(false)}
      />
    </>
  );
}
