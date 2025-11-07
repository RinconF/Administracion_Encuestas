# Administración de Encuestas (modo sin API)

Aplicación totalmente frontal construida con HTML, CSS y JavaScript para administrar encuestas sin depender de un backend ni de conexiones externas. Toda la información se guarda en el navegador mediante `localStorage`, lo que permite crear, editar y eliminar cuestionarios incluso sin conexión.

## Características principales

- Panel administrativo para gestionar encuestas de opinión, evaluación o mixtas.
- Editor visual con soporte para opción múltiple, casillas múltiples, respuesta corta y escala numérica.
- Validaciones configurables para preguntas de respuesta corta (cédula, teléfono, fecha, correo electrónico o texto libre).
- Estadísticas locales que resumen el número de preguntas, distribución por tipo y validaciones activas.
- Portal de usuarios finales con inicio de sesión simulado y presentación obligatoria de encuestas antes de habilitar la intranet.
- Persistencia automática en el navegador sin APIs externas.

## Requisitos

Solo necesitas un navegador moderno. No se requiere Python, Node ni servidores adicionales.

## Cómo usarlo

1. Abre el archivo `static/index.html` directamente en tu navegador preferido.
2. Usa el selector superior para alternar entre la vista **Administrador** y **Usuario**.
3. En el modo administrador puedes crear, editar o eliminar encuestas con el botón **“Nueva Encuesta”**.
4. En el modo usuario inicia sesión con las credenciales de ejemplo y responde la encuesta asignada; la intranet se desbloquea automáticamente cuando no quedan cuestionarios pendientes.
5. Cada encuesta se guarda automáticamente en `localStorage`; puedes restablecer los datos desde la pestaña **Configuración** si deseas comenzar de cero.
6. Las validaciones de respuesta corta se guardan con cada pregunta para que puedas aplicarlas después en tus propios formularios o exportaciones.

## Acceso de demostración

- **Correo:** `ana@empresa.com`
- **Contraseña:** `123456`

Puedes agregar más usuarios editando la sección correspondiente en `index.html` o importando un archivo con tus propias encuestas y asignaciones.

## Estructura del proyecto

```
static/
└── index.html  # Aplicación completa con estilos y lógica en un solo archivo
```

## Personalización

Si quieres adaptar la apariencia o extraer la lógica a módulos independientes, puedes separar los estilos y scripts en carpetas `css/` y `js/`. El código está comentado para ayudarte a identificar los puntos clave a modificar.

## Licencia

Este proyecto se distribuye bajo la licencia MIT. Úsalo como base para tus propias soluciones de encuestas que funcionen sin API.
