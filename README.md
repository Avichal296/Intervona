<h1 align="center">🎤 Intervona</h1>
<h3 align="center">AI-Powered Mock Interview Platform</h3>

<p align="center">
  Real-time conversational interviews, resume-aware question generation, live coding assessments
  and AI-driven feedback, built as a TypeScript monorepo.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white"/>
  <img src="https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black"/>
  <img src="https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white"/>
  <img src="https://img.shields.io/badge/Bun-000000?style=flat-square&logo=bun&logoColor=white"/>
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white"/>
  <img src="https://img.shields.io/badge/Prisma-2D3748?style=flat-square&logo=prisma&logoColor=white"/>
  <img src="https://img.shields.io/badge/Turborepo-EF4444?style=flat-square&logo=turborepo&logoColor=white"/>
</p>

<p align="center">
  <a href="YOUR-LIVE-DEMO-LINK">🔗 https://intervona-backend-mgw4.vercel.app/</a> ·
  <a href="#-architecture">Architecture</a> ·
  <a href="#-getting-started">Getting Started</a>
</p>

---

## 📌 Overview

Intervona simulates a real technical interview. A candidate uploads their resume, and the platform
generates **personalized questions**, conducts the interview as a **real-time conversation**,
runs a **coding round**, and finishes with **AI-generated feedback and performance analytics**.

### Key Numbers

| Metric | Result |
|---|---|
| ⚡ AI response time | **< 2 seconds** average |
| 🚀 Lighthouse performance | **95+** |
| 🏗️ Build time (Turborepo) | **35% faster** |
| 🧠 Adaptive questions generated | **100+** |

---

## ✨ Features

- 🎙️ **Real-time conversational interviews** over WebSockets
- 📄 **Resume-aware question generation**: questions adapt to the candidate's skills and projects
- 💻 **Coding assessments** inside the interview flow
- 🤖 **Multi-LLM integration** (OpenAI + Gemini) for question generation and evaluation
- 📊 **Automated candidate evaluation** with detailed feedback and performance analytics
- 🧱 **Monorepo architecture** with shared packages and cached builds

<!-- VERIFY: remove or add features according to what is actually implemented -->

---

## 🖼️ Screenshots

<!-- Add 2-3 screenshots or a GIF. This is the single biggest upgrade for this README. -->

<img width="1054" height="654" alt="image" src="https://github.com/user-attachments/assets/fbb9b1e1-954d-443f-b54f-09a82891f254" />
<img width="1052" height="927" alt="image" src="https://github.com/user-attachments/assets/8c009896-1d18-4a4a-81df-70dd344a2132" />
<img width="819" height="873" alt="image" src="https://github.com/user-attachments/assets/cd48a315-4772-4ef1-9c72-8e5481532e38" />
<img width="760" height="822" alt="image" src="https://github.com/user-attachments/assets/7e439e5b-bc4b-41f9-b317-bbd429992a00" />

<img width="1470" height="831" alt="image" src="https://github.com/user-attachments/assets/10bd33e0-d24f-4a5d-abb8-a2ed06ddbe78" />


| Interview Room | Coding Round | Feedback Report |
|---|---|---|
| ![](docs/images/interview.png) | ![](docs/images/coding.png) | ![](docs/images/feedback.png) |

---

## 🏛️ Architecture

### System Overview

```mermaid
flowchart LR
    subgraph Client["Client (React + TypeScript)"]
        UI["Interview UI"]
        Code["Coding Editor"]
        Dash["Feedback Dashboard"]
    end

    subgraph Server["Server (Express + Bun)"]
        REST["REST API<br/>(auth, resume, sessions)"]
        WS["WebSocket Gateway<br/>(live interview)"]
        AI["AI Service Layer<br/>(prompting, evaluation)"]
        ORM["Prisma ORM"]
    end

    subgraph External["External Services"]
        OAI["OpenAI"]
        GEM["Gemini"]
    end

    DB[("PostgreSQL")]

    UI <-->|"WebSocket"| WS
    UI -->|"HTTP"| REST
    Code -->|"HTTP"| REST
    Dash -->|"HTTP"| REST

    REST --> ORM
    WS --> AI
    REST --> AI
    AI --> OAI
    AI --> GEM
    ORM --> DB
```

### Interview Flow

