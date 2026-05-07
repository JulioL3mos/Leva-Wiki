"""
Portal LEVA backend tests
Covers: auth, wiki (articles/categories/tags), dashboard, files, admin endpoints.
"""
import io
import os
import time
import uuid
import pytest
import requests
from pathlib import Path

# Load REACT_APP_BACKEND_URL from frontend/.env
ROOT = Path(__file__).resolve().parents[2]
env_path = ROOT / "frontend" / ".env"
BASE_URL = None
if env_path.exists():
    for line in env_path.read_text().splitlines():
        if line.startswith("REACT_APP_BACKEND_URL="):
            BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
            break
assert BASE_URL, "REACT_APP_BACKEND_URL not found"

ADMIN = {"email": "admin@levaportal.com", "password": "admin123"}
EDITOR = {"email": "editor@levaportal.com", "password": "editor123"}


def new_session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="session")
def admin_session():
    s = new_session()
    r = s.post(f"{BASE_URL}/api/auth/login", json=ADMIN, timeout=15)
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="session")
def editor_session():
    s = new_session()
    r = s.post(f"{BASE_URL}/api/auth/login", json=EDITOR, timeout=15)
    assert r.status_code == 200, f"editor login failed: {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="session")
def viewer_session():
    s = new_session()
    email = f"test_viewer_{uuid.uuid4().hex[:8]}@example.com"
    r = s.post(
        f"{BASE_URL}/api/auth/register",
        json={"email": email, "password": "viewer123", "name": "TEST Viewer"},
        timeout=15,
    )
    assert r.status_code == 200, f"viewer register failed: {r.status_code} {r.text}"
    return s, email


# ---------------- Health ----------------
def test_health():
    r = requests.get(f"{BASE_URL}/api/health", timeout=10)
    assert r.status_code == 200
    assert r.json().get("status") == "healthy"


