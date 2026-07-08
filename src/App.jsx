import { useState } from 'react';
import {
  fetchPokemonByKoreanName,
  fetchArtworkUrl,
  loadImage,
} from './utils/pokemonApi';
import { convertToOutline } from './utils/outlineConverter';
import Placeholder from './components/Placeholder';
import PrintArea from './components/PrintArea';

export default function App() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState({ message: '', isError: false });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    const name = query.trim();
    if (!name) {
      setStatus({ message: '포켓몬 이름을 입력해 주세요.', isError: true });
      return;
    }

    setLoading(true);
    setResult(null);
    setStatus({ message: '검색 중...', isError: false });

    try {
      const pokemon = await fetchPokemonByKoreanName(name);
      setStatus({ message: '이미지 불러오는 중...', isError: false });

      const artworkUrl = await fetchArtworkUrl(pokemon.id);
      const img = await loadImage(artworkUrl);

      setStatus({ message: '색칠도안 변환 중...', isError: false });

      const offscreen = document.createElement('canvas');
      convertToOutline(img, offscreen);

      setResult({
        name,
        artworkUrl,
        outlineDataUrl: offscreen.toDataURL('image/png'),
      });
      setStatus({ message: `${name} 색칠도안이 준비되었습니다!`, isError: false });
    } catch (err) {
      setResult(null);
      setStatus({
        message: err.message || '오류가 발생했습니다.',
        isError: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <header className="header no-print">
        <h1>🎨 포켓몬 색칠도안</h1>
        <form className="search-row" onSubmit={handleSearch}>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="포켓몬 이름 (예: 피카츄)"
            autoComplete="off"
            enterKeyHint="search"
            disabled={loading}
          />
          <button type="submit" disabled={loading}>
            조회
          </button>
        </form>
        <p className={`status${status.isError ? ' error' : ''}`}>{status.message}</p>
      </header>

      <main className="canvas-section">
        {result ? (
          <PrintArea artworkUrl={result.artworkUrl} pokemonName={result.name} outlineDataUrl={result.outlineDataUrl} />
        ) : (
          <Placeholder loading={loading} />
        )}
      </main>

      {result && (
        <footer className="actions no-print">
          <button type="button" className="visible" onClick={() => window.print()}>
            🖨️ 프린트하기
          </button>
        </footer>
      )}
    </div>
  );
}
