#!/usr/bin/env node
import { createHmac, randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const userCount = Number(process.env.LOAD_TEST_USERS ?? 3000);
const startId = BigInt(process.env.LOAD_TEST_USER_ID_START ?? '70000000000');
const ttlSeconds = Number(process.env.LOAD_TEST_VERIFICATION_TTL_SECONDS ?? 1800);
const outputDirectory = resolve(process.argv[2] ?? 'scripts/load-test/generated');
const secret = process.env.LOAD_TEST_JWT_SECRET;

if (!Number.isInteger(userCount) || userCount < 6 || userCount % 2 !== 0) {
  throw new Error('LOAD_TEST_USERS must be an even integer greater than or equal to 6.');
}
if (!Number.isInteger(ttlSeconds) || ttlSeconds < 60) {
  throw new Error('LOAD_TEST_VERIFICATION_TTL_SECONDS must be at least 60.');
}
if (!secret) {
  throw new Error('LOAD_TEST_JWT_SECRET is required and must stay outside Git.');
}

const key = Buffer.from(secret, 'base64url');
if (key.length < 32) {
  throw new Error('LOAD_TEST_JWT_SECRET must decode to at least 32 bytes.');
}

const now = Math.floor(Date.now() / 1000);
const runId = randomUUID();
const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
const createToken = (userId) => {
  const header = encode({ alg: 'HS256', typ: 'JWT' });
  const payload = encode({ sub: String(userId), role: 'USER', iat: now, exp: now + ttlSeconds });
  const signature = createHmac('sha256', key).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
};

const actors = [];
const sqlRows = [];
const redisCommands = [];
for (let index = 0; index < userCount; index += 1) {
  const id = startId + BigInt(index);
  const gender = index < userCount / 2 ? 'MALE' : 'FEMALE';
  const requestId = `aws-load-${runId}-${id}`;
  actors.push({ id: String(id), gender, requestId, token: createToken(id) });
  sqlRows.push(`(${id}, ${id + 100000000000n}, 'loadtest-${id}', 'loadtest-${id}@invalid.local', '${gender}', '1990-01-01', 'loadtest-${id}', 'USER', 'VALID', NOW(), NOW())`);
  redisCommands.push(`SET verify:${id}:${requestId} VERIFIED EX ${ttlSeconds}`);
}

mkdirSync(outputDirectory, { recursive: true, mode: 0o700 });
writeFileSync(resolve(outputDirectory, 'actors.json'), JSON.stringify(actors), { mode: 0o600 });
writeFileSync(
  resolve(outputDirectory, 'users.sql'),
  `INSERT INTO users (id, kakao_id, name, email, gender, birth_date, nick_name, role, status, created_at, updated_at) VALUES\n${sqlRows.join(',\n')}\nON DUPLICATE KEY UPDATE gender=VALUES(gender), role='USER', status='VALID', updated_at=NOW();\n`,
  { mode: 0o600 },
);
writeFileSync(resolve(outputDirectory, 'verification.redis'), `${redisCommands.join('\n')}\n`, { mode: 0o600 });
writeFileSync(
  resolve(outputDirectory, 'metadata.json'),
  JSON.stringify({
    runId,
    userCount,
    expectedCompleteRooms: Math.floor(userCount / 6),
    expectedWaiting: userCount % 6,
    expectedMaleWaiting: (userCount / 2) % 3,
    expectedFemaleWaiting: (userCount / 2) % 3,
    verificationTtlSeconds: ttlSeconds,
  }, null, 2),
  { mode: 0o600 },
);

console.log(`Generated ${userCount} synthetic actors in ${outputDirectory}`);
