## 📖 소개

KAFI는 AI Agent들을 팀 비서로 활용하여 협업하는 크로스 플랫폼 데스크톱 애플리케이션입니다.

- 🤖 **AI Agent 팀** — 코드 리뷰어, 문서 작성자, 테스터 등 역할별 AI 비서
- 🎨 **캐릭터 위젯** — Mac/Windows 데스크톱에서 캐릭터가 일하는 모습을 위젯으로 표시
- 🎭 **캐릭터 커스텀** — 이미지 1장만 넣으면 자동으로 캐릭터 생성, 자유롭게 교체 가능
- 👥 **팀 협업** — 에이전트 간 자동 태스크 분배 및 협업 (계획)
- ⚡ **실시간 상태** — Socket.IO 기반 실시간 에이전트 상태 및 진행률 확인 (계획)
- 🔌 **멀티 LLM** — OpenAI, Claude, Gemini 등 다양한 LLM 프로바이더 지원

> 현재 구현 기준(2026-02-26): Electron `desktop/renderer/shared`는 동작하며, `packages/server`는 디렉터리 골격만 존재합니다.

---

## 🚀 빠른 시작

### 사전 요구사항

- **Node.js** >= 18.0.0
- **pnpm** >= 8.0.0
- **Git**

### 설치

```bash
# 레포지토리 클론
git clone https://github.com/your-org/kafi.git
cd kafi

# 의존성 설치
pnpm install

# 개발 서버 시작
pnpm dev
```

### 빌드

```bash
# 전체 빌드
pnpm build

# macOS 앱 번들
pnpm build:mac

# Windows 인스톨러
pnpm build:win
```

---

## 🏗️ 프로젝트 구조

```
kafi/
├── packages/
│   ├── desktop/        # Electron 메인 프로세스 (위젯/트레이)
│   ├── renderer/       # React 프론트엔드 UI
│   ├── server/         # 서버 디렉터리 골격만 존재 (구현 파일 없음)
│   └── shared/         # 공유 타입/유틸리티
├── docs/               # 상세 문서
└── assets/             # 전역 에셋 (아이콘, 캐릭터)
```

> 자세한 구조는 [ARCHITECTURE.md](./ARCHITECTURE.md)를 참고하세요.

---

## 📚 문서

| 문서                                                                 | 설명                        |
| -------------------------------------------------------------------- | --------------------------- |
| [TECH_STACK.md](./TECH_STACK.md)                                     | 기술 스택 상세 및 선택 근거 |
| [ARCHITECTURE.md](./ARCHITECTURE.md)                                 | 시스템 아키텍처 설계        |
| [docs/ollama-guide.md](./docs/ollama-guide.md)                       | Ollama 설치 및 설정 가이드  |
| [docs/setup-guide.md](./docs/setup-guide.md)                         | 개발 환경 설정 가이드       |
| [docs/agent-system.md](./docs/agent-system.md)                       | AI Agent 시스템 설계        |
| [docs/agent-persona.md](./docs/agent-persona.md)                     | 에이전트 페르소나 & 개성    |
| [docs/widget-design.md](./docs/widget-design.md)                     | 위젯/캐릭터 디자인 가이드   |
| [docs/character-customization.md](./docs/character-customization.md) | 캐릭터 커스터마이징 시스템  |

---

## 🛠️ 기술 스택

| 영역        | 기술                                |
| ----------- | ----------------------------------- |
| 데스크톱 앱 | Electron                            |
| 프론트엔드  | React + TypeScript + Vite           |
| 캐릭터 엔진 | Lottie / PixiJS                     |
| 백엔드      | 미구현 (계획: Node.js + Fastify)    |
| 실시간 통신 | 미구현 (계획: Socket.IO)            |
| AI 엔진     | Electron main 내 provider 직접 호출 |
| DB          | 로컬 파일 저장 (`~/.kafi`)           |
| 모노레포    | Turborepo + pnpm                    |

---

## 🤝 기여

기여를 환영합니다! [CONTRIBUTING.md](./CONTRIBUTING.md)를 먼저 읽어주세요.

---

## 📄 라이선스

MIT License — 자세한 내용은 [LICENSE](./LICENSE) 파일을 참고하세요.
