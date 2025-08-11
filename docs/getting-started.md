# Getting Started with AWY

Welcome to Always With You (AWY)! This guide will help you get up and running quickly, whether you're a university looking to integrate the widget or a developer wanting to contribute.

## 🎯 What is AWY?

AWY is a beautiful, production-ready widget system that helps university students stay emotionally connected with their loved ones. It provides:

- **Real-time communication** through chat and video calls
- **Emotional presence** with a breathing heart button that shows connection status
- **Privacy-first design** with student-controlled visibility
- **Easy integration** with just one line of code

## 🏫 For Universities

### Quick Integration

The fastest way to add AWY to your website is with our hosted widget:

```html
<script src="https://widget.awy.com/awy.js" data-org="your-university-id"></script>
```

### Step-by-Step Integration

1. **Contact our team** to get your university ID and configuration
2. **Add the script tag** to your website's HTML
3. **Configure your settings** through the admin dashboard
4. **Test the integration** with a few pilot users

### Configuration Options

You can customize the widget behavior with data attributes:

```html
<script 
  src="https://widget.awy.com/awy.js" 
  data-org="stanford"
  data-position="bottom-right"
  data-theme="light"
  data-size="medium">
</script>
```

Available options:
- `data-org`: Your university identifier (required)
- `data-position`: `bottom-right`, `bottom-left`, `top-right`, `top-left`
- `data-theme`: `light`, `dark`, `auto`
- `data-size`: `small`, `medium`, `large`

## 👩‍💻 For Developers

### Prerequisites

- Node.js 20+ and pnpm 8+
- Docker and Docker Compose (for full stack development)
- Git

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/awy.git
   cd awy
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Start development servers**
   ```bash
   # Start all services
   pnpm run dev
   
   # Or start individual services
   pnpm run dev:server   # API server on :3001
   pnpm run dev:widget   # Widget on :3000
   pnpm run dev:admin    # Admin console on :3002
   ```

### Docker Development

For a complete development environment with database and monitoring:

```bash
# Start everything with Docker
./deploy.sh development

# View logs
./deploy.sh development logs

# Stop services
./deploy.sh development stop
```

This will start:
- **API Server**: http://localhost:3001
- **Widget**: http://localhost:3000
- **Admin Console**: http://localhost:3002
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379
- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3003

### Project Structure

```
awy/
├── apps/
│   ├── server/          # Fastify API server
│   │   ├── src/
│   │   │   ├── routes/  # API endpoints
│   │   │   ├── websocket/ # WebSocket handlers
│   │   │   └── index.ts # Server entry point
│   │   └── package.json
│   ├── widget/          # React widget
│   │   ├── src/
│   │   │   ├── components/ # Widget components
│   │   │   ├── hooks/   # React hooks
│   │   │   └── index.ts # Widget entry point
│   │   └── package.json
│   └── admin/           # Admin console
│       ├── src/
│       │   ├── pages/   # Admin pages
│       │   ├── components/ # UI components
│       │   └── App.jsx  # Main app
│       └── package.json
├── packages/
│   ├── schema/          # Zod schemas
│   ├── utils/           # Shared utilities
│   ├── ui/              # Shared components
│   └── sdk/             # JavaScript SDK
└── infra/               # Infrastructure
    ├── supabase/        # Database
    ├── nginx/           # Reverse proxy
    └── docker/          # Containers
```

### Development Workflow

1. **Make your changes** in the appropriate package/app
2. **Run tests** to ensure everything works
   ```bash
   pnpm test
   ```
3. **Check code quality**
   ```bash
   pnpm lint
   pnpm typecheck
   ```
4. **Test your changes** in the browser
5. **Commit and push** your changes

### Common Development Tasks

#### Adding a new API endpoint

1. Create a new route file in `apps/server/src/routes/`
2. Add the route to `apps/server/src/routes/index.ts`
3. Add corresponding types to `packages/schema/src/api.ts`
4. Test the endpoint

#### Adding a new widget feature

1. Create components in `apps/widget/src/components/`
2. Add hooks if needed in `apps/widget/src/hooks/`
3. Update the main widget component
4. Add styles and animations
5. Test across different devices

#### Updating the database schema

1. Create a new migration in `infra/supabase/migrations/`
2. Update the schema types in `packages/schema/src/entities.ts`
3. Run the migration: `pnpm run db:migrate`

## 🧪 Testing

### Running Tests

```bash
# All tests
pnpm test

# Unit tests only
pnpm test:unit

# E2E tests only
pnpm test:e2e

# With coverage
pnpm test:coverage
```

### Writing Tests

- **Unit tests**: Use Vitest for testing utilities and components
- **E2E tests**: Use Playwright for testing user workflows
- **API tests**: Test endpoints with supertest

Example unit test:
```typescript
import { describe, it, expect } from 'vitest';
import { generateJWT } from '../auth';

describe('Auth Utils', () => {
  it('should generate a valid JWT', () => {
    const token = generateJWT({ userId: '123' });
    expect(token).toBeDefined();
  });
});
```

## 🚀 Deployment

### Development Deployment

```bash
./deploy.sh development
```

### Production Deployment

1. **Set up your environment**
   ```bash
   cp .env.production .env
   # Edit .env with production values
   ```

2. **Deploy with Docker**
   ```bash
   ./deploy.sh production
   ```

3. **Configure your domain** to point to your server

4. **Set up SSL certificates** (Let's Encrypt recommended)

See our [Deployment Guide](deployment.md) for detailed production setup instructions.

## 🔧 Configuration

### Environment Variables

Key environment variables you'll need:

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/awy_db

# Authentication
JWT_SECRET=your-super-secret-jwt-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# CORS (for widget embedding)
CORS_ORIGIN=https://yourdomain.com,https://university.edu
```

### Widget Configuration

Configure widget behavior through the admin console or data attributes:

- **Appearance**: Colors, size, position
- **Behavior**: Auto-open, notifications, quiet hours
- **Privacy**: Visibility settings, data retention
- **Integration**: SSO, custom domains

## 📚 Next Steps

- [**Widget Integration Guide**](widget-integration.md) - Detailed embedding instructions
- [**API Reference**](api-reference.md) - Complete API documentation
- [**Admin Guide**](admin-guide.md) - Managing your AWY deployment
- [**Contributing**](contributing.md) - How to contribute to AWY

## 🆘 Getting Help

- **Documentation**: [docs.awy.com](https://docs.awy.com)
- **GitHub Issues**: [Report bugs or request features](https://github.com/your-org/awy/issues)
- **Discussions**: [Community discussions](https://github.com/your-org/awy/discussions)
- **Email**: support@awy.com

Welcome to the AWY community! 💖

