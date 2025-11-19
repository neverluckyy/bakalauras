## Hierarchy of Computerized Functions

```mermaid
flowchart TD
  A[Social-Engineering Learning App]

  %% Top-level areas
  A --> A1[Authentication]
  A --> A2[Learning]
  A --> A3[Questions & Quizzes]
  A --> A4[Leaderboard]
  A --> A5[User Profile & Stats]
  A --> A6[Frontend Pages]

  %% Authentication
  A1 --> A1a[Register (POST /api/auth/register)]
  A1 --> A1b[Login (POST /api/auth/login)]
  A1 --> A1c[Logout (POST /api/auth/logout)]
  A1 --> A1d[Current User (GET /api/auth/me)]
  A1 --> A1e[JWT Validation (middleware/auth)]

  %% Learning
  A2 --> A2a[Modules (GET /api/modules)]
  A2 --> A2b[Module Details (GET /api/modules/:id)]
  A2 --> A2c[Sections of Module (GET /api/modules/:id/sections)]
  A2 --> A2d[Section Details (GET /api/sections/:sectionId)]
  A2 --> A2e[Learning Content (GET /api/learning-content/section/:sectionId)]
  A2 --> A2f[Learning Progress (GET /api/learning-content/section/:sectionId/progress)]
  A2 --> A2g[Mark Content Complete (POST /api/learning-content/:contentId/complete)]

  %% Questions & Quizzes
  A3 --> A3a[Next Question in Section (GET /api/questions/sections/:sectionId/next)]
  A3 --> A3b[Get Question (GET /api/questions/:questionId)]
  A3 --> A3c[Submit Answer (POST /api/questions/:questionId/answer)]
  A3 --> A3d[XP Award & Level Update]
  A3d --> A3d1[Update users.total_xp]
  A3d --> A3d2[Compute level = floor(total_xp/100)+1]
  A3 --> A3e[Section Progress Aggregation]

  %% Leaderboard
  A4 --> A4a[Top 10 by XP (GET /api/leaderboard)]

  %% User Profile & Stats
  A5 --> A5a[Update Profile (PUT /api/user/profile)]
  A5 --> A5b[User Stats (GET /api/user/stats)]
  A5 --> A5c[Achievements (GET /api/user/achievements)]

  %% Frontend Pages (React)
  A6 --> A6a[Home]
  A6 --> A6b[Modules]
  A6 --> A6c[Section Learn]
  A6 --> A6d[Section Quiz]
  A6 --> A6e[Leaderboard]
  A6 --> A6f[Profile]
  A6 --> A6g[Settings]
  A6 --> A6h[Auth: Login / Register]

  %% Page-to-API relationships (high level)
  A6a -.-> A2a
  A6b -.-> A2a
  A6b -.-> A2c
  A6c -.-> A2d
  A6c -.-> A2e
  A6c -.-> A2f
  A6d -.-> A3a
  A6d -.-> A3b
  A6d -.-> A3c
  A6e -.-> A4a
  A6f -.-> A5a
  A6f -.-> A5b
  A6f -.-> A5c
  A6h -.-> A1a
  A6h -.-> A1b
  A6h -.-> A1c
  A6h -.-> A1d
```

Notes:
- Authentication relies on JWT via HTTP-only cookies; all protected routes pass through `middleware/auth`.
- XP awards are +10 on correct answers; levels increase every 100 XP.
- Learning content and progress are per-section; questions power quiz progression and section completion.

