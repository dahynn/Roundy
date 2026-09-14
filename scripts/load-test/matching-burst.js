import http from 'k6/http';
import { check, fail } from 'k6';
import { Counter, Rate } from 'k6/metrics';

const actors = JSON.parse(open(__ENV.ACTORS_FILE || '/work/scripts/load-test/generated/actors.json'));
const targetUrl = (__ENV.TARGET_URL || '').replace(/\/$/, '');
const virtualUsers = Number(__ENV.VUS || actors.length);

if (!targetUrl) fail('TARGET_URL is required.');
if (!Number.isInteger(virtualUsers) || virtualUsers !== actors.length) {
  fail(`VUS (${virtualUsers}) must exactly match actor count (${actors.length}).`);
}

export const options = {
  scenarios: {
    matching_burst: {
      executor: 'per-vu-iterations',
      vus: virtualUsers,
      iterations: 1,
      maxDuration: '2m',
      gracefulStop: '0s',
    },
  },
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
  thresholds: {
    http_req_failed: ['rate==0'],
  },
};

const applicationAccepted = new Rate('matching_application_accepted');
const matchedResponses = new Counter('matching_initial_matched');
const waitingResponses = new Counter('matching_initial_waiting');
const rejectedResponses = new Counter('matching_rejected');
const malformedResponses = new Counter('matching_malformed_response');

export default function () {
  const actor = actors[__VU - 1];
  const response = http.post(
    `${targetUrl}/api/session/enter`,
    JSON.stringify({ requestId: actor.requestId }),
    {
      headers: {
        Authorization: `Bearer ${actor.token}`,
        'Content-Type': 'application/json',
      },
      timeout: '30s',
      tags: { endpoint: 'session-enter' },
    },
  );

  let body;
  try {
    body = response.json();
  } catch (_) {
    malformedResponses.add(1);
    applicationAccepted.add(false);
    return;
  }

  const bodyAccepted = body && body.success === true && body.data && body.data.success === true;
  const accepted = check(response, {
    'HTTP 200': (value) => value.status === 200,
    'application accepted request': () => bodyAccepted,
  });
  applicationAccepted.add(accepted);

  if (!accepted) {
    rejectedResponses.add(1);
  } else if (body.data && body.data.roomId) {
    matchedResponses.add(1);
  } else {
    waitingResponses.add(1);
  }
}
