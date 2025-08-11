# Deployment Guide

This guide covers deploying AWY to production environments. AWY is designed to be cloud-native and can be deployed on various platforms.

## 🚀 Quick Deployment (Docker)

The fastest way to deploy AWY is using our Docker setup:

```bash
# Clone the repository
git clone https://github.com/your-org/awy.git
cd awy

# Configure environment
cp .env.production .env
# Edit .env with your values

# Deploy
./deploy.sh production
```

## 📋 Prerequisites

### System Requirements

- **CPU**: 2+ cores recommended
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 20GB minimum, SSD recommended
- **Network**: Public IP with ports 80, 443 open

### Software Requirements

- Docker 20.10+
- Docker Compose 2.0+
- Git
- OpenSSL (for SSL certificates)

### External Services

- **Database**: PostgreSQL 15+ (or use included Docker container)
- **Cache**: Redis 7+ (or use included Docker container)
- **Email**: SMTP server for notifications
- **Domain**: Domain name with DNS control

## 🔧 Configuration

### Environment Variables

Create a `.env` file with your configuration:

```bash
# Database Configuration
POSTGRES_PASSWORD=your_secure_postgres_password
DATABASE_URL=postgresql://awy_user:your_secure_postgres_password@postgres:5432/awy_db

# Redis Configuration  
REDIS_PASSWORD=your_secure_redis_password
REDIS_URL=redis://:your_secure_redis_password@redis:6379

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_minimum_32_characters_long

# Supabase Configuration (if using Supabase)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Push Notifications
VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
VAPID_SUBJECT=mailto:admin@yourdomain.com

# Frontend URLs
REACT_APP_API_URL=https://api.yourdomain.com
REACT_APP_WIDGET_URL=https://widget.yourdomain.com

# Email Configuration
SMTP_HOST=smtp.yourdomain.com
SMTP_PORT=587
SMTP_USER=noreply@yourdomain.com
SMTP_PASSWORD=your_smtp_password
SMTP_FROM=AWY System <noreply@yourdomain.com>

# Security
BCRYPT_ROUNDS=12
SESSION_SECRET=your_session_secret_minimum_32_characters_long
CORS_ORIGIN=https://yourdomain.com,https://university.edu
```

### Domain Configuration

Update `infra/nginx/conf.d/awy.conf` with your domains:

```nginx
server_name api.yourdomain.com;     # API server
server_name widget.yourdomain.com;  # Widget
server_name admin.yourdomain.com;   # Admin console
```

## 🌐 Deployment Options

### Option 1: Single Server (Recommended for Small-Medium Scale)

Deploy all services on a single server using Docker Compose.

#### Step 1: Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Logout and login to apply group changes
```

#### Step 2: Deploy AWY

```bash
# Clone repository
git clone https://github.com/your-org/awy.git
cd awy

# Configure environment
cp .env.production .env
nano .env  # Edit with your values

# Generate SSL certificates (Let's Encrypt recommended)
sudo apt install certbot
sudo certbot certonly --standalone -d api.yourdomain.com -d widget.yourdomain.com -d admin.yourdomain.com

