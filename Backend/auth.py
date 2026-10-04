import hashlib
import hmac
import secrets

from sqlalchemy.orm import Session

from models import User, Profile, Streak


# ============================================================
# PASSWORD HASHING
# ============================================================

def hash_password(password: str) -> str:
    """
    Securely hash a password using PBKDF2-HMAC-SHA256.
    Uses only Python's standard library.
    """

    salt = secrets.token_bytes(16)

    password_hash = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        200_000,
    )

    return (
        salt.hex()
        + "$"
        + password_hash.hex()
    )


def verify_password(
    password: str,
    stored_hash: str,
) -> bool:
    """
    Verify a password against the stored password hash.
    """

    try:
        salt_hex, hash_hex = stored_hash.split("$", 1)

        salt = bytes.fromhex(salt_hex)
        expected_hash = bytes.fromhex(hash_hex)

        actual_hash = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt,
            200_000,
        )

        return hmac.compare_digest(
            actual_hash,
            expected_hash,
        )

    except (ValueError, TypeError):
        return False


# ============================================================
# REGISTER USER
# ============================================================

def register_user(
    db: Session,
    name: str,
    email: str,
    password: str,
):
    email = email.strip().lower()
    name = name.strip()

    existing_user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if existing_user:
        return None, "An account with this email already exists."

    user = User(
        name=name,
        email=email,
        password_hash=hash_password(password),
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    # Create the user's profile.
    profile = Profile(
        user_id=user.id,
        display_name=name,
        avatar="default",
    )

    # Create the user's initial streak record.
    streak = Streak(
        user_id=user.id,
        current_streak=0,
        longest_streak=0,
        last_activity=None,
    )

    db.add(profile)
    db.add(streak)

    db.commit()

    return user, None


# ============================================================
# LOGIN USER
# ============================================================

def login_user(
    db: Session,
    email: str,
    password: str,
):
    email = email.strip().lower()

    user = (
        db.query(User)
        .filter(User.email == email)
        .first()
    )

    if not user:
        return None, "The email or password is incorrect."

    if not verify_password(
        password,
        user.password_hash,
    ):
        return None, "The email or password is incorrect."

    return user, None