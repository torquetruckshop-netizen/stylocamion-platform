module.exports = {
  apps: [{
    name: 'stylocamion-platform',
    cwd: '/opt/stylocamion/platform-core',
    script: 'node',
    args: '--env-file=.env.production src/server.mjs',
    instances: 1,
    autorestart: true,
    max_memory_restart: '700M',
    time: true,
  }],
};
