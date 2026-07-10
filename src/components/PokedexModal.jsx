import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchPokemonDexPage, getDexPageForSpeciesId, getTypeColor } from '../utils/pokemonApi';
import ImageZoomModal from './ImageZoomModal';

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
                {loading && !dexData ? (
                  <div className="pokedex-loading">
                    <div className="spinner" />
                    <p>도감을 불러오는 중...</p>
                  </div>
                ) : (
                  dexData?.items.map((item) => (
                    <article
                      key={item.speciesId}
                      className={`pokedex-card${item.speciesId === initialSpeciesId ? ' is-current' : ''}`}
                      onClick={() => handleSelect(item)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleSelect(item);
                        }
                      }}
                      role="button"
                      tabIndex={0}
                      aria-label={`${item.koreanName} 색칠도안 만들기`}
                    >
                      <div className="pokedex-card-visual">
                        <img
                          src={item.artworkUrl}
                          alt=""
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.src = `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon/${item.pokemonId}.png`;
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
                            setZoomTarget(item);
                          }}
                          aria-label={`${item.koreanName} 원본 이미지 크게 보기`}
                        >
                          ⤢
                        </button>
                      </div>
                    </article>
                  ))
                )}
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
