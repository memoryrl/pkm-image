export default function Placeholder({ loading }) {
  if (loading) {
    return (
      <div className="placeholder">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="placeholder">
      <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
      <p>
        포켓몬 이름을 입력하고
        <br />
        색칠도안을 만들어 보세요!
      </p>
    </div>
  );
}
