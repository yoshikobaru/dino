module.exports = {
    apps: [{
      name: 'dino',
      script: './dist/server.js',
      watch: ['dist'],
      env: {
        NODE_ENV: 'production'
      }
    }]
  }