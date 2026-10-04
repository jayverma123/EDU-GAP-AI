from datetime import date, timedelta

from sqlalchemy.orm import Session

from models import (
    User,
    XPTransaction,
    CoinTransaction,
    Streak,
    Badge,
    UserBadge,
)


# ============================================================
# XP LEVELS
# ============================================================

def get_level(xp: int):
    if xp < 100:
        return "Beginner"

    if xp < 250:
        return "Explorer"

    if xp < 500:
        return "Learner"

    if xp < 1000:
        return "Skilled"

    return "Master"


# ============================================================
# GET TOTAL XP
# ============================================================

def get_total_xp(
    db: Session,
    user_id: int,
):
    transactions = (
        db.query(XPTransaction)
        .filter(XPTransaction.user_id == user_id)
        .all()
    )

    return sum(
        transaction.amount
        for transaction in transactions
    )


# ============================================================
# GET TOTAL COINS
# ============================================================

def get_total_coins(
    db: Session,
    user_id: int,
):
    transactions = (
        db.query(CoinTransaction)
        .filter(CoinTransaction.user_id == user_id)
        .all()
    )

    return sum(
        transaction.amount
        for transaction in transactions
    )


# ============================================================
# ADD XP
# ============================================================

def add_xp(
    db: Session,
    user_id: int,
    amount: int,
    reason: str,
):
    transaction = XPTransaction(
        user_id=user_id,
        amount=amount,
        reason=reason,
    )

    db.add(transaction)

    db.flush()

    return transaction


# ============================================================
# ADD COINS
# ============================================================

def add_coins(
    db: Session,
    user_id: int,
    amount: int,
    reason: str,
):
    transaction = CoinTransaction(
        user_id=user_id,
        amount=amount,
        reason=reason,
    )

    db.add(transaction)

    db.flush()

    return transaction


# ============================================================
# UPDATE STREAK
# ============================================================

def update_streak(
    db: Session,
    user_id: int,
):
    streak = (
        db.query(Streak)
        .filter(Streak.user_id == user_id)
        .first()
    )

    if not streak:
        streak = Streak(
            user_id=user_id,
            current_streak=0,
            longest_streak=0,
            last_activity=None,
        )

        db.add(streak)

        db.flush()

    today = date.today()

    if streak.last_activity == today:
        return streak

    if streak.last_activity == today - timedelta(days=1):
        streak.current_streak += 1

    else:
        streak.current_streak = 1

    if streak.current_streak > streak.longest_streak:
        streak.longest_streak = streak.current_streak

    streak.last_activity = today

    db.flush()

    return streak


# ============================================================
# STREAK REWARDS
# ============================================================

def apply_streak_reward(
    db: Session,
    user_id: int,
    streak_number: int,
):
    rewards = {
        3: (25, 10),
        7: (50, 25),
        10: (100, 50),
        30: (300, 150),
        60: (600, 300),
        100: (1000, 500),
    }

    if streak_number not in rewards:
        return 0, 0

    xp, coins = rewards[streak_number]

    add_xp(
        db,
        user_id,
        xp,
        f"{streak_number}-day streak",
    )

    add_coins(
        db,
        user_id,
        coins,
        f"{streak_number}-day streak",
    )

    return xp, coins


# ============================================================
# CHECK BADGES
# ============================================================

def check_badges(
    db: Session,
    user_id: int,
):
    total_xp = get_total_xp(
        db,
        user_id,
    )

    streak = (
        db.query(Streak)
        .filter(Streak.user_id == user_id)
        .first()
    )

    current_streak = (
        streak.current_streak
        if streak
        else 0
    )

    badges = (
        db.query(Badge)
        .all()
    )

    earned = (
        db.query(UserBadge)
        .filter(UserBadge.user_id == user_id)
        .all()
    )

    earned_ids = {
        item.badge_id
        for item in earned
    }

    new_badges = []

    for badge in badges:

        if badge.id in earned_ids:
            continue

        unlocked = False

        if badge.name == "First Step":
            unlocked = total_xp >= 25

        elif badge.name == "Explorer":
            unlocked = total_xp >= 100

        elif badge.name == "Consistent Learner":
            unlocked = current_streak >= 7

        elif badge.name == "Knowledge Builder":
            unlocked = total_xp >= 500

        elif badge.name == "Learning Master":
            unlocked = total_xp >= 1000

        if unlocked:
            user_badge = UserBadge(
                user_id=user_id,
                badge_id=badge.id,
            )

            db.add(user_badge)

            new_badges.append(
                badge.name
            )

    db.flush()

    return new_badges