import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchPokemonDexPage, getDexPageForSpeciesId, getTypeColor } from '../utils/pokemonApi';
import ImageZoomModal from './ImageZoomModal';

const SKELETON_COUNT = 10;

function TypeBadges({ types }) {
  if (!types?.length) return null;

  return (
    <div className="pokedex-types">
      {types.map((type) => (
        <span
          key={type.name}
          className="pokedex-type-badge"
          style={{ backgroundColor: getTypeColor(type.name) }}
        >
          {type.koreanName}
        </span>
      ))}
    </div>
  );
}

function PokedexCardSkeleton() {
  return (
    <div className="pokedex-card pokedex-card--skeleton" aria-hidden="true">
      <div className="pokedex-card-visual">
        <div className="pokedex-card-skeleton-shimmer">
          <div className="pokedex-skel-bone pokedex-skel-bone--no" />
          <div className="pokedex-skel-bone pokedex-skel-bone--name" />
          <div className="pokedex-skel-bone pokedex-skel-bone--art" />
        </div>
      </div>
    </div>
  );
}

function PokedexCard({ item, isCurrent, onSelect, onZoom }) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgSrc, setImgSrc] = useState(item.artworkUrl);

  useEffect(() => {
    setImgLoaded(false);
    setImgSrc(item.artworkUrl);
  }, [item.artworkUrl, item.speciesId]);

  return (
    <article
      className={`pokedex-card${isCurrent ? ' is-current' : ''}${imgLoaded ? ' is-ready' : ' is-loading-img'}`}
      onClick={() => onSelect(item)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(item);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`${item.koreanName} 색칠도안 만들기`}
      aria-busy={!imgLoaded}
    >
      <div className="pokedex-card-visual">
        {!imgLoaded && (
          <div className="pokedex-card-skeleton-shimmer" aria-hidden="true">
            <div className="pokedex-skel-bone pokedex-skel-bone--no" />
            <div className="pokedex-skel-bone pokedex-skel-bone--name" />
            <div className="pokedex-skel-bone pokedex-skel-bone--art" />
          </div>
        )}
        <img
          src={imgSrc}
          alt=""
          loading="lazy"
          className={imgLoaded ? 'is-loaded' : ''}
          onLoad={() => setImgLoaded(true)}
          onError={() => {
            const fallback = `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/${item.pokemonId}.png`;
            if (imgSrc !== fallback) {
              setImgLoaded(false);
              setImgSrc(fallback);
            } else {
              setImgLoaded(true);
            }
          }}
        />
        <div className="pokedex-card-overlay">
          <div className="pokedex-card-top">
            <span className="pokedex-card-no">
              No. {String(item.speciesId).padStart(4, '0')}
            </span>
            <TypeBadges types={item.types} />
          </div>
          <strong>{item.koreanName}</strong>
        </div>
        <button
          type="button"
          className="pokedex-card-zoom-fab"
          onClick={(e) => {
            e.stopPropagation();
            onZoom(item);
          }}
          aria-label={`${item.koreanName} 원본 이미지 크게 보기`}
        >
          ⤢
        </button>
      </div>
    </article>
  );
}