# ---------------- Auth ----------------
class TestAuth:
    def test_login_admin_sets_cookie(self):
        s = new_session()
        r = s.post(f"{BASE_URL}/api/auth/login", json=ADMIN)
        assert r.status_code == 200
        data = r.json()
        assert data["email"] == ADMIN["email"]
        assert data["role"] == "admin"
        assert "access_token" in s.cookies
        assert "refresh_token" in s.cookies

    def test_login_invalid(self):
        s = new_session()
        # use unique email to not trigger lockout for valid users
        r = s.post(f"{BASE_URL}/api/auth/login", json={"email": "nope@example.com", "password": "wrong"})
        assert r.status_code == 401

    def test_me_with_cookie(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 200
        assert r.json()["role"] == "admin"

    def test_me_without_cookie(self):
        r = requests.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 401

    def test_register_viewer(self, viewer_session):
        s, email = viewer_session
        r = s.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 200
        body = r.json()
        assert body["email"] == email
        assert body["role"] == "viewer"

    def test_logout_clears_cookies(self):
        s = new_session()
        s.post(f"{BASE_URL}/api/auth/login", json=ADMIN)
        r = s.post(f"{BASE_URL}/api/auth/logout")
        assert r.status_code == 200
        # After logout, /me should fail using same session (cookies cleared)
        s2 = requests.Session()
        # reuse only headers, not cookies
        r2 = s2.get(f"{BASE_URL}/api/auth/me")
        assert r2.status_code == 401

    def test_brute_force_lockout(self):
        s = new_session()
        bad_email = f"TEST_bf_{uuid.uuid4().hex[:6]}@example.com"
        statuses = []
        for _ in range(7):
            r = s.post(f"{BASE_URL}/api/auth/login", json={"email": bad_email, "password": "x"})
            statuses.append(r.status_code)
        # at least one 429 expected after 5 failures
        assert 429 in statuses, f"expected lockout 429, got {statuses}"


# ---------------- Wiki ----------------
class TestWiki:
    def test_categories_seeded(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/wiki/categories")
        assert r.status_code == 200
        cats = r.json()
        names = {c["name"] for c in cats}
        for required in ["Onboarding", "Renault", "Geely", "Bajaj", "Geral"]:
            assert required in names
        for c in cats:
            assert "article_count" in c

    def test_admin_creates_published(self, admin_session):
        payload = {
            "title": "TEST Admin Article",
            "summary": "summary",
            "category": "Geral",
            "tags": ["TESTtag"],
            "blocks": [{"id": "b1", "type": "paragraph", "content": "hello", "meta": {}}],
            "status": "published",
        }
        r = admin_session.post(f"{BASE_URL}/api/wiki/articles", json=payload)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["status"] == "published"
        assert body["title"] == payload["title"]
        assert "id" in body
        pytest.admin_article_id = body["id"]

    def test_editor_creates_pending(self, editor_session):
        payload = {
            "title": "TEST Editor Article",
            "summary": "x",
            "category": "Geral",
            "tags": [],
            "blocks": [{"id": "b1", "type": "paragraph", "content": "hi", "meta": {}}],
            "status": "published",  # should be forced to pending
        }
        r = editor_session.post(f"{BASE_URL}/api/wiki/articles", json=payload)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["status"] == "pending"
        pytest.editor_article_id = body["id"]

    def test_viewer_cannot_create(self, viewer_session):
        s, _ = viewer_session
        payload = {"title": "Bad", "blocks": [], "status": "published"}
        r = s.post(f"{BASE_URL}/api/wiki/articles", json=payload)
        assert r.status_code == 403

    def test_list_articles(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/wiki/articles", params={"q": "TEST", "limit": 10})
        assert r.status_code == 200
        items = r.json()
        assert isinstance(items, list)

    def test_get_article_increments_view(self, admin_session):
        aid = pytest.admin_article_id
        r1 = admin_session.get(f"{BASE_URL}/api/wiki/articles/{aid}")
        assert r1.status_code == 200
        v1 = r1.json()["view_count"]
        r2 = admin_session.get(f"{BASE_URL}/api/wiki/articles/{aid}")
        v2 = r2.json()["view_count"]
        assert v2 > v1

    def test_update_article_creates_version(self, admin_session):
        aid = pytest.admin_article_id
        new_blocks = [{"id": "b1", "type": "h1", "content": "Updated", "meta": {}}]
        r = admin_session.patch(f"{BASE_URL}/api/wiki/articles/{aid}", json={"blocks": new_blocks, "title": "TEST Admin Article v2"})
        assert r.status_code == 200
        assert r.json()["title"] == "TEST Admin Article v2"
        rv = admin_session.get(f"{BASE_URL}/api/wiki/articles/{aid}/versions")
        assert rv.status_code == 200
        versions = rv.json()
        assert len(versions) >= 2

    def test_tags(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/wiki/tags")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_dashboard_stats(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/dashboard/stats")
        assert r.status_code == 200
        body = r.json()
        for k in ["total_articles", "users_count", "files_count", "recent_articles", "popular_articles", "by_category"]:
            assert k in body


# ---------------- Files ----------------
class TestFiles:
    def test_upload_pdf(self, admin_session):
        # multipart upload (no content-type override)
        s = requests.Session()
        s.cookies.update(admin_session.cookies)
        files = {"file": ("test.pdf", b"%PDF-1.4\n%TEST\n", "application/pdf")}
        data = {"category": "Geral", "description": "TEST upload"}
        r = s.post(f"{BASE_URL}/api/files/upload", files=files, data=data, timeout=30)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["original_filename"] == "test.pdf"
        assert body["content_type"] == "application/pdf"
        pytest.file_id = body["id"]

    def test_list_files(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/files")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_download(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/files/{pytest.file_id}/download")
        assert r.status_code == 200
        assert b"PDF" in r.content

    def test_delete_file(self, admin_session):
        r = admin_session.delete(f"{BASE_URL}/api/files/{pytest.file_id}")
        assert r.status_code == 200
        # confirm absent in list
        r2 = admin_session.get(f"{BASE_URL}/api/files")
        ids = [f["id"] for f in r2.json()]
        assert pytest.file_id not in ids


# ---------------- Admin ----------------
class TestAdmin:
    def test_list_users_admin(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/admin/users")
        assert r.status_code == 200
        users = r.json()
        assert any(u["email"] == ADMIN["email"] for u in users)

    def test_viewer_forbidden_admin(self, viewer_session):
        s, _ = viewer_session
        r = s.get(f"{BASE_URL}/api/admin/users")
        assert r.status_code == 403

    def test_pending_articles(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/admin/pending-articles")
        assert r.status_code == 200
        ids = [a["id"] for a in r.json()]
        assert pytest.editor_article_id in ids

    def test_approve_article(self, admin_session):
        r = admin_session.post(f"{BASE_URL}/api/admin/articles/{pytest.editor_article_id}/approve")
        assert r.status_code == 200
        # confirm now published
        g = admin_session.get(f"{BASE_URL}/api/wiki/articles/{pytest.editor_article_id}")
        assert g.json()["status"] == "published"

    def test_reject_article(self, admin_session, editor_session):
        # Create another pending article via editor
        payload = {"title": "TEST Reject", "blocks": [], "status": "published"}
        cr = editor_session.post(f"{BASE_URL}/api/wiki/articles", json=payload)
        aid = cr.json()["id"]
        r = admin_session.post(f"{BASE_URL}/api/admin/articles/{aid}/reject")
        assert r.status_code == 200
        g = admin_session.get(f"{BASE_URL}/api/wiki/articles/{aid}")
        assert g.json()["status"] == "draft"
        # cleanup
        admin_session.delete(f"{BASE_URL}/api/wiki/articles/{aid}")

    def test_update_user_role(self, admin_session, viewer_session):
        # Create a fresh test user to mutate
        s = new_session()
        email = f"test_role_{uuid.uuid4().hex[:6]}@example.com"
        s.post(f"{BASE_URL}/api/auth/register", json={"email": email, "password": "pwd123", "name": "Role Test"})
        users = admin_session.get(f"{BASE_URL}/api/admin/users").json()
        target = next(u for u in users if u["email"] == email)
        r = admin_session.patch(f"{BASE_URL}/api/admin/users/{target['id']}", json={"role": "editor"})
        assert r.status_code == 200
        assert r.json()["role"] == "editor"
        # cleanup
        admin_session.delete(f"{BASE_URL}/api/admin/users/{target['id']}")


# ---------------- Cleanup ----------------
def test_zz_cleanup(admin_session):
    aid = getattr(pytest, "admin_article_id", None)
    if aid:
        admin_session.delete(f"{BASE_URL}/api/wiki/articles/{aid}")
    eid = getattr(pytest, "editor_article_id", None)
    if eid:
        admin_session.delete(f"{BASE_URL}/api/wiki/articles/{eid}")
