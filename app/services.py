from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime, timedelta
from typing import Dict, Iterable, List, Optional
from uuid import uuid4

from fastapi import HTTPException, status

from .db import db
from .models import Answer, Option, Question, QuestionType, Response, Survey, SurveyType


# --- utilidades ---

def _build_options(opciones_data: Iterable[dict]) -> List[Option]:
    opciones: List[Option] = []
    for data in opciones_data:
        opcion = Option(id=uuid4().hex, text=data["texto"], is_correct=data.get("es_correcta", False))
        opciones.append(opcion)
    return opciones


def _validate_question(question: Question, survey_type: SurveyType) -> None:
    if question.question_type in {QuestionType.MULTIPLE_CHOICE, QuestionType.MULTISELECT}:
        if not question.options:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Las preguntas deben tener opciones")
        correctas = [opt for opt in question.options if opt.is_correct]
        if survey_type != SurveyType.OPINION and not correctas:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Debes marcar al menos una respuesta correcta")
        if question.question_type == QuestionType.MULTIPLE_CHOICE and len(correctas) > 1:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Las preguntas de opción múltiple solo aceptan una respuesta correcta")
    if (
        survey_type != SurveyType.OPINION
        and question.question_type in {QuestionType.MULTIPLE_CHOICE, QuestionType.MULTISELECT}
        and question.points is None
    ):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Debes definir puntos para preguntas calificables")


# --- casos de uso ---

def crear_encuesta(payload) -> Survey:
    survey = db.create_survey(
        title=payload.titulo,
        survey_type=payload.tipo_encuesta,
        min_score=payload.puntaje_minimo,
        max_attempts=payload.intentos_maximos,
        time_limit_minutes=payload.tiempo_limite_minutos,
    )
    for pregunta in payload.preguntas:
        opciones = _build_options(
            [{"texto": opt.texto, "es_correcta": opt.es_correcta} for opt in pregunta.opciones]
        )
        question = db.add_question(
            survey_id=survey.id,
            text=pregunta.texto,
            question_type=pregunta.tipo,
            allow_multiple=pregunta.permitir_multiple,
            points=pregunta.puntos,
            explanation=pregunta.explicacion,
            options=opciones,
        )
        if not question:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "No fue posible crear la pregunta")
        _validate_question(question, survey.survey_type)
    return survey


def actualizar_encuesta(survey_id: str, payload) -> Survey:
    survey = db.get_survey(survey_id)
    if not survey:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Encuesta no encontrada")
    survey = db.update_survey(
        survey_id,
        title=payload.titulo,
        survey_type=payload.tipo_encuesta,
        min_score=payload.puntaje_minimo,
        max_attempts=payload.intentos_maximos,
        time_limit_minutes=payload.tiempo_limite_minutos,
    )
    if survey is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Encuesta no encontrada")

    # reemplazar preguntas
    survey.questions.clear()
    for pregunta in payload.preguntas:
        opciones = _build_options(
            [{"texto": opt.texto, "es_correcta": opt.es_correcta} for opt in pregunta.opciones]
        )
        question = db.add_question(
            survey_id=survey.id,
            text=pregunta.texto,
            question_type=pregunta.tipo,
            allow_multiple=pregunta.permitir_multiple,
            points=pregunta.puntos,
            explanation=pregunta.explicacion,
            options=opciones,
        )
        if not question:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Error al actualizar la pregunta")
        _validate_question(question, survey.survey_type)
    return survey