# Copy certificates
sudo cp /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem infra/ssl/awy.crt
sudo cp /etc/letsencrypt/live/api.yourdomain.com/privkey.pem infra/ssl/awy.key
sudo chown $USER:$USER infra/ssl/*

# Deploy
./deploy.sh production
```

#### Step 3: Configure DNS

Point your domains to your server's IP:

```
A    api.yourdomain.com      -> YOUR_SERVER_IP
A    widget.yourdomain.com   -> YOUR_SERVER_IP  
A    admin.yourdomain.com    -> YOUR_SERVER_IP
```

### Option 2: Cloud Deployment (AWS)

Deploy AWY on AWS using ECS or EC2.

#### AWS ECS Deployment

1. **Create ECS Cluster**
   ```bash
   aws ecs create-cluster --cluster-name awy-cluster
   ```

2. **Build and Push Images**
   ```bash
   # Build images
   docker-compose build

   # Tag and push to ECR
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com

   docker tag awy-server:latest YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/awy-server:latest
   docker push YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/awy-server:latest
   ```

3. **Create Task Definitions and Services**
   Use the provided CloudFormation template in `infra/aws/`.

#### AWS EC2 Deployment

1. **Launch EC2 Instance**
   - Instance type: t3.medium or larger
   - Security groups: Allow ports 22, 80, 443
   - Storage: 20GB+ EBS volume

2. **Follow Single Server deployment steps**

### Option 3: Kubernetes Deployment

Deploy AWY on Kubernetes for high availability and scalability.

#### Prerequisites

- Kubernetes cluster (1.20+)
- kubectl configured
- Helm 3.0+

#### Deployment

```bash
# Add AWY Helm repository
helm repo add awy https://charts.awy.com
helm repo update

# Install AWY
helm install awy awy/awy \
  --set global.domain=yourdomain.com \
  --set database.password=your_db_password \
  --set redis.password=your_redis_password \
  --set jwt.secret=your_jwt_secret
```

Or use the Kubernetes manifests in `infra/k8s/`:

```bash
# Apply manifests
kubectl apply -f infra/k8s/
```

## 🔒 SSL/TLS Configuration

### Let's Encrypt (Recommended)

```bash
# Install certbot
sudo apt install certbot

# Get certificates
sudo certbot certonly --standalone \
  -d api.yourdomain.com \
  -d widget.yourdomain.com \
  -d admin.yourdomain.com

# Copy to AWY directory
sudo cp /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem infra/ssl/awy.crt
sudo cp /etc/letsencrypt/live/api.yourdomain.com/privkey.pem infra/ssl/awy.key
sudo chown $USER:$USER infra/ssl/*

# Set up auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet && docker-compose restart nginx
```

### Custom Certificates

If you have your own SSL certificates:

```bash
# Copy your certificates
cp your-certificate.crt infra/ssl/awy.crt
cp your-private-key.key infra/ssl/awy.key
```

## 📊 Monitoring Setup

AWY includes comprehensive monitoring with Prometheus and Grafana.

### Accessing Monitoring

- **Prometheus**: https://yourdomain.com:9090
- **Grafana**: https://yourdomain.com:3003 (admin/admin)

### Custom Dashboards

Import the provided Grafana dashboards from `infra/grafana/dashboards/`:

1. Login to Grafana
2. Go to Dashboards → Import
3. Upload the JSON files

### Alerting

Configure alerts in `infra/prometheus/alerts.yml`:

```yaml
groups:
  - name: awy-alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.1
        for: 5m
        annotations:
          summary: High error rate detected
```

## 🔄 Database Management

### Migrations

Run database migrations:

```bash
# Run migrations
docker-compose exec server pnpm run db:migrate

# Rollback migration
docker-compose exec server pnpm run db:rollback
```

### Backups

Set up automated backups:

```bash
# Create backup script
cat > backup.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
docker-compose exec -T postgres pg_dump -U awy_user awy_db > backup_$DATE.sql
aws s3 cp backup_$DATE.sql s3://your-backup-bucket/
rm backup_$DATE.sql
EOF

chmod +x backup.sh

# Schedule daily backups
crontab -e
# Add: 0 2 * * * /path/to/backup.sh
```

### Restore

Restore from backup:

```bash
# Stop services
docker-compose stop server widget admin

# Restore database
docker-compose exec -T postgres psql -U awy_user -d awy_db < backup_file.sql

# Start services
docker-compose start server widget admin
```

## 🚀 Scaling

### Horizontal Scaling

Scale individual services:

```bash
# Scale server instances
docker-compose up -d --scale server=3

# Scale with load balancer
# Update nginx configuration for upstream servers
```

### Database Scaling

For high-traffic deployments:

1. **Read Replicas**: Set up PostgreSQL read replicas
2. **Connection Pooling**: Use PgBouncer
3. **Caching**: Increase Redis memory and use clustering

### CDN Integration

Serve static assets via CDN:

1. Upload widget assets to CDN
2. Update widget URLs in configuration
3. Configure cache headers

## 🔧 Maintenance

### Updates

Update AWY to the latest version:

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
./deploy.sh production
```

### Health Checks

Monitor service health:

```bash
# Check all services
./deploy.sh production health

# Check individual service
curl -f http://localhost:3001/health
```

### Logs

View and manage logs:

```bash
# View all logs
./deploy.sh production logs

# View specific service logs
docker-compose logs -f server

# Log rotation (add to crontab)
0 0 * * * docker system prune -f
```

## 🛠️ Troubleshooting

### Common Issues

#### Services Won't Start

```bash
# Check logs
docker-compose logs

# Check disk space
df -h

# Check memory
free -h
```

#### Database Connection Issues

```bash
# Check database status
docker-compose exec postgres pg_isready -U awy_user

# Reset database password
docker-compose exec postgres psql -U postgres -c "ALTER USER awy_user PASSWORD 'new_password';"
```

#### SSL Certificate Issues

```bash
# Check certificate validity
openssl x509 -in infra/ssl/awy.crt -text -noout

# Renew Let's Encrypt certificates
sudo certbot renew
```

#### High Memory Usage

```bash
# Check container memory usage
docker stats

# Restart services
docker-compose restart
```

### Performance Optimization

#### Database Optimization

```sql
-- Add indexes for better performance
CREATE INDEX CONCURRENTLY idx_messages_pairing_created 
ON messages(pairing_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_users_organization 
ON users(organization_id);
```

#### Redis Optimization

```bash
# Increase Redis memory limit
echo 'maxmemory 2gb' >> redis.conf
echo 'maxmemory-policy allkeys-lru' >> redis.conf
```

#### Nginx Optimization

```nginx
# Add to nginx.conf
worker_processes auto;
worker_connections 2048;
keepalive_timeout 65;
gzip_comp_level 6;
```

## 📞 Support

If you encounter issues during deployment:

- **Documentation**: [docs.awy.com](https://docs.awy.com)
- **GitHub Issues**: [Report deployment issues](https://github.com/your-org/awy/issues)
- **Email**: support@awy.com
- **Slack**: [AWY Community](https://awy-community.slack.com)

## 🔐 Security Checklist

Before going to production:

- [ ] Change all default passwords
- [ ] Use strong JWT secrets (32+ characters)
- [ ] Enable HTTPS with valid SSL certificates
- [ ] Configure firewall rules
- [ ] Set up database backups
- [ ] Enable monitoring and alerting
- [ ] Review CORS settings
- [ ] Update all dependencies
- [ ] Configure rate limiting
- [ ] Set up log rotation
- [ ] Test disaster recovery procedures

---

Your AWY deployment should now be running successfully! 🎉

