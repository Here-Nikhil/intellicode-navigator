import base64
import hashlib
import os

from cryptography.hazmat.primitives.ciphers.aead import AESGCM


def _derive_key(master_key: str) -> bytes:
    """Derive a 32-byte AES-256 key from the master encryption key."""
    raw = base64.b64decode(master_key) if _looks_like_base64(master_key) else master_key.encode()
    if len(raw) == 32:
        return raw
    return hashlib.sha256(raw).digest()


def _looks_like_base64(value: str) -> bool:
    try:
        decoded = base64.b64decode(value, validate=True)
        return len(decoded) >= 16
    except Exception:
        return False


def encrypt_api_key(plaintext: str, master_key: str) -> str:
    key = _derive_key(master_key)
    nonce = os.urandom(12)
    aesgcm = AESGCM(key)
    ciphertext = aesgcm.encrypt(nonce, plaintext.encode("utf-8"), None)
    payload = nonce + ciphertext
    return base64.b64encode(payload).decode("ascii")


def decrypt_api_key(encrypted: str, master_key: str) -> str:
    key = _derive_key(master_key)
    payload = base64.b64decode(encrypted)
    nonce, ciphertext = payload[:12], payload[12:]
    aesgcm = AESGCM(key)
    plaintext = aesgcm.decrypt(nonce, ciphertext, None)
    return plaintext.decode("utf-8")


def mask_api_key(value: str) -> str:
    if len(value) <= 8:
        return "••••••••"
    return f"{value[:4]}••••{value[-4:]}"
