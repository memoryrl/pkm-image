import { useEffect } from 'react';

export default function ImageZoomModal({
  isOpen,
  imageUrl,
  title,
  subtitle,
  speciesId,
  types,
  onClose,
  onSelect,
  selectLabel = '이 도안 선택',
}) {
  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !imageUrl) return null;

  return (
    <div
      className="image-zoom-overlay no-print"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="image-zoom-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="image-zoom-close"
          onClick={onClose}
          aria-label="닫기"
        >
          ×
        </button>

        {(title || subtitle || speciesId != null || types?.length > 0) && (
          <div className="image-zoom-header">
            {(title || speciesId != null) && (
              <div className="image-zoom-title-row">
                {speciesId != null && (
                  <span className="image-zoom-no">
                    No. {String(speciesId).padStart(4, '0')}
                  </span>
                )}
                {title && <strong>{title}</strong>}
              </div>
            )}
            {types?.length > 0 && (
              <div className="image-zoom-types" aria-label="타입">
                {types.map((type) => (
                  <span key={type.name} className="image-zoom-type">
                    {type.koreanName}
                  </span>
                ))}
              </div>
            )}
            {subtitle && <span className="image-zoom-subtitle">{subtitle}</span>}
          </div>
        )}

        <div className="image-zoom-body">
          <img src={imageUrl} alt={title || '확대 이미지'} />
        </div>

        {onSelect && (
          <button type="button" className="image-zoom-select" onClick={onSelect}>
            {selectLabel}
          </button>
        )}
      </div>
    </div>
  );
}
