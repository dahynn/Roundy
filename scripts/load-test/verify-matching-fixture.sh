#!/usr/bin/env bash
set -euo pipefail

env_file=${1:-.env.matching-loadtest}
compose_file=${2:-compose.matching-loadtest.yaml}
fixture_directory=${3:-scripts/load-test/generated}

if [[ ! -f "$fixture_directory/actors.json" || ! -f "$fixture_directory/metadata.json" ]]; then
  echo "Generated fixture files are required." >&2
  exit 1
fi

actor_ids=$(node -e "console.log(require('./$fixture_directory/actors.json').map(a => a.id).join(' '))")
expected_rooms=$(node -e "console.log(require('./$fixture_directory/metadata.json').expectedCompleteRooms)")
expected_waiting=$(node -e "console.log(require('./$fixture_directory/metadata.json').expectedWaiting)")
expected_male_waiting=$(node -e "console.log(require('./$fixture_directory/metadata.json').expectedMaleWaiting)")
expected_female_waiting=$(node -e "console.log(require('./$fixture_directory/metadata.json').expectedFemaleWaiting)")

lua='local seen={} local rooms=0 local assigned=0 local invalid=0 for _, id in ipairs(ARGV) do local room=redis.call("GET", "user:"..id..":currentRoom") if room then assigned=assigned+1 if not seen[room] then seen[room]=true rooms=rooms+1 local members=redis.call("SMEMBERS", "room:"..room..":members") local male=0 local female=0 for _, member in ipairs(members) do local gender=redis.call("HGET", "room:"..room..":member:"..member, "gender") if gender=="MALE" then male=male+1 elseif gender=="FEMALE" then female=female+1 else invalid=invalid+1 end end if #members~=6 or male~=3 or female~=3 then invalid=invalid+1 end end end end local maleQueue=redis.call("ZCARD", "session:male") local femaleQueue=redis.call("ZCARD", "session:female") return cjson.encode({rooms=rooms, assigned=assigned, invalid=invalid, maleQueue=maleQueue, femaleQueue=femaleQueue})'
actual=$(docker compose --env-file "$env_file" -f "$compose_file" exec -T redis redis-cli --raw EVAL "$lua" 0 $actor_ids)

ACTUAL="$actual" EXPECTED_ROOMS="$expected_rooms" EXPECTED_WAITING="$expected_waiting" EXPECTED_MALE_WAITING="$expected_male_waiting" EXPECTED_FEMALE_WAITING="$expected_female_waiting" node <<'NODE'
const actual = JSON.parse(process.env.ACTUAL);
const expectedRooms = Number(process.env.EXPECTED_ROOMS);
const expectedWaiting = Number(process.env.EXPECTED_WAITING);
const expectedMaleWaiting = Number(process.env.EXPECTED_MALE_WAITING);
const expectedFemaleWaiting = Number(process.env.EXPECTED_FEMALE_WAITING);
const expectedAssigned = expectedRooms * 6;
const valid = actual.rooms === expectedRooms
  && actual.assigned === expectedAssigned
  && actual.invalid === 0
  && actual.maleQueue === expectedMaleWaiting
  && actual.femaleQueue === expectedFemaleWaiting
  && actual.maleQueue + actual.femaleQueue === expectedWaiting;
console.log(JSON.stringify({ expected: { rooms: expectedRooms, assigned: expectedAssigned, waiting: expectedWaiting, maleQueue: expectedMaleWaiting, femaleQueue: expectedFemaleWaiting }, actual, valid }, null, 2));
process.exit(valid ? 0 : 1);
NODE
