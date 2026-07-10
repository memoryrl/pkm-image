import { useCallback, useEffect, useState } from 'react';
import { checkApiHealth } from '../utils/pokemonApi';

const SERVICE_LABELS = {
  graphql: 'GraphQL (주)',
  graphqlFallback: 'GraphQL (백업)',
  rest: 'REST API',
  image: '이미지 CDN',
};

const STATUS_TEXT = {
  ok: '정상',
  error: '장애',
  checking: '확인 중',
};

const OVERALL_CLASS = {
  checking: 'is-checking',
  ok: 'is-ok',
  degraded: 'is-degraded',
  down: 'is-down',
};

function formatTime(date) {
  if (!date) return '';
  return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

export default function ServerStatus() {
  const [health, setHealth] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [checking, setChecking] = useState(true);

  const refresh = useCallback(async () => {
    setChecking(true);
    try {
      const result = await checkApiHealth();
      setHealth(result);
    } catch {
      setHealth({
        graphql: 'error',
        graphqlFallback: 'error',
        rest: 'error',
        image: 'error',
        overall: 'down',
        overallLabel: '장애',
        checkedAt: new Date(),
      });
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const overall = checking ? 'checking' : (health?.overall ?? 'checking');
  const overallLabel = checking ? '확인 중' : (health?.overallLabel ?? '확인 중');

  return (
    <div className={`server-status no-print ${OVERALL_CLASS[overall]}`}>
      <div className="server-status-bar">
        <button
          type="button"
          className="server-status-toggle"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-label={`API 서버 상태: ${overallLabel}`}
        >
          <span className="server-status-dot" aria-hidden="true" />
          <span className="server-status-label">API {overallLabel}</span>
          {health?.checkedAt && !checking && (
            <span className="server-status-time">{formatTime(health.checkedAt)}</span>
          )}
        </button>
        <button
          type="button"
          className="server-status-refresh"
          onClick={refresh}
          disabled={checking}
        >
          새로고침
        </button>
      </div>

      {expanded && health && (
        <div className="server-status-panel">
          <ul>
            {Object.entries(SERVICE_LABELS).map(([key, label]) => (
              <li key={key} className={health[key] === 'ok' ? 'ok' : 'error'}>
                <span>{label}</span>
                <span>{STATUS_TEXT[health[key]] ?? '장애'}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
