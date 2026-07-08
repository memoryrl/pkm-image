import { useEffect, useRef } from 'react';

export default function PrintArea({ artworkUrl, pokemonName, outlineDataUrl }) {
  const canvasRef = useRef(null);

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
    <div className="print-area visible">
      <div className="outline-wrap">
        <canvas ref={canvasRef} className="outline-canvas" />
        <img
          className="ref-image"
          src={artworkUrl}
          alt={`${pokemonName} 원본`}
          crossOrigin="anonymous"
        />
      </div>
      <p className="pokemon-name-tag">{pokemonName}</p>
    </div>
  );
}
