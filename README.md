Backend

Backend foundation ของฟีเจอร์ **Agent Chat: Sprint 1** สำหรับโปรเจกต์
Multi-Agent Financial Data and Investment Intelligence Platform

Branch นี้รับผิดชอบเฉพาะ backend ของ Agent Chat และออกแบบให้ทดสอบได้โดยไม่ต้องรอ frontend หรือระบบ Login จริง

## สิ่งที่ทำใน branch `backend`

- สร้าง Chat API สำหรับสร้าง ลบ ดู และส่งข้อความใน conversation
- สร้าง `ChatService` และ `InvestmentAgent` แยกจาก route/controller
- เชื่อมต่อ AI ผ่าน OpenAI Responses API
- ตั้งค่าเริ่มต้นเป็น `gpt-5.6-luna` และ reasoning `medium`
- รองรับ function calling ไปยัง Market Tool และ News Tool
- เพิ่ม SQLite persistence สำหรับ conversations และ messages
- เพิ่ม repository abstraction เพื่อเปลี่ยน database ในอนาคตได้ง่าย
- เพิ่ม mock user ผ่าน `X-Dev-User-Id` แทน authentication จริงใน Sprint 1
- จำกัดการเข้าถึง conversation ตาม `userId`
- เพิ่ม error handling, development logging และไม่เปิดเผย chain-of-thought
- เพิ่ม automated tests และตัวอย่างคำสั่งทดสอบ API

## โครงสร้างหลัก

```text
src/
├─ agent/
│  ├─ investment-agent.ts   # Agent orchestration และ tool loop
│  ├─ provider.ts           # AI provider abstraction + OpenAI provider
│  ├─ system-prompt.ts      # System prompt ของ Agent
│  └─ tools.ts              # Market/News interfaces และ mock adapters
├─ auth/
│  └─ current-user.ts       # Mock authentication adapter
├─ db/
│  └─ sqlite.ts             # SQLite schema/bootstrap
├─ repositories/
│  └─ conversation-repository.ts
├─ services/
│  └─ chat-service.ts
├─ app.ts                   # Fastify app และ API routes
└─ server.ts                # Server entry point
```

## API ที่มีให้ใช้

| Method | Endpoint | รายละเอียด |
| --- | --- | --- |
| `GET` | `/health` | ตรวจสอบสถานะ server |
| `POST` | `/api/conversations` | สร้าง conversation |
| `GET` | `/api/conversations` | ดู conversation ของ user ปัจจุบัน |
| `GET` | `/api/conversations/:id` | ดู conversation และประวัติข้อความ |
| `POST` | `/api/conversations/:id/messages` | ส่งข้อความให้ Agent |
| `DELETE` | `/api/conversations/:id` | ลบ conversation ของ user ปัจจุบัน |

ตัวอย่าง request ส่งข้อความ:

```json
{
  "message": "What is happening with NVDA today?"
}
```

ตัวอย่าง response จะมี `answer`, `conversationId`, `messageId`, `sources`
และ `toolCalls`

## Development authentication

ถ้าไม่ส่ง header ระบบจะใช้ user เริ่มต้น:

```text
dev-user-001
```

หรือกำหนด user เองด้วย header:

```text
X-Dev-User-Id: user-a
```

เมื่อระบบ authentication จริงพร้อมใช้งาน ให้เปลี่ยน implementation ใน
`src/auth/current-user.ts` โดยไม่ต้องแก้ Agent Chat ส่วนอื่น

## Environment variables

ดูตัวอย่างได้ที่ `.env.example`:

```text
OPENAI_API_KEY=replace-me
AI_MODEL=gpt-5.6-luna
AI_REASONING_EFFORT=medium
DATABASE_PATH=./data/agent-chat.db
```

ระบบรองรับชื่อคีย์ `OPENAI_API_KEY`, `API_KEY` หรือ `api_key` สำหรับ local
development และจะตรวจ `.env.local` ใน repo รวมถึงโฟลเดอร์ `Senior-Project` ที่อยู่ด้านบนด้วย

ห้าม commit `.env.local` หรือ secret ใด ๆ ขึ้น GitHub

## วิธีรัน

ต้องใช้ Node.js `22.5+` เนื่องจากใช้ SQLite ที่มากับ Node.js

```powershell
npm install
npm run dev
```

Server จะทำงานที่:

```text
http://127.0.0.1:3000
```

## วิธีทดสอบ

รัน automated tests, typecheck และ build:

```powershell
npm test
npm run typecheck
npm run build
```

หรือดูตัวอย่างการยิง API แบบ PowerShell/curl ได้ที่
[`docs/agent-chat.md`](docs/agent-chat.md)

ลำดับการทดสอบหลัก:

```text
สร้าง conversation
→ ส่งข้อความ
→ Agent เรียก Market/News tools
→ บันทึก user และ assistant messages
→ เรียกดู conversation history
```

## สิ่งที่ยังเป็น mock ใน Sprint 1

- Market Tool ยังไม่เชื่อม Market API จริง
- News Tool ยังไม่เชื่อม News API จริง
- เมื่อ provider ยังไม่พร้อม ระบบจะตอบว่า current data unavailable และจะไม่สร้างราคาหรือข่าวขึ้นเอง
- Authentication ยังใช้ mock user จนกว่าทีม frontend/auth จะนำระบบจริงมาเชื่อม

โค้ดส่วน mock ถูกแยกไว้ใน `src/agent/tools.ts` เพื่อให้เปลี่ยนเป็น provider จริงได้โดยไม่ต้องเขียน Agent ใหม่
