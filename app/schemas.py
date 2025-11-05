from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field, validator

from .models import QuestionType, SurveyType


class OptionCreate(BaseModel):
    texto: str = Field(..., min_length=1)
    es_correcta: bool = False


class QuestionCreate(BaseModel):
    texto: str = Field(..., min_length=5)
    tipo: QuestionType
    permitir_multiple: bool = False
    puntos: Optional[int] = Field(default=None, ge=0)
    explicacion: Optional[str] = None
    opciones: List[OptionCreate] = Field(default_factory=list)

    @validator("opciones", always=True)
    def validar_opciones(cls, value: List[OptionCreate], values: dict) -> List[OptionCreate]:
        question_type = values.get("tipo")
        if question_type in {QuestionType.MULTIPLE_CHOICE, QuestionType.MULTISELECT}:
            if len(value) < 2:
                raise ValueError("Las preguntas de opción múltiple requieren al menos dos opciones")
            if values.get("permitir_multiple") is False and question_type == QuestionType.MULTISELECT:
                raise ValueError("Las casillas múltiples deben permitir múltiples respuestas")
        return value


class SurveyCreate(BaseModel):
    titulo: str = Field(..., min_length=3)
    tipo_encuesta: SurveyType
    puntaje_minimo: Optional[int] = Field(default=None, ge=0, le=100)
    intentos_maximos: Optional[int] = Field(default=None, ge=1)
    tiempo_limite_minutos: Optional[int] = Field(default=None, ge=1)
    preguntas: List[QuestionCreate] = Field(default_factory=list)

    @validator("preguntas")
    def validar_preguntas(cls, value: List[QuestionCreate], values: dict) -> List[QuestionCreate]:
        tipo = values.get("tipo_encuesta")
        if tipo != SurveyType.OPINION and not value:
            raise ValueError("Las encuestas de evaluación requieren al menos una pregunta")
        return value


class OptionOut(BaseModel):
    id: str
    texto: str
    es_correcta: bool


class QuestionOut(BaseModel):
    id: str
    texto: str
    tipo: QuestionType
    permitir_multiple: bool
    puntos: Optional[int]
    explicacion: Optional[str]
    opciones: List[OptionOut]


class SurveyOut(BaseModel):
    id: str
    titulo: str
    tipo_encuesta: SurveyType
    puntaje_minimo: Optional[int]
    intentos_maximos: Optional[int]
    tiempo_limite_minutos: Optional[int]
    creado: datetime
    actualizado: datetime
    preguntas: List[QuestionOut]


class AnswerIn(BaseModel):
    pregunta_id: str
    opciones_seleccionadas: List[str] = Field(default_factory=list)
    texto_libre: Optional[str] = None


class ResponseIn(BaseModel):
    usuario_id: str = Field(..., min_length=3)
    respuestas: List[AnswerIn]
    duracion_minutos: Optional[float] = Field(default=None, ge=0)


class ResponseOut(BaseModel):
    id: str
    encuesta_id: str
    usuario_id: str
    puntaje: Optional[float]
    creado: datetime
    completado: Optional[datetime]


class SurveyStatistics(BaseModel):
    total_respuestas: int
    puntaje_promedio: Optional[float]
    tasa_aprobacion: Optional[float]
    puntajes_por_usuario: List[tuple[str, float]]
    dificultad_preguntas: List[tuple[str, float]]
    duracion_promedio: Optional[float]
