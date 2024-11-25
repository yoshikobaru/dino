module.exports = {
    apps: [{
      name: 'dino',
      script: 'dist/server.js',
      cwd: '/root/dino', // Указываем рабочую директорию
      watch: false,
      env: {
        NODE_ENV: 'production'
      }
    }]
  };