# MindSpace — Product Requirements

## 1. Project Overview

**MindSpace** คือ Web Application สำหรับสร้าง **Infinite Artboard / Knowledge Board** ที่ผู้ใช้สามารถเขียน วาด จัดวางข้อมูล และเชื่อมโยงความคิดได้อย่างอิสระ

แนวคิดหลักคือการรวม:

- Whiteboard
- Mind Map
- Note Taking
- Reading / PDF
- Knowledge Management
- AI Assistant

ไว้ในพื้นที่เดียวกัน

เป้าหมายไม่ใช่การเป็น Note Editor แบบหน้าเอกสาร แต่เป็น **พื้นที่ขนาดใหญ่ที่ผู้ใช้สามารถวางและเชื่อมโยงข้อมูลได้อย่างอิสระ**

---

# 2. Core Concept

แต่ละ Workspace สามารถมีหลาย Board

```text
Workspace
│
├── Backend Learning
├── AI Agent
├── System Design
├── English
├── Reading
└── Random Ideas
```

แต่ละ Board เป็น **Infinite Canvas**

ผู้ใช้สามารถ:

```text
สร้างข้อมูล
   ↓
จัดวางบน Board
   ↓
เชื่อมโยงข้อมูล
   ↓
เพิ่มเอกสาร / รูปภาพ
   ↓
ใช้ AI วิเคราะห์
   ↓
สร้าง Knowledge Map
```

---

# 3. Board / Artboard

Board ต้องเป็นพื้นที่แบบ Infinite Canvas

รองรับ:

- Pan
- Zoom
- Select
- Multi-select
- Drag & Drop
- Resize
- Delete
- Copy / Paste
- Duplicate
- Undo
- Redo

ตัวอย่าง:

```text
                         ┌─────────────┐
                         │   Backend   │
                         └──────┬──────┘
                                │
                 ┌──────────────┼──────────────┐
                 ▼              ▼              ▼
             API Server      Database       Security
                 │
                 ▼
             Validation
```

---

# 4. Board Elements

ผู้ใช้สามารถเพิ่ม Element หลายประเภทลงบน Board

## 4.1 Text

รองรับข้อความทั่วไป

เช่น:

```text
Backend คือระบบที่รับ request
และประมวลผล business logic
```

ควรรองรับ:

- Heading
- Paragraph
- Bold
- Italic
- List
- Code
- Link

---

## 4.2 Sticky Note

สามารถสร้าง Sticky Note สำหรับจดความคิดสั้น ๆ

ตัวอย่าง:

```text
┌───────────────────────┐
│ Question              │
│                       │
│ API ต่างจาก Backend   │
│ ยังไง?                 │
└───────────────────────┘
```

รองรับหลายสี

---

## 4.3 Shape

รองรับ Shape พื้นฐาน เช่น:

- Rectangle
- Circle
- Rounded Rectangle
- Container / Group

---

## 4.4 Checklist

สามารถสร้าง Checklist บน Board

```text
MVP

☑ Infinite Canvas
☑ Text
☑ Connector
☐ AI
☐ Collaboration
```

---

# 5. Mind Mapping / Connector

Element สามารถเชื่อมโยงกันได้

ตัวอย่าง:

```text
Backend
   │
   ├──── API
   │
   ├──── Database
   │
   └──── Authentication
```

Connector ต้องรองรับ:

- Arrow
- Line
- Curved Line
- Node → Node connection

เมื่อ Node ถูกลาก:

```text
Node A ───────► Node B
```

เส้นต้องเคลื่อนตาม Node โดยอัตโนมัติ

ควรสามารถ:

- Select connector
- Delete connector
- เปลี่ยน direction
- เปลี่ยนรูปแบบเส้น

---

# 6. Undo / Redo

ระบบต้องมี Undo / Redo

Actions ที่ควร Undo ได้ เช่น:

- Create Node
- Delete Node
- Move Node
- Resize Node
- Edit Text
- Create Connector
- Delete Connector
- Import Image
- Import PDF

ตัวอย่าง:

```text
Move Node
   ↓
Undo
   ↓
Node กลับตำแหน่งเดิม
```

Keyboard shortcut:

```text
Ctrl/Cmd + Z

Ctrl/Cmd + Shift + Z
```

---

# 7. Auto Save

Board ต้อง Save อัตโนมัติ

