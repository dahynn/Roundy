const configuredOrigin = (value: string | undefined): string => {
  if (!value || value === 'undefined') return '';
  return value.replace(/\/$/, '');
};

/**
 * API는 기본적으로 현재 페이지와 같은 origin의 /api를 사용한다.
 * 로컬에서 프런트와 백엔드를 따로 실행할 때만 VITE_API_URL로 덮어쓴다.
 */
export const API_ORIGIN = configuredOrigin(import.meta.env.VITE_API_URL);

/**
 * WebSocket도 운영에서는 현재 페이지와 같은 origin을 사용한다.
 * 별도 호스트가 필요한 환경만 VITE_WS_URL로 덮어쓴다.
 */
export const getWebSocketUrl = (): string => {
  const configuredUrl = configuredOrigin(import.meta.env.VITE_WS_URL);
  if (configuredUrl) return configuredUrl;

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/api/ws/webrtc`;
};
