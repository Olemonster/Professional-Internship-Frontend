# Professional Internship (Frontend)

เว็บแอปบริหารจัดการฝึกงานที่รองรับบทบาท Student / Company / Advisor / Admin ในระบบเดียว ใช้ **React 19 + Vite + Tailwind CSS + Material UI** เพื่อสร้างประสบการณ์ที่รวดเร็วและตอบสนองทุกอุปกรณ์

## Highlights

- 🧩 Multi-role Dashboards — Layout และเมนูจะปรับตามบทบาทผู้ใช้
- 📊 Insightful Cards & Charts — ใช้ amCharts5 + Material UI พร้อมปุ่ม export XLSX
- 🔐 Auth-aware Navigation — มี route guard และซิงก์ state กับ localStorage
- 📱 Responsive-first — ผสาน Tailwind + custom CSS รองรับ desktop / tablet / mobile

## โครงสร้างโปรเจกต์ (ภาพรวม)

```text
src/
├─ api/          # Axios wrapper + service layer
├─ assets/       # โลโก้ รูปภาพ ฟอนต์ (@fontsource/kanit)
├─ components/   # Sidebar, Widgets, Cards, Tables, Charts
├─ pages/
│  ├─ Home/      # Landing page
│  ├─ LoginPage/ # ฟอร์มเข้าสู่ระบบ
│  ├─ Admin/     # Users, Requests, Check-ins, Payments dashboards
│  ├─ Advisor/   # Advisee overview + การอนุมัติคำร้อง
│  ├─ Company/   # รายชื่อผู้ฝึกงาน + ฟอร์มเช็คชื่อ
│  └─ Student/   # โปรไฟล์ + ส่งคำร้อง + เช็คชื่อ + แจ้งชำระเงิน
├─ utils/        # formatter, validators, export helpers, auth guards
├─ App.jsx       # Routing + Layout switching ตามบทบาท
└─ main.jsx      # Entry point + providers + router
```

## ความต้องการระบบ

- Node.js 18 LTS ขึ้นไป
- npm 9 ขึ้นไป (หรือจัดการแพ็กเกจอื่นที่เทียบเท่า)

## ขั้นตอนใช้งานสำหรับนักพัฒนา

1. ติดตั้ง dependencies
   ```bash
   npm install
   ```
2. ตั้งค่า Environment (สร้างไฟล์ `.env` ที่ root)
   ```env
   VITE_API_BASE_URL=http://localhost:5000
   VITE_MAPS_KEY=<optional>
   ```
3. รันโหมดพัฒนา
   ```bash
   npm run dev
   ```
4. สร้าง production build และพรีวิว
   ```bash
   npm run build
   npm run preview
   ```

## สคริปต์ NPM

| คำสั่ง | รายละเอียด |
|---------|-------------|
| `npm run dev` | เปิด Vite dev server (hot reload) |
| `npm run build` | บันเดิลไฟล์ production ลง `dist/` |
| `npm run preview` | เปิดเซิร์ฟเวอร์พรีวิว build บน localhost |
| `npm run lint` | ตรวจโค้ดด้วย ESLint |

## Frontend Flow

1. **Login & Role Resolution** — `LoginPage` รับ credential → เรียก service → บันทึก token + role ลง context และ localStorage
2. **Layout & Navigation** — `App.jsx` ตรวจ role ก่อน render layout (Admin / Advisor / Company / Student) เพื่อเลือก sidebar/header ที่ตรงกับสิทธิ์
3. **Modules ตามบทบาท**
   - **Admin**: Dashboard รวมสถิติ + ตารางผู้ใช้/คำร้อง/เช็คชื่อ/การชำระเงิน พร้อม action (approve / reject / export)
   - **Student**: โปรไฟล์, ส่งคำร้อง, เช็คชื่อรายวัน, อัปโหลดสลิปการชำระเงิน, ติดตามสถานะ
   - **Advisor**: ภาพรวม advisee, ตรวจคำร้อง, ให้ความคิดเห็นหรืออนุมัติ
   - **Company**: รายชื่อผู้ฝึกงาน, ฟอร์มเช็คชื่อรายวัน/รายสัปดาห์
4. **Data Hooks & Helpers** — แต่ละหน้าใช้ `api/*Service` และ helper ใน `utils/` เพื่อจัดรูปแบบวันเวลา ตัวเลข และ export
5. **Feedback & Validation** — ใช้ Material UI Snackbar/Dialog แจ้งผล และมี validation ฝั่ง client สำหรับฟอร์มสำคัญ

## Deployment (Frontend เท่านั้น)

1. `npm run build`
2. อัปโหลดโฟลเดอร์ `dist/` ไปยัง static hosting (Netlify, Vercel, S3 ฯลฯ)
3. ตั้งค่า environment บนโฮสต์ให้ตรงกับ `.env` โดยเฉพาะ `VITE_API_BASE_URL`

## Flow Diagram (ข้อความ)

```
Login → ตรวจ role → Render layout เฉพาะบทบาท
  ├─ Admin → Dashboards → Approve/Reject/Export
  ├─ Advisor → Advisee Overview → Review Requests
  ├─ Company → Intern List → Daily Check-in Forms
  └─ Student → Profile → Requests / Check-ins / Payments
```

## แหล่งอ้างอิงเพิ่มเติม

- ฟอนต์หลัก: [Kanit](https://fonts.google.com/specimen/Kanit) + Material UI Theme + Tailwind Utilities
- โครงสร้าง component: ดูเพิ่มเติมที่ `src/components/` และไฟล์ role-specific ภายใต้ `src/pages/`

---
พบปัญหาหรืออยากเสนอฟีเจอร์ใหม่? เปิด issue หรือแจ้งทีมพัฒนาได้เลย 🙌
