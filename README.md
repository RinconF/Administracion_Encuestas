# Administración de Encuestas

Aplicación totalmente frontal construida con HTML, CSS y JavaScript para administrar encuestas sin depender de un backend ni de conexiones externas. Toda la información se guarda en el navegador mediante `localStorage`, lo que permite crear, editar y eliminar cuestionarios incluso sin conexión.

## Características principales

- Panel administrativo para gestionar encuestas de opinión, evaluación o mixtas.
- Editor visual con soporte para opción múltiple, casillas múltiples, respuesta corta y escala numérica.
- Validaciones configurables para preguntas de respuesta corta (cédula, teléfono, fecha, correo electrónico o texto libre).
- Estadísticas locales que resumen el número de preguntas, distribución por tipo y validaciones activas.
- Persistencia automática en el navegador sin APIs externas.

## Requisitos

Solo necesitas un navegador moderno. No se requiere Python, Node ni servidores adicionales.

## Cómo usarlo

1. Abre el archivo `static/index.html` directamente en tu navegador preferido.
2. Utiliza el botón **“Nueva Encuesta”** para crear cuestionarios.
3. Cada encuesta se guarda automáticamente en `localStorage`; puedes restablecer los datos desde la pestaña **Configuración** si deseas comenzar de cero.
4. Las validaciones de respuesta corta se guardan con cada pregunta para que puedas aplicarlas después en tus propios formularios o exportaciones.

## Estructura del proyecto

```
static/
└── index.html  # Aplicación completa con estilos y lógica en un solo archivo
```

## Licencia

Este proyecto se distribuye bajo la licencia MIT. Úsalo como base para tus propias soluciones de encuestas que funcionen sin API.
