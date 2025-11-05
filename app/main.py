from __future__ import annotations

from typing import List

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .db import db
from .models import QuestionType, SurveyType
from .schemas import (
    ResponseIn,
    ResponseOut,
    SurveyCreate,
    SurveyOut,
    SurveyStatistics,
)
from .services import actualizar_encuesta, calcular_estadisticas, crear_encuesta, registrar_respuesta

app = FastAPI(title="Administración de Encuestas", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _serializar_encuesta(encuesta) -> SurveyOut:
    return SurveyOut(
        id=encuesta.id,
        titulo=encuesta.title,
        tipo_encuesta=encuesta.survey_type,
        puntaje_minimo=encuesta.min_score,
        intentos_maximos=encuesta.max_attempts,
        tiempo_limite_minutos=encuesta.time_limit_minutes,
        creado=encuesta.created_at,
        actualizado=encuesta.updated_at,
        preguntas=[
            {
                "id": pregunta.id,
                "texto": pregunta.text,
                "tipo": pregunta.question_type,
                "permitir_multiple": pregunta.allow_multiple,
                "puntos": pregunta.points,
                "explicacion": pregunta.explanation,
                "opciones": [
                    {
                        "id": opcion.id,
                        "texto": opcion.text,
                        "es_correcta": opcion.is_correct,
                    }
                    for opcion in pregunta.options
                ],
            }
            for pregunta in encuesta.questions
        ],
    )


@app.on_event("startup")
def seed_data() -> None:
    if db.list_surveys():
        return

    payload = SurveyCreate(
        titulo="Evaluación Trimestral Q4",
        tipo_encuesta=SurveyType.MIXED,
        puntaje_minimo=70,
        intentos_maximos=3,
        tiempo_limite_minutos=30,
        preguntas=[
            {
                "texto": "¿Cómo calificarías nuestro servicio?",
                "tipo": QuestionType.SHORT_TEXT,
            },
            {
                "texto": "¿Cuál es la capital de Francia?",
                "tipo": QuestionType.MULTIPLE_CHOICE,
                "puntos": 10,
                "opciones": [
                    {"texto": "París", "es_correcta": True},
                    {"texto": "Londres"},
                    {"texto": "Berlín"},
                    {"texto": "Madrid"},
                ],
            },
        ],
    )
    crear_encuesta(payload)


@app.get("/encuestas", response_model=List[SurveyOut])
def listar_encuestas() -> List[SurveyOut]:
    encuestas = db.list_surveys()
    return [_serializar_encuesta(encuesta) for encuesta in encuestas]


@app.post("/encuestas", response_model=SurveyOut, status_code=201)
def crear_encuesta_endpoint(payload: SurveyCreate) -> SurveyOut:
    encuesta = crear_encuesta(payload)
    return _serializar_encuesta(encuesta)


@app.get("/encuestas/{encuesta_id}", response_model=SurveyOut)
def obtener_encuesta_endpoint(encuesta_id: str) -> SurveyOut:
    encuesta = db.get_survey(encuesta_id)
    if not encuesta:
        raise HTTPException(status_code=404, detail="Encuesta no encontrada")
    return _serializar_encuesta(encuesta)


@app.put("/encuestas/{encuesta_id}", response_model=SurveyOut)
def actualizar_encuesta_endpoint(encuesta_id: str, payload: SurveyCreate) -> SurveyOut:
    encuesta = actualizar_encuesta(encuesta_id, payload)
    return _serializar_encuesta(encuesta)


@app.delete("/encuestas/{encuesta_id}", status_code=200)
def eliminar_encuesta_endpoint(encuesta_id: str):
    eliminado = db.delete_survey(encuesta_id)
    if not eliminado:
        raise HTTPException(status_code=404, detail="Encuesta no encontrada")
    return {"mensaje": "Encuesta eliminada correctamente"}


@app.post("/encuestas/{encuesta_id}/respuestas", response_model=ResponseOut, status_code=201)
def registrar_respuesta_endpoint(encuesta_id: str, payload: ResponseIn) -> ResponseOut:
    respuesta = registrar_respuesta(encuesta_id, payload)
    return ResponseOut(
        id=respuesta.id,
        encuesta_id=respuesta.survey_id,
        usuario_id=respuesta.user_id,
        puntaje=respuesta.score,
        creado=respuesta.started_at,
        completado=respuesta.completed_at,
    )


@app.get("/encuestas/{encuesta_id}/estadisticas", response_model=SurveyStatistics)
def estadisticas_endpoint(encuesta_id: str) -> SurveyStatistics:
    data = calcular_estadisticas(encuesta_id)
    return SurveyStatistics(
        total_respuestas=data["total_respuestas"],
        puntaje_promedio=data["puntaje_promedio"],
        tasa_aprobacion=data["tasa_aprobacion"],
        puntajes_por_usuario=data["puntajes_por_usuario"],
        dificultad_preguntas=data["dificultad_preguntas"],
        duracion_promedio=data["duracion_promedio"],
    )
