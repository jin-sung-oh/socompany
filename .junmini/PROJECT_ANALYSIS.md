# 프로젝트 분석

## 1. 개요
- 프로젝트명: secretary (KAFI)
- 목적: 로컬 LLM(Ollama)과 AI Agent 팀을 활용하여 사용자의 업무를 돕는 데스크톱 비서 애플리케이션
- 기술 스택:
  - Electron (데스크톱 프레임워크)
  - React + TypeScript + Vite (프론트엔드)
  - Three.js + React Three Fiber (3D 캐릭터 렌더링)
  - Zustand (상태 관리 및 영속성)
  - Ollama (로컬 LLM 엔진)
  - Lucide React (아이콘)

## 2. 구조
- `packages/desktop`: Electron 메인 프로세스, IPC 핸들러, 설정 관리, 트레이 아이콘
- `packages/renderer`: React UI, 2D 픽셀 타이쿤 대시보드(메인), 위젯, 설정 패널
- `packages/shared`: 공통 타입 정의
- `packages/server`: (예정) 백엔드 서버 기능

## 3. 진입점 및 흐름
- 메인 진입점: `packages/desktop/src/index.ts`
- 실행 흐름:
  1. Electron 실행 후 메인 윈도우(대시보드)와 위젯 윈도우 생성
  2. IPC를 통해 Ollama 로컬 서버와 통신 설정
  3. 렌더러에서 Zustand 스토어를 통해 상태 공유 및 UI 업데이트
  4. 사용자가 2D 픽셀 오피스 대시보드에서 에이전트 팀의 활동을 타이쿤 게임처럼 모니터링 및 지시

## 4. 핵심 파일
- `packages/desktop/src/ipc.ts`: Ollama 통신 및 에이전트 상태 시뮬레이션
- `packages/renderer/src/ui/OfficeDashboard2D.tsx`: 2D 픽셀 아트 스타일의 오피스 타이쿤 뷰
- `packages/renderer/src/ui/WidgetView.tsx`: 위젯 UI 및 채팅 인터페이스
- `packages/renderer/src/stores/useAgentStore.ts`: 에이전트 위치, 상태, 이동 로직 관리
- `packages/renderer/src/stores/useChatStore.ts`: 채팅 기록 영속성 관리

## 5. 설정 / 환경
- 규칙 파일 위치: `.junmini/RULES.md`
- 시작 파일 위치: `.junmini/START.md`
- 로컬 설정 저장: Electron의 `userData` 경로 내 `settings.json`

## 6. 주의사항
- 로컬 LLM 사용을 위해 Ollama가 사전에 설치되어 있어야 함
- React 18 호환을 위해 Three.js 관련 라이브러리 버전을 고정하여 사용 중

## 7. 프론트엔드
- 스타일: CSS Variables와 유틸리티 클래스를 혼용한 커스텀 CSS (styles.css)
- 컴포넌트 구조: 기능별 UI 컴포넌트와 비즈니스 로직을 담은 스토어 분리
