from __future__ import annotations

import threading
import uuid
from datetime import datetime
from typing import Dict, Iterable, List, Optional

from .models import Answer, Option, Question, QuestionType, Response, Survey, SurveyType


class InMemoryDatabase:
    """Base de datos virtual con bloqueo para uso seguro en memoria."""

    def __init__(self) -> None:
        self._surveys: Dict[str, Survey] = {}
        self._responses: Dict[str, Response] = {}
        self._lock = threading.Lock()

    # --- utilidades internas ---
    def _generate_id(self) -> str:
        return uuid.uuid4().hex

    # --- gestión de encuestas ---
    def list_surveys(self) -> List[Survey]:
        with self._lock:
            return list(self._surveys.values())

    def get_survey(self, survey_id: str) -> Optional[Survey]:
        with self._lock:
            return self._surveys.get(survey_id)

    def create_survey(
        self,
        title: str,
        survey_type: SurveyType,
        min_score: Optional[int] = None,
        max_attempts: Optional[int] = None,
        time_limit_minutes: Optional[int] = None,
    ) -> Survey:
        with self._lock:
            survey_id = self._generate_id()
            survey = Survey(
                id=survey_id,
                title=title,
                survey_type=survey_type,
                min_score=min_score,
                max_attempts=max_attempts,
                time_limit_minutes=time_limit_minutes,
            )
            self._surveys[survey_id] = survey
            return survey

    def update_survey(self, survey_id: str, **fields: object) -> Optional[Survey]:
        with self._lock:
            survey = self._surveys.get(survey_id)
            if not survey:
                return None
            for field_name, value in fields.items():
                if hasattr(survey, field_name) and value is not None:
                    setattr(survey, field_name, value)
            survey.updated_at = datetime.utcnow()
            return survey

    def delete_survey(self, survey_id: str) -> bool:
        with self._lock:
            if survey_id in self._surveys:
                del self._surveys[survey_id]
                # eliminar respuestas asociadas
                self._responses = {
                    resp_id: resp
                    for resp_id, resp in self._responses.items()
                    if resp.survey_id != survey_id
                }
                return True
            return False

    # --- gestión de preguntas ---
    def add_question(
        self,
        survey_id: str,
        text: str,
        question_type: QuestionType,
        *,
        allow_multiple: bool = False,
        points: Optional[int] = None,
        explanation: Optional[str] = None,
        options: Optional[Iterable[Option]] = None,
    ) -> Optional[Question]:
        with self._lock:
            survey = self._surveys.get(survey_id)
            if not survey:
                return None
            question_id = self._generate_id()
            question = Question(
                id=question_id,
                text=text,
                question_type=question_type,
                allow_multiple=allow_multiple,
                points=points,
                explanation=explanation,
            )
            if options:
                question.options = list(options)
            survey.questions.append(question)
            survey.updated_at = datetime.utcnow()
            return question

    def update_question(self, survey_id: str, question_id: str, **fields: object) -> Optional[Question]:
        with self._lock:
            survey = self._surveys.get(survey_id)
            if not survey:
                return None
            for question in survey.questions:
                if question.id == question_id:
                    for field_name, value in fields.items():
                        if hasattr(question, field_name) and value is not None:
                            setattr(question, field_name, value)
                    survey.updated_at = datetime.utcnow()
                    return question
            return None

    def replace_question_options(
        self, survey_id: str, question_id: str, options: Iterable[Option]
    ) -> Optional[Question]:
        with self._lock:
            survey = self._surveys.get(survey_id)
            if not survey:
                return None
            for question in survey.questions:
                if question.id == question_id:
                    question.options = list(options)
                    survey.updated_at = datetime.utcnow()
                    return question
            return None

    def remove_question(self, survey_id: str, question_id: str) -> bool:
        with self._lock:
            survey = self._surveys.get(survey_id)
            if not survey:
                return False
            initial_len = len(survey.questions)
            survey.questions = [q for q in survey.questions if q.id != question_id]
            survey.updated_at = datetime.utcnow()
            return len(survey.questions) != initial_len

    # --- gestión de respuestas ---
    def create_response(
        self,
        survey_id: str,
        user_id: str,
        answers: List[Answer],
        *,
        completed_at: Optional[datetime] = None,
    ) -> Optional[Response]:
        with self._lock:
            if survey_id not in self._surveys:
                return None
            response_id = self._generate_id()
            response = Response(
                id=response_id,
                survey_id=survey_id,
                user_id=user_id,
                answers=answers,
                completed_at=completed_at,
            )
            self._responses[response_id] = response
            return response

    def update_response(self, response_id: str, **fields: object) -> Optional[Response]:
        with self._lock:
            response = self._responses.get(response_id)
            if not response:
                return None
            for field_name, value in fields.items():
                if hasattr(response, field_name) and value is not None:
                    setattr(response, field_name, value)
            return response

    def list_responses(self, survey_id: Optional[str] = None) -> List[Response]:
        with self._lock:
            responses = list(self._responses.values())
            if survey_id:
                responses = [resp for resp in responses if resp.survey_id == survey_id]
            return responses


db = InMemoryDatabase()