def registrar_respuesta(survey_id: str, payload) -> Response:
    survey = db.get_survey(survey_id)
    if not survey:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Encuesta no encontrada")

    preguntas_por_id: Dict[str, Question] = {preg.id: preg for preg in survey.questions}
    respuestas: List[Answer] = []
    puntaje_total = 0
    puntaje_acumulado = 0

    for respuesta in payload.respuestas:
        pregunta = preguntas_por_id.get(respuesta.pregunta_id)
        if not pregunta:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Pregunta {respuesta.pregunta_id} inválida")
        answer = Answer(question_id=pregunta.id)

        if pregunta.question_type in {QuestionType.MULTIPLE_CHOICE, QuestionType.MULTISELECT}:
            if not respuesta.opciones_seleccionadas:
                raise HTTPException(status.HTTP_400_BAD_REQUEST, "Debes seleccionar al menos una opción")
            opciones_validas = {opt.id for opt in pregunta.options}
            seleccion = set(respuesta.opciones_seleccionadas)
            if not seleccion.issubset(opciones_validas):
                raise HTTPException(status.HTTP_400_BAD_REQUEST, "Opciones inválidas")
            answer.selected_option_ids = list(seleccion)
            if survey.requires_score() and pregunta.points:
                puntaje_total += pregunta.points
                correctas = {opt.id for opt in pregunta.options if opt.is_correct}
                if pregunta.allow_multiple or pregunta.question_type == QuestionType.MULTISELECT:
                    if seleccion == correctas:
                        puntaje_acumulado += pregunta.points
                else:
                    if len(seleccion) == 1 and next(iter(seleccion)) in correctas:
                        puntaje_acumulado += pregunta.points
        elif pregunta.question_type == QuestionType.SHORT_TEXT:
            if not respuesta.texto_libre:
                raise HTTPException(status.HTTP_400_BAD_REQUEST, "Debes escribir una respuesta")
            answer.free_text = respuesta.texto_libre
        elif pregunta.question_type == QuestionType.NUMERIC_SCALE:
            if not respuesta.texto_libre:
                raise HTTPException(status.HTTP_400_BAD_REQUEST, "Debes indicar un valor numérico")
            answer.free_text = respuesta.texto_libre
        respuestas.append(answer)

    completed_at = datetime.utcnow()
    if payload.duracion_minutos is not None:
        completed_at = completed_at + timedelta(minutes=payload.duracion_minutos)

    response = db.create_response(
        survey_id=survey.id,
        user_id=payload.usuario_id,
        answers=respuestas,
        completed_at=completed_at,
    )
    if not response:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No fue posible guardar la respuesta")

    if survey.requires_score() and puntaje_total > 0:
        score = (puntaje_acumulado / puntaje_total) * 100
        db.update_response(response.id, score=score)
        response.score = score

    return response


def calcular_estadisticas(survey_id: str) -> Dict[str, object]:
    survey = db.get_survey(survey_id)
    if not survey:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Encuesta no encontrada")
    responses = db.list_responses(survey_id)
    total = len(responses)
    if total == 0:
        return {
            "total_respuestas": 0,
            "puntaje_promedio": None,
            "tasa_aprobacion": None,
            "puntajes_por_usuario": [],
            "dificultad_preguntas": [],
            "duracion_promedio": None,
        }

    puntajes = [resp.score for resp in responses if resp.score is not None]
    promedio = sum(puntajes) / len(puntajes) if puntajes else None
    aprobacion = None
    if survey.min_score is not None and puntajes:
        aprobados = [score for score in puntajes if score >= survey.min_score]
        aprobacion = (len(aprobados) / len(puntajes)) * 100 if puntajes else None

    puntajes_usuario = sorted(
        ((resp.user_id, resp.score or 0.0) for resp in responses), key=lambda item: item[1], reverse=True
    )

    conteo_correctas: Dict[str, Counter] = defaultdict(Counter)
    for response in responses:
        for answer in response.answers:
            conteo_correctas[answer.question_id]["total"] += 1
            pregunta = next((q for q in survey.questions if q.id == answer.question_id), None)
            if not pregunta:
                continue
            if pregunta.question_type in {QuestionType.MULTIPLE_CHOICE, QuestionType.MULTISELECT}:
                correctas = {opt.id for opt in pregunta.options if opt.is_correct}
                if pregunta.allow_multiple or pregunta.question_type == QuestionType.MULTISELECT:
                    if set(answer.selected_option_ids) == correctas:
                        conteo_correctas[answer.question_id]["aciertos"] += 1
                else:
                    if answer.selected_option_ids and answer.selected_option_ids[0] in correctas:
                        conteo_correctas[answer.question_id]["aciertos"] += 1

    dificultad = []
    for pregunta in survey.questions:
        contadores = conteo_correctas.get(pregunta.id)
        if not contadores:
            dificultad.append((pregunta.text, 0.0))
        else:
            aciertos = contadores["aciertos"]
            total_respuestas = contadores["total"]
            dificultad.append((pregunta.text, 100 - (aciertos / total_respuestas) * 100))

    duraciones = [((resp.completed_at or resp.started_at) - resp.started_at).total_seconds() / 60 for resp in responses]
    duracion_promedio = sum(duraciones) / len(duraciones) if duraciones else None

    return {
        "total_respuestas": total,
        "puntaje_promedio": promedio,
        "tasa_aprobacion": aprobacion,
        "puntajes_por_usuario": puntajes_usuario,
        "dificultad_preguntas": dificultad,
        "duracion_promedio": duracion_promedio,
    }
