from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional


class SurveyType(str, Enum):
    OPINION = "opinion"
    QUIZ = "quiz"
    MIXED = "mixed"


class QuestionType(str, Enum):
    MULTIPLE_CHOICE = "multiple_choice"
    MULTISELECT = "multiselect"
    SHORT_TEXT = "short_text"
    NUMERIC_SCALE = "numeric_scale"


@dataclass
class Option:
    id: str
    text: str
    is_correct: bool = False


@dataclass
class Question:
    id: str
    text: str
    question_type: QuestionType
    options: List[Option] = field(default_factory=list)
    allow_multiple: bool = False
    points: Optional[int] = None
    explanation: Optional[str] = None

    def has_correct_answer(self) -> bool:
        return any(option.is_correct for option in self.options)


@dataclass
class Survey:
    id: str
    title: str
    survey_type: SurveyType
    min_score: Optional[int] = None
    max_attempts: Optional[int] = None
    time_limit_minutes: Optional[int] = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
    questions: List[Question] = field(default_factory=list)

    def requires_score(self) -> bool:
        return self.survey_type in {SurveyType.QUIZ, SurveyType.MIXED}


@dataclass
class Answer:
    question_id: str
    selected_option_ids: List[str] = field(default_factory=list)
    free_text: Optional[str] = None


@dataclass
class Response:
    id: str
    survey_id: str
    user_id: str
    answers: List[Answer]
    score: Optional[float] = None
    started_at: datetime = field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None


@dataclass
class Statistics:
    total_responses: int
    average_score: Optional[float]
    approval_rate: Optional[float]
    per_user_scores: Dict[str, float]
    question_difficulty: Dict[str, float]
    duration_average_minutes: Optional[float]
