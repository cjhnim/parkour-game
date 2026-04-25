# Parkour MVP — 구현 스펙

현재 구현된 상태를 기록한다. 버전이 바뀔 때마다 업데이트한다.

---

## 버전

**v0.8** — 검증기 모델을 bbox-overlap으로 통합 + 경로 시각화
- 모든 route step을 `targetPlatform: {x, y, w, h}`로 통일 (verticalGap·horizontalGap 제거)
- validator는 trajectory 중 player bbox와 target bbox가 겹치는지 검사 — top landing이든 side wall-cling이든 통과로 판정 (벽 메카닉으로 측면→상단 전환이 가능하므로)
- 튜닝 패널 열면 캔버스에 통과 경로를 점선으로 시각화 (각 step 끝에 player bbox 표시)
- `side-cling-clear` step type은 'jump'로 흡수 (동일 로직)

**v0.7** — Stage 1 재설계: Goal 낮춤(y=110), P4→Goal 벽 메카닉, P5 함정화

**v0.6** — 검증기 수평 간격 체크에 PLAYER_W 반영 + P5→Goal route 보정 (160→150)

**v0.5** — 플레이어 크기 32×24로 변경 (가로세로 비율을 SVG 캐릭터에 맞게 조정)

**v0.4** — 픽셀아트 캐릭터 SVG 원본 재구현 + 눈동자 방향 전환 애니메이션

**v0.3** — 픽셀아트 캐릭터 + 고정 점프 (가변 점프 제거) + 물리 재조정

---

## 화면

- 캔버스 크기: **960 × 640px**
- **고정 카메라** — 스크롤 없음. 모든 스테이지는 화면 한 장 안에 담긴다.
- 배경: 단색(`#1a1a24`)

---

## 플레이어

- 크기: 32 × 24px (가로 > 세로 — SVG 캐릭터 비율 반영)
- 외형: Claude Code 픽셀아트 캐릭터 — SVG 원본 좌표(`viewBox 0 0 24 24`) 기반
  - 색상: `#D97757` (오렌지)
  - 구성: 몸통 + 양팔 돌출 + 발 4개 + 눈(세로 직사각형) 2개
  - 눈동자: 이동 방향으로 이동 (좌 이동 → 왼쪽, 우 이동 → 오른쪽, 정지 → 기본)

### 물리 파라미터 (`src/tuning.js` — 런타임 변경 가능)

| 파라미터 | 기본값 | 설명 |
|---|---|---|
| `gravity` | 0.7 | 프레임당 중력 가속도 (px/frame²) |
| `maxFallSpeed` | 16 | 최대 낙하 속도 |
| `wallSlideMaxFall` | 3 | 벽 슬라이드 중 최대 낙하 속도 |
| `moveSpeed` | 5 | 수평 이동 최대 속도 |
| `moveAccel` | 0.8 | 이동 가속도 — 키를 누를 때마다 vx에 더해지는 값 |
| `moveFriction` | 0.75 | 이동 마찰 계수 — 키를 뗄 때 vx에 곱해지는 값 (0~1) |
| `jumpVelocity` | -13 | 점프 초기 수직 속도 (고정 높이) |
| `wallJumpVx` | 6 | 벽 점프 수평 킥 속도 |
| `wallJumpVy` | -11 | 벽 점프 수직 킥 속도 |

파라미터는 브라우저 **Tuning 패널**(왼쪽 토글)에서 슬라이더로 실시간 조절 가능. "↺ Reset to defaults"로 초기값 복원.

### 조작

- **좌우 이동**: A/D 또는 ← → (가속/마찰 적용, 즉각 최고 속도 아님)
- **점프**: W / ↑
  - 지면에 있을 때 → 고정 높이 점프 (키 지속시간 무관)
  - 공중 + 벽에 닿아 있을 때 → 벽 점프 (벽 반대 방향으로 킥)
- **벽 슬라이드**: 공중에서 벽에 닿은 채 아래로 이동 중이면 낙하 속도가 `wallSlideMaxFall`로 제한됨

### 낙사 조건

- 플레이어 y좌표가 화면 높이(640)를 초과하면 스폰 위치로 리스폰
- ⚠️ **미검증** — 현재 모든 스테이지에 전체 너비 바닥이 있어 낙사가 불가능한 구조. 로직은 구현되어 있으나 실제 동작 미확인.

---

## 충돌 (`src/collision.js`)

