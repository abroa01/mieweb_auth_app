# Infrastructure Setup Instructions for MIEAuth Application

## Overview
This document provides instructions for setting up the infrastructure for the MIEAuth application, which is a Meteor.js application with React frontend, Firebase integration, and mobile capabilities.

## System Requirements

### Server Requirements
- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- Nginx (for reverse proxy)
- SSL Certificate
- SMTP Server (for email functionality)

### Environment Requirements
- Linux-based server (Ubuntu 20.04 LTS recommended)
- Minimum 2 CPU cores
- Minimum 4GB RAM
- Minimum 20GB storage

## Setup Instructions

### 1. Server Setup

#### 1.1 Install Required Packages
```bash
# Update system packages
sudo apt update
sudo apt upgrade -y

# Install Node.js and npm
curl -fsSL https://deb.nodesource.com/setup_14.x | sudo -E bash -
sudo apt install -y nodejs

# Install MongoDB
sudo apt install -y mongodb

# Install Nginx
sudo apt install -y nginx
```

#### 1.2 Configure MongoDB
```bash
# Start MongoDB service
sudo systemctl start mongodb
sudo systemctl enable mongodb

# Create MongoDB user and database
mongo
> use mieauth
> db.createUser({user: "mieauth", pwd: "YOUR_SECURE_PASSWORD", roles: ["readWrite"]})
```

### 2. Application Setup

#### 2.1 Clone Repository
```bash
git clone [repository-url]
cd mieweb_push_auth
```

#### 2.2 Install Dependencies
```bash
npm install
```

#### 2.3 Environment Configuration
Create a `.env` file with the following variables:
```
FIREBASE_CONFIG='{
  "type": "service_account",
  "project_id": "miewebauthapp",
  "private_key_id": "[YOUR_PRIVATE_KEY_ID]",
  "private_key": "[YOUR_PRIVATE_KEY]",
  "client_email": "[YOUR_CLIENT_EMAIL]",
  "client_id": "[YOUR_CLIENT_ID]",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "[YOUR_CERT_URL]",
  "universe_domain": "googleapis.com"
}'
MAIL_URL='smtp://[SMTP_USER]:[SMTP_PASSWORD]@[SMTP_HOST]:587'
```

### 3. Nginx Configuration

Create a new Nginx configuration file at `/etc/nginx/sites-available/mieauth`:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the configuration:
```bash
sudo ln -s /etc/nginx/sites-available/mieauth /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 4. SSL Configuration

Install and configure SSL using Let's Encrypt:
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### 5. Process Management

Install PM2 for process management:
```bash
sudo npm install -g pm2
```

Start the application:
```bash
pm2 start npm --name "mieauth" -- start
pm2 save
pm2 startup
```

### 6. Firewall Configuration

Configure UFW firewall:
```bash
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 22
sudo ufw enable
```

## Monitoring and Maintenance

### Logs
- Application logs: `pm2 logs mieauth`
- Nginx logs: `/var/log/nginx/`
- MongoDB logs: `/var/log/mongodb/`

### Backup Strategy
1. Set up daily MongoDB backups
2. Configure automated SSL certificate renewal
3. Implement application log rotation

## Security Considerations

1. Keep all system packages updated
2. Regularly rotate MongoDB credentials
3. Monitor application logs for suspicious activities
4. Implement rate limiting in Nginx
5. Configure proper firewall rules
6. Use secure SMTP configuration
7. Keep Firebase credentials secure

## Troubleshooting

Common issues and solutions:
1. Application not starting: Check PM2 logs
2. Database connection issues: Verify MongoDB service and credentials
3. SSL issues: Check certificate expiration and renewal
4. Email delivery problems: Verify SMTP configuration

## Support

For any issues or questions, please contact:
- Email: abrol.anshul10@gmail.com
- Application Version: 0.0.2 