ไม่ควรต้องมีปุ่ม Save เป็นหลัก

Flow:

```text
User Edit
   ↓
Local State Update
   ↓
Debounce
   ↓
Save Server
   ↓
Database
```

ตัวอย่าง debounce:

```text
User typing...
User typing...
User typing...

หยุดประมาณ 500 ms

        ↓

Auto Save
```

UI ต้องแสดงสถานะ เช่น:

```text
Saving...

Saved ✓

Syncing...

Offline

Save failed
```

---

# 8. Backend

ระบบต้องมี Backend เพื่อให้ Board ไม่ได้เก็บเฉพาะใน Browser

ข้อมูลหลัก:

```text
User
Workspace
Board
Board Elements
Connections
Files
Board Versions
```

ตัวอย่าง:

```text
Browser
   │
   ▼
Backend API
   │
   ▼
Database
```

---

# 9. Cross-device Sync

ผู้ใช้สามารถ Login จากหลาย Device

ตัวอย่าง:

```text
MacBook
   │
   │
   ▼
Server
   │
   ├──────── Database
   │
   ▼
iPad / PC / Mobile
```

Board ต้องเป็นข้อมูลชุดเดียวกัน

เช่น:

```text
Device A

เพิ่ม Node

      ↓

Server

      ↓

Device B

เห็น Node ใหม่
```

---

# 10. Realtime Sync

เป้าหมายระยะ Production คือรองรับ Realtime

```text
Device A
   │
   │ WebSocket
   ▼
Server
   │
   │ WebSocket
   ▼
Device B
```

เมื่อ Device A:

```text
Move Node
```

Device B ควรเห็น Node เคลื่อนตามโดยไม่ต้อง Refresh

---

# 11. Authentication

ระบบต้องมี User Account

รองรับอย่างน้อย:

- Login
- Logout
- Session
- User Profile

ในอนาคตสามารถรองรับ:

- Google Login
- Microsoft Login
- GitHub Login

---

# 12. Image Import

ผู้ใช้สามารถ Import รูปภาพเข้า Board

รองรับ:

```text
PNG
JPEG
WebP
```

วิธีเพิ่ม:

- Upload
- Drag & Drop
- Paste Image

เมื่อเพิ่มแล้วสามารถ:

- Move
- Resize
- Delete
- Connect กับ Node
- Add Note

ตัวอย่าง:

```text
[Architecture Image]
        │
        │
        ▼
[My explanation]
```

---

# 13. PDF Import

สามารถ Upload PDF เข้า Board

PDF สามารถแสดงเป็น Object บน Board

ควรมีอย่างน้อย 2 รูปแบบ

## Embed PDF

```text
┌──────────────────────────┐
│                          │
│        PDF Viewer        │
│                          │
│         Page 42          │
│                          │
└──────────────────────────┘
```

## Extract PDF Page

ผู้ใช้สามารถนำบางหน้าออกมาวางบน Board

```text
PDF
 │
 ├ Page 40
 ├ Page 41
 └ Page 42
       │
       ▼
   Board Object
```

จากนั้นสามารถเชื่อมกับ Note ได้

```text
PDF Page 42
      │
      ▼
Database Replication
```

---

# 14. Export PDF

สามารถ Export Board เป็น PDF

ตัวอย่าง:

```text
Board
   ↓
Export
   ↓
PDF
```

ควรมีตัวเลือกในอนาคต:

- Export entire board
- Export selected area
- Export selected elements

---

# 15. AI Assistant

Board ต้องมี AI Assistant

AI สามารถใช้ Content ภายใน Board เป็น Context

ตัวอย่าง:

```text
Board

Backend
API
Database
PDF
Notes
Diagram

      ↓

Board Context

      ↓

AI
```

---

# 16. AI Actions

AI ควรรองรับ Action หลักดังนี้

## Summarize

สรุปข้อมูลบน Board

```text
Summarize this board
```

---

## Explain

อธิบาย Node หรือข้อมูลที่เลือก

```text
Explain this concept simply
```

---

## Expand

เพิ่มรายละเอียดจากข้อมูลเดิม

ตัวอย่าง:

```text
Backend

AI Expand

↓

Backend
├── API
├── Authentication
├── Validation
├── Cache
└── Database
```

---

## Check Content

AI ตรวจสอบ:

- ความถูกต้อง
- ความขัดแย้ง
- Concept ที่ผิด
- เนื้อหาที่อาจขาด
- ความสัมพันธ์ของข้อมูล

