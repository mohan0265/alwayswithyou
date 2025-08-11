# Always With You (AWY) 💖

> A beautiful, production-ready widget system that keeps university students emotionally connected with their loved ones across any distance.

[![CI/CD](https://github.com/your-org/awy/workflows/CI/badge.svg)](https://github.com/your-org/awy/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://typescriptlang.org/)
[![React](https://img.shields.io/badge/React-20232A?logo=react&logoColor=61DAFB)](https://reactjs.org/)

## ✨ Features

### 💖 **Emotional Connection**
- **Floating Heart Button**: Beautiful, breathing heart that shows connection status
- **Real-time Presence**: See when your loved ones are online, away, or offline
- **Durmah-style Animations**: Smooth, life-like animations that feel alive
- **Quiet Hours**: Respects do-not-disturb settings and sleep schedules

### 📱 **Communication**
- **Instant Messaging**: Real-time chat with typing indicators and read receipts
- **Video & Voice Calls**: WebRTC-powered calls with crystal clear quality
- **Memory Flashbacks**: Share photos and precious moments
- **Push Notifications**: Stay connected even when away from the browser

### 🛡️ **Privacy & Security**
- **End-to-End Encryption**: All communications are encrypted
- **Student Privacy Controls**: Students control their visibility and availability
- **Row Level Security**: Database-level privacy protection
- **GDPR Compliant**: Built with privacy by design

### 🏫 **University Integration**
- **One-Line Embed**: Add to any website with a single line of code
- **SSO Integration**: Works with university authentication systems
- **Admin Dashboard**: Comprehensive management and analytics
- **Scalable Architecture**: Handles thousands of concurrent users

## 🚀 Quick Start

### For Universities (Embedding the Widget)

Add AWY to your website with just one line of code:

```html
<script src="https://widget.awy.com/awy.js" data-org="your-university"></script>
```

### For Developers (Local Development)

```bash
# Clone the repository
git clone https://github.com/your-org/awy.git
cd awy

# Install dependencies
pnpm install

# Start development servers
pnpm run dev

# Or use Docker
./deploy.sh development
```

## 📖 Documentation

- [**Getting Started**](docs/getting-started.md) - Quick setup guide
- [**API Reference**](docs/api-reference.md) - Complete API documentation
- [**Widget Integration**](docs/widget-integration.md) - How to embed the widget
- [**Admin Guide**](docs/admin-guide.md) - Managing your AWY deployment
- [**Deployment Guide**](docs/deployment.md) - Production deployment instructions
- [**Contributing**](docs/contributing.md) - How to contribute to AWY

## 🏗️ Architecture

AWY is built as a modern TypeScript monorepo with the following components:

```
awy/
├── apps/
│   ├── server/          # Fastify API server with WebSocket support
│   ├── widget/          # Embeddable React widget
│   ├── admin/           # Admin console (React + shadcn/ui)
│   └── sandbox/         # Development playground
├── packages/
│   ├── schema/          # Zod schemas and types
│   ├── utils/           # Shared utilities
│   ├── ui/              # Shared UI components
│   └── sdk/             # JavaScript SDK
└── infra/
    ├── supabase/        # Database migrations and config
    ├── nginx/           # Reverse proxy configuration
    └── docker/          # Container configurations
```

### Technology Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Framer Motion
- **Backend**: Node.js, Fastify, WebSocket, TypeScript
- **Database**: PostgreSQL with Supabase
- **Real-time**: WebSocket, Server-Sent Events
- **Authentication**: JWT, Row Level Security
- **Deployment**: Docker, Docker Compose, Nginx
- **Monitoring**: Prometheus, Grafana
- **Testing**: Vitest, Playwright, Jest

## 🌟 Screenshots

### Widget in Action
![AWY Widget](docs/images/widget-demo.png)

### Admin Dashboard
![Admin Dashboard](docs/images/admin-dashboard.png)

### Mobile Experience
![Mobile Widget](docs/images/mobile-widget.png)

## 🔧 Configuration

### Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/awy_db
REDIS_URL=redis://localhost:6379

# Authentication
JWT_SECRET=your-super-secret-jwt-key
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# Push Notifications
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key

# CORS
CORS_ORIGIN=https://yourdomain.com
```

See [`.env.example`](.env.example) for a complete list of configuration options.

## 📊 Monitoring & Analytics

AWY includes comprehensive monitoring out of the box:

- **Prometheus Metrics**: Application and system metrics
- **Grafana Dashboards**: Beautiful visualizations and alerts
- **Health Checks**: Automated service monitoring
- **Error Tracking**: Comprehensive error logging and reporting

Access monitoring at:
- Prometheus: `http://localhost:9090`
- Grafana: `http://localhost:3003` (admin/admin)

## 🧪 Testing

```bash
# Run all tests
pnpm test

# Unit tests
pnpm test:unit

# E2E tests
pnpm test:e2e

# Coverage report
pnpm test:coverage
```

## 🚀 Deployment

### Docker (Recommended)

```bash
# Production deployment
./deploy.sh production

# Development deployment
./deploy.sh development
```

### Manual Deployment

See our [Deployment Guide](docs/deployment.md) for detailed instructions on:
- Cloud deployment (AWS, GCP, Azure)
- Kubernetes deployment
- SSL certificate setup
- Domain configuration

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](docs/contributing.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Run the test suite: `pnpm test`
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with love for university students and their families
- Inspired by the need for emotional connection in digital education
- Special thanks to the open-source community

## 📞 Support

- **Documentation**: [docs.awy.com](https://docs.awy.com)
- **Issues**: [GitHub Issues](https://github.com/your-org/awy/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/awy/discussions)
- **Email**: support@awy.com

---

<div align="center">
  <p>Made with 💖 for keeping families connected</p>
  <p>
    <a href="https://awy.com">Website</a> •
    <a href="https://docs.awy.com">Documentation</a> •
    <a href="https://demo.awy.com">Live Demo</a>
  </p>
</div>

