/**
 * PM2 Ecosystem Configuration
 * 
 * This file defines how PM2 should run your application.
 * 
 * Usage:
 *   pm2 start ecosystem.config.cjs
 *   pm2 restart ecosystem.config.cjs
 *   pm2 delete ecosystem.config.cjs
 *   pm2 logs crypto-analytics
 */

module.exports = {
  apps: [
    {
      // Application name
      name: 'crypto-analytics',
      
      // Script to run (using 'serve' to serve built files)
      script: 'serve',
      
      // Arguments to pass to serve
      args: '-s dist -l 3000',
      
      // Working directory
      cwd: '/var/www/crypto-analytics',
      
      // Interpreter (use node)
      interpreter: 'node',
      
      // Number of instances (use 'max' for cluster mode based on CPU cores)
      instances: 1,
      
      // Execution mode: 'fork' or 'cluster'
      exec_mode: 'fork',
      
      // Auto-restart if app crashes
      autorestart: true,
      
      // Watch for file changes and restart (disable in production)
      watch: false,
      
      // Maximum memory before restart (optional)
      max_memory_restart: '500M',
      
      // Environment variables for all environments
      env: {
        NODE_ENV: 'development',
      },
      
      // Environment variables for production
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        // Add your production environment variables here
        // VITE_SUPABASE_URL: 'https://your-project.supabase.co',
        // VITE_SUPABASE_ANON_KEY: 'your-anon-key'
      },
      
      // Log configuration
      error_file: '~/.pm2/logs/crypto-analytics-error.log',
      out_file: '~/.pm2/logs/crypto-analytics-out.log',
      log_file: '~/.pm2/logs/crypto-analytics-combined.log',
      
      // Merge logs from all instances
      merge_logs: true,
      
      // Time format for logs
      time: true,
      
      // Min uptime before considering app as stable
      min_uptime: '10s',
      
      // Max restart attempts within time window
      max_restarts: 10,
      
      // Time window for restart attempts
      restart_delay: 4000,
      
      // Kill timeout (time to wait before force kill)
      kill_timeout: 5000,
      
      // Wait for ready signal from app
      wait_ready: false,
      
      // Listen timeout for ready signal
      listen_timeout: 3000,
    },
    
    // Optional: Add a separate process for API server if needed
    // {
    //   name: 'crypto-api',
    //   script: './server/index.js',
    //   cwd: '/var/www/crypto-analytics',
    //   instances: 'max',
    //   exec_mode: 'cluster',
    //   env_production: {
    //     NODE_ENV: 'production',
    //     PORT: 3001,
    //   }
    // }
  ],
  
  // Deployment configuration (optional)
  deploy: {
    production: {
      // User to connect as
      user: 'ubuntu',
      
      // Server host
      host: ['your-server.com'],
      
      // Git repository
      ref: 'origin/main',
      repo: 'https://github.com/joachimriise/Crypto_Analytics.git',
      
      // Path on server
      path: '/var/www/crypto-analytics',
      
      // SSH options
      'ssh_options': ['StrictHostKeyChecking=no', 'PasswordAuthentication=no'],
      
      // Post-deployment commands
      'post-deploy': 'npm ci && npm run build && pm2 reload ecosystem.config.cjs --env production',
      
      // Pre-deploy commands (run locally)
      'pre-deploy-local': 'echo "Deploying to production..."'
    },
    
    staging: {
      user: 'ubuntu',
      host: ['staging-server.com'],
      ref: 'origin/develop',
      repo: 'https://github.com/joachimriise/Crypto_Analytics.git',
      path: '/var/www/crypto-analytics-staging',
      'post-deploy': 'npm ci && npm run build && pm2 reload ecosystem.config.cjs --env staging'
    }
  }
};