---

## Improve Content

AI ช่วยปรับ:

- ภาษา
- Structure
- Explanation
- ความชัดเจน

---

## Generate Mind Map

AI สามารถนำข้อมูลมาสร้าง Mind Map

ตัวอย่าง:

```text
User:

"สร้าง mind map จากเรื่อง Backend"
```

AI:

```text
                    Backend
                       │
        ┌──────────────┼──────────────┐
        ▼              ▼              ▼
       API          Database       Security
        │                              │
        ▼                              ▼
   Validation                     Authentication
```

---

# 17. AI → Board Actions

AI ไม่ควรเป็นเพียง Chatbot

AI ต้องสามารถเสนอการแก้ไข Board ได้

ตัวอย่าง AI วิเคราะห์:

```text
Backend Learning board

พบว่าคุณยังขาด:

- Authentication
- Authorization
- Validation
- Caching
```

UI:

```text
[ Apply to Board ]
```

เมื่อกด:

```text
             Backend
                │
        ┌───────┼─────────┐
        ▼       ▼         ▼

Authentication Validation Cache
```

AI สร้าง Node + Connector ให้โดยอัตโนมัติ

---

# 18. AI Safety / Control

AI ไม่ควรแก้ Board โดยอัตโนมัติโดยไม่มีการยืนยัน

Flow:

```text
AI Analyze
    ↓
AI Suggest Changes
    ↓
Preview
    ↓
User Approve
    ↓
Apply to Board
```

เพื่อป้องกัน AI ทำลายข้อมูลของผู้ใช้

---

# 19. AI Context Scope

ผู้ใช้ควรเลือกได้ว่า AI จะอ่านอะไร

```text
Context

○ Selected Node
○ Selected Area
○ Entire Board
○ PDF
```

ตัวอย่าง:

```text
Select 5 Nodes

        ↓

Ask AI

"สรุปข้อมูลพวกนี้"
```

AI อ่านเฉพาะ 5 Nodes

---

# 20. AI Chat Panel

มี AI Panel ด้านขวา

```text
┌──────────────────────┐
│ ✦ Board AI           │
│                      │
│ Summarize            │
│ Expand               │
│ Check                │
│ Mind Map             │
│ Explain              │
│ Improve              │
│                      │
│ -------------------- │
│                      │
│ AI Chat              │
│                      │
│ Ask about board...   │
│                      │
└──────────────────────┘
```

สามารถซ่อน Panel เพื่อเพิ่มพื้นที่ Board ได้

---

# 21. Main Application Layout

Desktop Layout:

```text
┌──────────────┬─────────────────────────────────────┬───────────────┐
│              │                                     │               │
│   Sidebar    │               Board                 │   Board AI    │
│              │                                     │               │
│ Boards       │                                     │ Summarize     │
│              │                                     │ Explain       │
│ Backend      │                                     │ Expand        │
│ AI Agent     │                                     │ Check         │
│ English      │                                     │               │
│ Ideas        │                                     │ AI Chat       │
│              │                                     │               │
│              │                                     │               │
└──────────────┴─────────────────────────────────────┴───────────────┘
```

---

# 22. Board Toolbar

Toolbar ควรมี:

```text
Select

Text

Sticky Note

Shape

Connector

Draw

Checklist

Image

PDF
```

---

# 23. Top Navigation

Top Navigation แสดง:

```text
Board Name

Saved Status

Undo

Redo

Import

Export PDF

Share
```

ตัวอย่าง:

```text
Backend Learning

Saved ✓      ↶  ↷      Import ▾     Export PDF
```

---

# 24. Suggested Technology Stack

## Frontend

```text
Next.js
TypeScript
React
Tailwind CSS
shadcn/ui
pnpm
```

UI รองรับภาษาไทยและภาษาอังกฤษ และมีตัวเลือกเปลี่ยนภาษา

## Deployment

```text
Vercel
```

## Board Engine

แนะนำ:

```text
tldraw
```

แทนการเขียน Canvas Engine เองทั้งหมด

## Backend

```text
Next.js Server Routes / Server Actions
Firebase Admin SDK
```

Business logic และ Firebase access ต้องอยู่หลัง Service/Repository interface
เพื่อไม่ให้ UI ผูกกับ Firebase SDK โดยตรง และยังสามารถแยก Backend Service
ในอนาคตได้ถ้าจำเป็น

