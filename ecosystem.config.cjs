// PM2 Configuration for Turning Point Church Website
// Manages the Cloudflare Pages development server

module.exports = {
  apps: [
    {
      name: 'turningpoint-church',
      script: 'npx',
      args: 'wrangler pages dev dist --d1=turningpoint-church-production --local --ip 0.0.0.0 --port 3000',
      cwd: '/home/user/webapp',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
        HOST: '0.0.0.0'
      },
      watch: false, // Disable PM2 file monitoring (wrangler handles hot reload)
      instances: 1, // Single instance for development
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      max_memory_restart: '1G',
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true
    }
  ]
}