import { useState } from 'react';
import ImageZoomModal from './ImageZoomModal';

export default function OutlinePicker({
  pokemonName,
  artworkUrl,
  variants,
  onSelect,
  selectingId,
}) {
  const [zoomTarget, setZoomTarget] = useState(null);

  const closeZoom = () => setZoomTarget(null);

  const handleSelectFromZoom = () => {
    if (!zoomTarget || selectingId) return;
    onSelect(zoomTarget);
    closeZoom();
  };

  return (
    <>
      <div className="content-card outline-picker">
        <div className="outline-picker-header">
          <div>
            <h2>{pokemonName}</h2>
            <p>마음에 드는 색칠도안 스타일을 선택해 주세요</p>
          </div>
          <button
            type="button"
            className="outline-picker-ref-btn"
            onClick={() => setZoomTarget({
              id: 'artwork',
              label: '원본',
              description: '컬러 일러스트',
              previewDataUrl: artworkUrl,
            })}
            aria-label={`${pokemonName} 원본 이미지 크게 보기`}
          >
            <img
              className="outline-picker-ref"
              src={artworkUrl}
              alt={`${pokemonName} 원본`}
              crossOrigin="anonymous"
            />
          </button>
        </div>

        <div className="outline-picker-grid">
          {variants.map((variant) => {
            const isSelecting = selectingId === variant.id;

            return (
              <div key={variant.id} className="outline-picker-card">
                <button
                  type="button"
                  className="outline-picker-preview"
                  onClick={() => setZoomTarget(variant)}
                  disabled={Boolean(selectingId)}
                  aria-label={`${pokemonName} ${variant.label} 색칠도안 크게 보기`}
                >
                  <img
                    src={variant.previewDataUrl}
                    alt={`${pokemonName} ${variant.label} 색칠도안`}
                  />
                  {isSelecting && <span className="outline-picker-spinner" aria-hidden="true" />}
                </button>

                <button
                  type="button"
                  className="outline-picker-meta"
                  onClick={() => onSelect(variant)}
                  disabled={Boolean(selectingId)}
                  aria-busy={isSelecting}
                >
                  <strong>{variant.label}</strong>
                  <span>{variant.description}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <ImageZoomModal
        isOpen={Boolean(zoomTarget)}
        imageUrl={zoomTarget?.previewDataUrl}
        title={zoomTarget ? `${pokemonName} · ${zoomTarget.label}` : ''}
        subtitle={zoomTarget?.description}
        onClose={closeZoom}
        onSelect={zoomTarget?.id === 'artwork' ? undefined : handleSelectFromZoom}
        selectLabel="이 도안 선택"
      />
    </>
  );
}