- **AABB** (축 정렬 경계 박스)
- 해결 순서: X축 먼저 → Y축
- `wallSide` 반환값: `-1` (왼쪽 벽), `1` (오른쪽 벽), `0` (벽 없음)
- `grounded`: Y축 해결 시 아래에서 막히면 `true`

---

## 스테이지 (`src/level.js`)

### Stage 0 — Tutorial

- 장애물 없는 빈 방 (바닥 + 양쪽 벽 + 천장)
- 골 없음 (`goal: null`) — 자유롭게 조작 테스트
- SPACE로 Stage 1 진입

### Stage 1 — Climb

- 화면 하단 왼쪽에서 스폰, 화면 상단 오른쪽의 골 지점 도달 시 클리어
- 지그재그 플랫폼 6개 배치 (아래 → 위)
- 골 지점: 황색 사각형 (`#f5d76e`), 40 × 40px

**정규 루트**: Floor → P1 → P2 → P3 → P4 → Goal (벽 이용)
- P4 위에서 오른쪽으로 달리다 점프 → Goal 플랫폼 왼쪽 벽에 부딪힘 → 상승 모멘텀으로 벽 위로 넘어감
- P4→Goal은 직접 점프 불가 (높이 130px > 최대 114px) — 벽 메카닉 필수

**함정**: P5는 올라갈 수 있지만 Goal에 도달 불가 (수평 거리 + 천장 제약)

---

## UI

- **상단 좌**: 스테이지 이름
- **상단 우**: 경과 시간 (초, 소수점 2자리)
- **하단 중앙**: 조작 힌트
- **클리어 오버레이**: "CLEAR!" + 기록 시간 + 다음 행동 안내 (반투명 오버레이)

---

## 클리어 가능성 검증 (`src/validator.js`)

튜닝 패널에서 물리 파라미터를 바꿀 때 스테이지를 클리어할 수 있는지 실시간으로 판독한다.

- `computeMaxJumpHeight(cfg)` — 현재 config로 도달 가능한 최대 점프 높이
- `computeMaxHorizontalReach(cfg)` — 점프 중 최대 수평 이동 거리
- `validateStage(stage, cfg)` — route 각 step을 시뮬레이션 → `{ clearable, issues[], capabilities }`

**스테이지 route**: 각 step에 `takeoff: {x, y, vxDir}` (출발 지점 및 방향) + `targetPlatform: {x, y, w, h}` 명시.

**검증 모델 (bbox-overlap)**: 출발점에서 풀스피드로 점프했을 때의 포물선 중 어떤 프레임에서든 플레이어 bbox와 타깃 플랫폼 bbox가 겹치면 통과로 판정한다. 상단 착지뿐 아니라 측면 충돌(벽 클링)도 포함된다 — 측면에 닿으면 벽 점프 + 입력 제어로 상단 착지가 가능하기 때문.

**Step types**:
- `jump` — 타깃 플랫폼에 bbox 충돌 (대부분의 step)
- `wall-touch` — 임의 벽까지 수평 도달 (vertical 무관)
- `wall-jump-land` — 벽 점프 포물선이 타깃 플랫폼 상단에 착지

**패널 표시**: ⚙ Tuning 패널 하단 CLEARABILITY 섹션에 실시간 표시. 불가 시 문제 step과 type(`too_high`/`too_far`) 정보 표시.

**경로 시각화 (`src/render.js > drawRoute`)**: 패널이 열려 있을 때 각 step의 시뮬레이션 trajectory를 점선으로 그리고, 종료 지점에 player bbox(32×24)를 박스로 표시한다.

---

## 테스트 현황

| 파일 | 테스트 수 | 상태 |
|---|---|---|
| `test/physics.test.js` | 17 | ✅ 전부 통과 |
| `test/collision.test.js` | 9 | ✅ 전부 통과 |
| `test/level.test.js` | 13 | ✅ 전부 통과 |
| `test/validator.test.js` | 20 | ✅ 전부 통과 |
| **합계** | **59** | **✅** |

테스트 대상: 순수 함수만. DOM·Canvas·RAF·키보드 입력은 수동 검증.

---

## v0.3 후보

- 더블 점프
- 대시 (공중 수평 이동)
- 베스트 타임 저장 (`localStorage`)
- 스테이지 추가 (낙사 구간 포함 — 낙사 로직 검증 겸)
- 콤보/트릭 점수 시스템
