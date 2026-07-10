export default function Placeholder({ loading }) {
  if (loading) {
    return (
      <div className="content-card placeholder">
        <div className="spinner" />
        <p className="placeholder-hint">잠시만 기다려 주세요...</p>
      </div>
    );
  }

  return (
    <div className="content-card placeholder">
      <div className="placeholder-icon" aria-hidden="true">
        <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      </div>
      <h2 className="placeholder-title">포켓몬을 검색해 보세요</h2>
      <p className="placeholder-desc">
        피카츄, 리자몽, 팬텀처럼
        <br />
        한글 이름을 입력하면 색칠도안이 만들어집니다
      </p>
    </div>
  );
}
