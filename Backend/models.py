from datetime import datetime, date

from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Boolean,
    DateTime,
    Date,
    ForeignKey,
    Text,
)

from sqlalchemy.orm import relationship

from database import Base


# ============================================================
# USER
# ============================================================

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    name = Column(String(100), nullable=False)

    email = Column(
        String(255),
        unique=True,
        index=True,
        nullable=False,
    )

    password_hash = Column(String(255), nullable=False)

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
    )

    profile = relationship(
        "Profile",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )

    quiz_attempts = relationship(
        "QuizAttempt",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    learning_sessions = relationship(
        "LearningSession",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    xp_transactions = relationship(
        "XPTransaction",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    coin_transactions = relationship(
        "CoinTransaction",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    streak = relationship(
        "Streak",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )

    badges = relationship(
        "UserBadge",
        back_populates="user",
        cascade="all, delete-orphan",
    )


# ============================================================
# PROFILE
# ============================================================

class Profile(Base):
    __tablename__ = "profiles"

    id = Column(Integer, primary_key=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        unique=True,
        nullable=False,
    )

    display_name = Column(String(100), nullable=True)

    avatar = Column(
        String(100),
        default="default",
    )

    user = relationship(
        "User",
        back_populates="profile",
    )


# ============================================================
# QUIZ
# ============================================================

class Quiz(Base):
    __tablename__ = "quizzes"

    id = Column(Integer, primary_key=True)

    title = Column(
        String(255),
        nullable=False,
    )

    source_title = Column(
        String(255),
        nullable=True,
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
    )

    questions = relationship(
        "QuizQuestion",
        back_populates="quiz",
        cascade="all, delete-orphan",
    )


class QuizQuestion(Base):
    __tablename__ = "quiz_questions"

    id = Column(Integer, primary_key=True)

    quiz_id = Column(
        Integer,
        ForeignKey("quizzes.id"),
        nullable=False,
    )

    question = Column(
        Text,
        nullable=False,
    )

    option_a = Column(Text, nullable=False)
    option_b = Column(Text, nullable=False)
    option_c = Column(Text, nullable=False)
    option_d = Column(Text, nullable=False)

    correct_answer = Column(
        Text,
        nullable=False,
    )

    concept = Column(
        String(255),
        nullable=False,
    )

    quiz = relationship(
        "Quiz",
        back_populates="questions",
    )


# ============================================================
# QUIZ ATTEMPT
# ============================================================

class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    id = Column(Integer, primary_key=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
    )

    quiz_id = Column(
        Integer,
        ForeignKey("quizzes.id"),
        nullable=True,
    )

    score = Column(Integer, nullable=False)

    total_questions = Column(
        Integer,
        nullable=False,
    )

    percentage = Column(
        Float,
        nullable=False,
    )

    attempted_at = Column(
        DateTime,
        default=datetime.utcnow,
    )

    user = relationship(
        "User",
        back_populates="quiz_attempts",
    )

    concept_results = relationship(
        "ConceptResult",
        back_populates="attempt",
        cascade="all, delete-orphan",
    )


# ============================================================
# CONCEPT RESULT
# ============================================================

class ConceptResult(Base):
    __tablename__ = "concept_results"

    id = Column(Integer, primary_key=True)

    attempt_id = Column(
        Integer,
        ForeignKey("quiz_attempts.id"),
        nullable=False,
    )

    concept = Column(
        String(255),
        nullable=False,
    )

    correct = Column(
        Integer,
        default=0,
    )

    total = Column(
        Integer,
        default=0,
    )

    percentage = Column(
        Float,
        default=0,
    )

    is_gap = Column(
        Boolean,
        default=False,
    )

    attempt = relationship(
        "QuizAttempt",
        back_populates="concept_results",
    )


# ============================================================
# LEARNING SESSION
# ============================================================

class LearningSession(Base):
    __tablename__ = "learning_sessions"

    id = Column(Integer, primary_key=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
    )

    concept = Column(
        String(255),
        nullable=False,
    )

    completed = Column(
        Boolean,
        default=False,
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
    )

    user = relationship(
        "User",
        back_populates="learning_sessions",
    )


# ============================================================
# XP
# ============================================================

class XPTransaction(Base):
    __tablename__ = "xp_transactions"

    id = Column(Integer, primary_key=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
    )

    amount = Column(
        Integer,
        nullable=False,
    )

    reason = Column(
        String(255),
        nullable=False,
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
    )

    user = relationship(
        "User",
        back_populates="xp_transactions",
    )


# ============================================================
# COINS
# ============================================================

class CoinTransaction(Base):
    __tablename__ = "coin_transactions"

    id = Column(Integer, primary_key=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
    )

    amount = Column(
        Integer,
        nullable=False,
    )

    reason = Column(
        String(255),
        nullable=False,
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
    )

    user = relationship(
        "User",
        back_populates="coin_transactions",
    )


# ============================================================
# STREAK
# ============================================================

class Streak(Base):
    __tablename__ = "streaks"

    id = Column(Integer, primary_key=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        unique=True,
        nullable=False,
    )

    current_streak = Column(
        Integer,
        default=0,
    )

    longest_streak = Column(
        Integer,
        default=0,
    )

    last_activity = Column(
        Date,
        nullable=True,
    )

    user = relationship(
        "User",
        back_populates="streak",
    )


# ============================================================
# BADGES
# ============================================================

class Badge(Base):
    __tablename__ = "badges"

    id = Column(Integer, primary_key=True)

    name = Column(
        String(100),
        unique=True,
        nullable=False,
    )

    description = Column(
        String(255),
        nullable=False,
    )

    icon = Column(
        String(50),
        nullable=False,
    )

    requirement = Column(
        Integer,
        default=0,
    )


class UserBadge(Base):
    __tablename__ = "user_badges"

    id = Column(Integer, primary_key=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False,
    )

    badge_id = Column(
        Integer,
        ForeignKey("badges.id"),
        nullable=False,
    )

    earned_at = Column(
        DateTime,
        default=datetime.utcnow,
    )

    user = relationship(
        "User",
        back_populates="badges",
    )

    badge = relationship("Badge")