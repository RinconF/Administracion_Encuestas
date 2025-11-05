# Administración de Encuestas

Proyecto de referencia construido en **Python** utilizando **FastAPI** para crear un panel administrable de encuestas con validación de respuestas correctas y estadísticas globales e individuales. Toda la información se almacena en una base de datos virtual en memoria, ideal para pruebas rápidas dentro de VS Code sin necesidad de servicios externos.

## Características principales

- Creación, edición y eliminación de encuestas de tipo opinión, evaluación o mixtas.
- Editor de preguntas con soporte para opción múltiple, casillas múltiples, respuesta corta y escala numérica.
- Validación automática de respuestas correctas y asignación de puntajes para encuestas evaluativas.
- Registro de respuestas de participantes y cálculo de puntaje individual según el tipo de pregunta.
- Estadísticas consolidadas: promedio de puntajes, tasa de aprobación, ranking por usuario, dificultad por pregunta y duración promedio.
- API lista para integrar con un frontend en React como el mockup proporcionado o cualquier otro cliente.

## Requisitos

- Python 3.10 o superior
- Pipenv o pip

Instala las dependencias con:

```bash
pip install -r requirements.txt
```

## Cómo ejecutar el servidor

Desde la raíz del repositorio ejecuta:

```bash
uvicorn app.main:app --reload
```

El servidor quedará disponible en `http://127.0.0.1:8000` con la documentación interactiva en `http://127.0.0.1:8000/docs`.

## Flujos principales de la API

### 1. Crear una nueva encuesta

`POST /encuestas`

```json
{
  "titulo": "Evaluación Trimestral Q4",
  "tipo_encuesta": "mixed",
  "puntaje_minimo": 70,
  "intentos_maximos": 3,
  "tiempo_limite_minutos": 30,
  "preguntas": [
    {
      "texto": "¿Cómo calificarías nuestro servicio?",
      "tipo": "short_text",
      "opciones": []
    },
    {
      "texto": "¿Cuál es la capital de Francia?",
      "tipo": "multiple_choice",
      "puntos": 10,
      "opciones": [
        {"texto": "París", "es_correcta": true},
        {"texto": "Londres"},
        {"texto": "Berlín"},
        {"texto": "Madrid"}
      ]
    }
  ]
}
```

### 2. Registrar la respuesta de un colaborador

`POST /encuestas/{encuesta_id}/respuestas`

```json
{
  "usuario_id": "colaborador-1",
  "respuestas": [
    {
      "pregunta_id": "<id-pregunta-opinion>",
      "texto_libre": "Muy buen servicio"
    },
    {
      "pregunta_id": "<id-pregunta-quiz>",
      "opciones_seleccionadas": ["<id-opcion-paris>"]
    }
  ]
}
```

### 3. Consultar estadísticas en tiempo real

`GET /encuestas/{encuesta_id}/estadisticas`

Respuesta de ejemplo:

```json
{
  "total_respuestas": 150,
  "puntaje_promedio": 82.0,
  "tasa_aprobacion": 90.0,
  "puntajes_por_usuario": [["colaborador-10", 95.0]],
  "dificultad_preguntas": [["¿Cuál es la capital de Francia?", 12.0]],
  "duracion_promedio": 18.3
}
```

## Próximos pasos sugeridos

- Conectar este backend con el mockup en React usando fetch/axios para administrar encuestas desde el navegador.
- Persistir la información en una base de datos real (PostgreSQL, MySQL) utilizando SQLModel o SQLAlchemy cuando sea necesario.
- Añadir autenticación y roles (administrador, colaborador) para controlar el acceso.

## Licencia

Este proyecto se distribuye bajo la licencia MIT. Úsalo libremente como punto de partida para tus propias soluciones de encuestas internas.
