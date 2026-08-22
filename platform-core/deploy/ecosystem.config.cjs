module.exports = {
  apps: [{
    name: 'stylocamion-platform',
    cwd: '/opt/stylocamion/platform-core',
    script: 'node',
    args: '--env-file-if-exists=.env.production src/server.mjs',
    instances: 1,
    autorestart: true,
    restart_delay: 3000,
    min_uptime: '10s',
    max_restarts: 10,
    max_memory_restart: '700M',
    time: true,
  }],
};
