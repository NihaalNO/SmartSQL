from functools import lru_cache
from supabase import create_client, Client
from app.config import get_settings


@lru_cache
def get_supabase() -> Client:
    """Cached service-role client — bypasses RLS, used for all DB table operations.
    Never call sign_in_with_password on this client; it would swap the auth
    context from service-role to the signed-in user, breaking subsequent queries.
    """
    settings = get_settings()
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


def get_auth_client() -> Client:
    """Fresh anon-key client used exclusively for sign_in_with_password.
    A new instance is created per call so auth state mutations never affect
    the shared service-role client returned by get_supabase().
    """
    settings = get_settings()
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
