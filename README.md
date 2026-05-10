# Tatuga School Server

This repository is aim to build api for tatuga school server

## Tech Stack

### Core Framework & Runtime

- **Runtime:** [Bun](https://bun.sh/)
- **Framework:** [NestJS](https://nestjs.com/)
- **Language:** [TypeScript](https://www.typescriptlang.org/)

### Database & Caching

- **ORM:** [Prisma](https://www.prisma.io/)
- **Database:** MongoDB
- **Caching / In-Memory:** Redis (`ioredis`)

### Authentication & Security

- **Authentication:** Passport.js (Local, JWT, Google OAuth2)
- **Security Utilities:** bcrypt

### Cloud Services & External Integrations

- **Cloud Storage:** AWS S3 (`@aws-sdk/client-s3`)
- **AI Integration:** Google Generative AI (`@google/genai`)
- **Google Services:** Google APIs (`googleapis`)
- **Payments:** Stripe (`stripe`)
- **Messaging:** LINE Bot SDK (`@line/bot-sdk`)

### Email & Push Notifications

- **Email Delivery:** Nodemailer, MailerSend (`@nestjs-modules/mailer`)
- **Push Notifications:** Web Push (`web-push`)

### Utilities & Data Processing

- **File Processing:** PDF parsing (`pdf-parse`, `pdfjs-dist`), Excel (`exceljs`), HTML parsing (`cheerio`)
- **Media Processing:** Image handling (`canvas`, `blurhash`)
- **Task Scheduling:** NestJS Schedule (`@nestjs/schedule`)
- **Rate Limiting:** NestJS Throttler (`@nestjs/throttler`)

### DevOps & Tooling

- **Containerization:** Docker, Docker Compose
- **Testing:** Jest, Supertest
- **Code Quality:** ESLint, Prettier, Biome
- **Process Manager:** PM2
