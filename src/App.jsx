import { useState } from 'react';
import {
  fetchPokemonByKoreanName,
  fetchArtworkUrl,
  loadImage,
} from './utils/pokemonApi';
import { generateOutlineForPreset, generateOutlineVariants } from './utils/outlineConverter';
import Placeholder from './components/Placeholder';
import PrintArea from './components/PrintArea';
import OutlinePicker from './components/OutlinePicker';
import PokemonSearchInput from './components/PokemonSearchInput';

export default function App() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState({ message: '', isError: false });
  const [loading, setLoading] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const [selectedOutline, setSelectedOutline] = useState(null);
  const [selectingPresetId, setSelectingPresetId] = useState(null);
  const [sourceImage, setSourceImage] = useState(null);

  const runSearch = async (name) => {
    const trimmed = name.trim();
    if (!trimmed) {
      setStatus({ message: '포켓몬 이름을 입력해 주세요.', isError: true });
      return;
    }

    setQuery(trimmed);
    setLoading(true);
    setSearchResult(null);
    setSelectedOutline(null);
    setSelectingPresetId(null);
    setSourceImage(null);
    setStatus({ message: '검색 중...', isError: false });

    try {
      const pokemon = await fetchPokemonByKoreanName(trimmed);
      setStatus({ message: '이미지 불러오는 중...', isError: false });

      const artworkUrl = await fetchArtworkUrl(pokemon.id);
      const img = await loadImage(artworkUrl);
      setSourceImage(img);

      setStatus({ message: '색칠도안 미리보기 생성 중...', isError: false });

      const variants = generateOutlineVariants(img);

      setSearchResult({
        name: trimmed,
        artworkUrl,
        variants,
      });
      setStatus({ message: `${trimmed} 색칠도안 스타일을 선택해 주세요.`, isError: false });
    } catch (err) {
      setSearchResult(null);
      setSelectedOutline(null);
      setSourceImage(null);
      setStatus({
        message: err.message || '오류가 발생했습니다.',
        isError: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectVariant = async (variant) => {
    if (!sourceImage || selectingPresetId) return;

    setSelectingPresetId(variant.id);
    setStatus({ message: `${variant.label} 도안을 준비하는 중...`, isError: false });

    try {
      const outlineDataUrl = generateOutlineForPreset(
        sourceImage,
        variant,
        variant.fullMaxSize,
      );

      setSelectedOutline({
        name: searchResult.name,
        artworkUrl: searchResult.artworkUrl,
        outlineDataUrl,
        presetLabel: variant.label,
      });
      setStatus({
        message: `${searchResult.name} · ${variant.label} 색칠도안이 준비되었습니다!`,
        isError: false,
      });
    } catch (err) {
      setStatus({
        message: err.message || '도안 생성에 실패했습니다.',
        isError: true,
      });
    } finally {
      setSelectingPresetId(null);
    }
  };

  const handleBackToPicker = () => {
    setSelectedOutline(null);
    setStatus({
      message: `${searchResult.name} 색칠도안 스타일을 선택해 주세요.`,
      isError: false,
    });
  };

  const handleSearch = (e) => {
    e.preventDefault();
    runSearch(query);
  };

  return (
    <div className="app">
      <header className="header no-print">
        <h1>🎨 포켓몬 색칠도안</h1>
        <form className="search-row" onSubmit={handleSearch}>
          <PokemonSearchInput
            value={query}
            onChange={setQuery}
            onSelect={runSearch}
            disabled={loading}
          />
          <button type="submit" disabled={loading}>
            조회
          </button>
        </form>
        <p className={`status${status.isError ? ' error' : ''}`}>{status.message}</p>
      </header>

      <main className="canvas-section">
        {selectedOutline ? (
          <PrintArea
            artworkUrl={selectedOutline.artworkUrl}
            pokemonName={selectedOutline.name}
            outlineDataUrl={selectedOutline.outlineDataUrl}
            presetLabel={selectedOutline.presetLabel}
          />
        ) : searchResult ? (
          <OutlinePicker
            pokemonName={searchResult.name}
            artworkUrl={searchResult.artworkUrl}
            variants={searchResult.variants}
            onSelect={handleSelectVariant}
            selectingId={selectingPresetId}
          />
        ) : (
          <Placeholder loading={loading} />
        )}
      </main>

      {selectedOutline && (
        <footer className="actions no-print">
          <button type="button" className="secondary" onClick={handleBackToPicker}>
            다른 스타일 선택
          </button>
          <button type="button" className="visible" onClick={() => window.print()}>
            🖨️ 프린트하기
          </button>
        </footer>
      )}
    </div>
  );
}
