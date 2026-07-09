import { useEffect } from 'react';

export default function ImageZoomModal({
  isOpen,
  imageUrl,
  title,
  subtitle,
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

        {(title || subtitle) && (
          <div className="image-zoom-header">
            {title && <strong>{title}</strong>}
            {subtitle && <span>{subtitle}</span>}
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