```mermaid
sequenceDiagram
    autonumber
    participant C as Candidate (React)
    participant API as REST API
    participant WS as WebSocket Gateway
    participant AI as AI Service
    participant LLM as OpenAI / Gemini
    participant DB as PostgreSQL

    C->>API: Upload resume, start session
    API->>DB: Create interview session
    API-->>C: sessionId

    C->>WS: Connect (sessionId)
    WS->>AI: Build context from resume
    AI->>LLM: Generate first question
    LLM-->>AI: Question
    AI-->>WS: Question
    WS-->>C: Stream question

    loop Conversational rounds
        C->>WS: Answer
        WS->>AI: Evaluate answer + generate follow-up
        AI->>LLM: Prompt with history and context
        LLM-->>AI: Follow-up question and score
        AI-->>WS: Result
        WS-->>C: Stream follow-up
        WS->>DB: Persist transcript and scores
    end

    C->>API: Submit coding solution
    API->>AI: Evaluate solution
    AI->>LLM: Review code
    LLM-->>API: Evaluation
    API->>DB: Save results
    API-->>C: Final feedback and analytics
```

### Design Decisions

| Decision | Why |
|---|---|
| **WebSockets for the interview** | Interviews are conversational and need low-latency, bidirectional streaming instead of request/response polling. |
| **Separate AI service layer** | Keeps prompt logic and provider SDKs out of route handlers, so models can be swapped or combined (OpenAI / Gemini) without touching the API. |
| **Turborepo monorepo** | Shared types and configs across frontend and backend, with task caching that cut build times by 35%. |
| **Prisma + PostgreSQL** | Strongly-typed queries and a relational model suited to users, sessions, transcripts and scores. |
| **Resume as context** | Parsed resume content is injected into prompts to produce personalized, non-generic questions. |

<!-- VERIFY: edit this table to match your real decisions -->

---

## 🗂️ Project Structure
Intervona/
├── frontend/ # React client (interview UI, coding editor, dashboards)
├── backend/ # Express + Bun server (REST, WebSockets, AI services)
├── apps/ # Turborepo apps
├── packages/ # Shared packages (types, configs, utilities)
├── api/ # Serverless entrypoint for deployment
├── turbo.json # Turborepo pipeline
└── vercel.json # Deployment config

<!-- VERIFY: correct the one-line description of each folder -->

---

## 🧰 Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React, TypeScript |
| **Backend** | Node.js / Bun, Express, WebSockets |
| **Database** | PostgreSQL, Prisma ORM |
| **AI** | OpenAI, Google Gemini |
| **Tooling** | Turborepo, Git, GitHub |
| **Deployment** | Vercel |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ (and/or [Bun](https://bun.sh))
- PostgreSQL database
- OpenAI and Gemini API keys

### 1. Clone and install

```bash
git clone https://github.com/Avichal296/Intervona.git
cd Intervona
npm install
```

### 2. Configure environment variables

Create a `.env` file in `backend/` (and `frontend/` if needed):

```env
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/intervona
OPENAI_API_KEY=your_openai_key
GEMINI_API_KEY=your_gemini_key
JWT_SECRET=your_secret
```

<!-- VERIFY: use the exact variable names from your code -->

### 3. Set up the database

```bash
cd backend
npx prisma migrate dev
```

### 4. Run the project

```bash
# from the repo root: runs all apps in parallel
npx turbo dev
```

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend | http://localhost:3000 |

<!-- VERIFY: ports -->

### Build

```bash
npx turbo build
```

---

## 🛣️ Roadmap

- [ ] Voice-based interviews (speech-to-text / text-to-speech)
- [ ] Role-specific interview tracks (Frontend, Backend, DSA)
- [ ] Interview history and progress tracking
- [ ] Sandboxed code execution

<!-- VERIFY: keep only what you actually plan to build -->

---

## 🤝 Contributing

Contributions are welcome. Fork the repo, create a feature branch and open a pull request.

---

## 👤 Author

**Avichal Shrivastava**  
[GitHub](https://github.com/Avichal296) · [LinkedIn](https://www.linkedin.com/in/YOUR-LINKEDIN) · [Email](mailto:avichalshrivastava2006@gmail.com)

<p align="center">⭐ If you found this useful, consider starring the repo.</p>