## Data Platform

```text
Firebase
```

## Database

```text
Cloud Firestore
```

ใช้เก็บ Workspace, Board metadata และ versioned Board Document

## Local Development / Integration Test

```text
Firebase Emulator Suite
```

## Authentication

```text
Firebase Authentication
```

## Realtime

พิจารณา:

```text
Yjs

หรือ

Liveblocks
```

Firestore realtime listener สามารถใช้ sync ข้อมูลทั่วไปได้ แต่ collaborative
editing และ conflict resolution ต้องตัดสินใจแยกต่างหาก

## File Storage

```text
Firebase Storage
```

## PDF

```text
PDF.js
```

## AI

AI Provider ควรถูกแยกผ่าน AI Service Layer เพื่อไม่ผูกกับ Model เดียว

```text
Board
   ↓
AI Service
   ↓
Provider

├── OpenAI
├── Anthropic
└── Other LLM
```

---

# 25. Suggested Data Model

Conceptual model:

```text
User
 │
 ▼
Workspace
 │
 ▼
Board
 │
 ├── Elements
 │
 ├── Connections
 │
 ├── Files
 │
 └── Versions
```

ตัวอย่าง Entity:

```text
users

workspaces

boards

board_elements

board_connections

files

board_versions

ai_actions
```

---

# 26. Development Phases

## Phase 1 — Board Core

ทำให้ Board ใช้งานได้ก่อน

```text
Infinite Canvas

Pan / Zoom

Text

Sticky Note

Shape

Connector

Move

Resize

Delete

Undo / Redo
```

---

## Phase 2 — Persistence

เพิ่มระบบเก็บข้อมูล

```text
Authentication

Backend API

PostgreSQL

Save Board

Auto Save

Load Board
```

เป้าหมาย:

```text
Refresh Browser

→ Board ยังอยู่
```

---

## Phase 3 — Cross-device / Realtime

เพิ่ม:

```text
Realtime Sync

WebSocket

Conflict Handling
```

เป้าหมาย:

```text
Device A
     ↕
Server
     ↕
Device B
```

---

## Phase 4 — Files

เพิ่ม:

```text
Image Upload

PDF Upload

PDF Viewer

PDF Page Extraction

File Storage

Export PDF
```

---

## Phase 5 — AI

เพิ่ม:

```text
Board Context

AI Chat

Summarize

Explain

Expand

Check Content

Improve

Generate Mind Map

AI → Board Actions
```

---

## Phase 6 — Production

เพิ่มความพร้อม Production

```text
Version History

Board Backup

Offline Support

Error Recovery

Permission

Sharing

Monitoring

Logging

Rate Limiting

Security

AI Usage / Cost Tracking
```

---

# 27. MVP Definition

MVP แรกถือว่าสำเร็จเมื่อ User สามารถ:

1. Login
2. สร้าง Board
3. สร้าง Text / Sticky / Shape
4. ลากและ Resize Element
5. เชื่อม Element แบบ Mind Map
6. Undo / Redo
7. Auto Save
8. Refresh แล้วข้อมูลไม่หาย
9. เปิดอีก Device แล้วเห็น Board เดิม
10. Import Image
11. Import PDF
12. Export Board เป็น PDF
13. Ask AI เกี่ยวกับข้อมูลบน Board
14. ให้ AI เสนอ Node ใหม่
15. User กด Approve แล้ว AI เพิ่ม Node ลง Board

---

# 28. Product Vision

เป้าหมายสุดท้ายคือทำให้ Board ไม่ใช่เพียง Whiteboard แต่เป็น **AI-powered Personal Knowledge Workspace**

ผู้ใช้สามารถ:

```text
คิด
 ↓
เขียน
 ↓
วาด
 ↓
อ่าน
 ↓
เชื่อมโยง
 ↓
ถาม AI
 ↓
AI ช่วยเติม Knowledge
 ↓
กลับมาเรียนรู้ต่อ
```

แนวคิดสำคัญคือ:

> ข้อมูลทุกอย่างสามารถวางบนพื้นที่เดียวกัน เชื่อมโยงกัน และ AI สามารถเข้าใจความสัมพันธ์ของข้อมูลเหล่านั้นเพื่อช่วยผู้ใช้คิด เรียนรู้ และต่อยอดความรู้ได้