export default function PokedexModal({
  isOpen,
  onClose,
  onSelectPokemon,
  initialSpeciesId = null,
}) {
  const [page, setPage] = useState(1);
  const [sliderPage, setSliderPage] = useState(1);
  const [dexData, setDexData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [zoomTarget, setZoomTarget] = useState(null);
  const initialSpeciesIdRef = useRef(initialSpeciesId);

  useEffect(() => {
    initialSpeciesIdRef.current = initialSpeciesId;
  }, [initialSpeciesId]);

  const loadPage = useCallback(async (targetPage) => {
    setLoading(true);
    setError('');
    setDexData(null);

    try {
      const data = await fetchPokemonDexPage(targetPage);
      setDexData(data);
      setPage(targetPage);
      setSliderPage(targetPage);
    } catch (err) {
      setDexData(null);
      setError(err.message || '도감을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const speciesId = initialSpeciesIdRef.current;
    const targetPage = speciesId ? getDexPageForSpeciesId(speciesId) : 1;
    loadPage(targetPage);
    setZoomTarget(null);
  }, [isOpen, loadPage]);

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !zoomTarget) onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose, zoomTarget]);

  const handleSelect = (item) => {
    onSelectPokemon(item.koreanName);
    onClose();
  };

  const handleSelectFromZoom = () => {
    if (!zoomTarget) return;
    handleSelect(zoomTarget);
    setZoomTarget(null);
  };

  const handleSliderCommit = () => {
    if (sliderPage !== page && !loading) {
      loadPage(sliderPage);
    }
  };

  if (!isOpen) return null;

  const totalPages = dexData?.totalPages ?? 1;
  const total = dexData?.total ?? 0;
  const showPageSkeletons = loading || !dexData;

  return (
    <>
      <div
        className="pokedex-overlay no-print"
        onClick={onClose}
        role="presentation"
      >
        <div
          className="pokedex-modal"
          role="dialog"
          aria-modal="true"
          aria-label="포켓몬 도감"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="pokedex-header">
            <div>
              <h2>포켓몬 도감</h2>
              <p>이미지를 눌러 크게 보고, 포켓몬을 선택해 색칠도안을 만드세요</p>
            </div>
            <button
              type="button"
              className="pokedex-close"
              onClick={onClose}
              aria-label="도감 닫기"
            >
              ×
            </button>
          </div>

          {error ? (
            <div className="pokedex-error">
              <p>{error}</p>
              <button type="button" onClick={() => loadPage(page)}>
                다시 시도
              </button>
            </div>
          ) : (
            <>
              <div className={`pokedex-grid${loading ? ' is-loading' : ''}`}>
                {showPageSkeletons
                  ? Array.from({ length: SKELETON_COUNT }, (_, i) => (
                      <PokedexCardSkeleton key={`skel-${i}`} />
                    ))
                  : dexData?.items.map((item) => (
                      <PokedexCard
                        key={item.speciesId}
                        item={item}
                        isCurrent={item.speciesId === initialSpeciesId}
                        onSelect={handleSelect}
                        onZoom={setZoomTarget}
                      />
                    ))}
              </div>

              <div className="pokedex-pagination">
                <button
                  type="button"
                  className="pokedex-page-btn"
                  onClick={() => loadPage(page - 1)}
                  disabled={loading || page <= 1}
                >
                  이전
                </button>

                <div className="pokedex-pagination-center">
                  <div className="pokedex-page-gauge">
                    <input
                      type="range"
                      className="pokedex-page-slider"
                      min={1}
                      max={totalPages}
                      value={sliderPage}
                      disabled={loading}
                      aria-label="페이지 선택"
                      aria-valuemin={1}
                      aria-valuemax={totalPages}
                      aria-valuenow={sliderPage}
                      onChange={(e) => setSliderPage(Number(e.target.value))}
                      onMouseUp={handleSliderCommit}
                      onTouchEnd={handleSliderCommit}
                      onKeyUp={handleSliderCommit}
                      style={{
                        '--slider-progress': `${totalPages <= 1 ? 100 : ((sliderPage - 1) / (totalPages - 1)) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="pokedex-page-info">
                    {sliderPage} / {totalPages}
                    <small>총 {total.toLocaleString('ko-KR')}종</small>
                  </span>
                </div>

                <button
                  type="button"
                  className="pokedex-page-btn"
                  onClick={() => loadPage(page + 1)}
                  disabled={loading || page >= totalPages}
                >
                  다음
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <ImageZoomModal
        isOpen={Boolean(zoomTarget)}
        imageUrl={zoomTarget?.artworkUrl}
        title={zoomTarget ? `${zoomTarget.koreanName} · 원본` : ''}
        subtitle="컬러 일러스트"
        speciesId={zoomTarget?.speciesId}
        types={zoomTarget?.types}
        onClose={() => setZoomTarget(null)}
        onSelect={handleSelectFromZoom}
        selectLabel="이 포켓몬 선택"
      />
    </>
  );
}
