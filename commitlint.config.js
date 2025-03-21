module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'header-max-length': [2, 'always', 100],
    'type-empty': [2, 'never'],
    'subject-empty': [2, 'never'],
    'type-enum': [
      2,
      'always',
      [
        'feat',    // Nuevas características
        'fix',     // Corrección de errores
        'docs',    // Documentación
        'style',   // Cambios de estilo que no afectan el código
        'refactor',// Cambios de código que no corrigen errores ni añaden características
        'perf',    // Mejoras de rendimiento
        'test',    // Pruebas
        'build',   // Cambios en el sistema de construcción
        'ci',      // Cambios en la configuración de CI
        'chore',   // Tareas de mantenimiento
        'revert',  // Revertir commits
        'config'   // Cambios de configuración
      ],
    ],
  },
}