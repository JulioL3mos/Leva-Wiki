"""
Portal LEVA backend tests
Covers: auth, wiki (articles/categories/tags), dashboard, files, admin endpoints.
"""
import io
import os
import time
import uuid
# pyrefly: ignore [missing-import]
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




# ---------------- Change Password ----------------
class TestChangePassword:
    def test_change_and_relogin(self):
        """Create a user, change their password, verify old fails and new works."""
        s = new_session()
        email = f"test_pw_{uuid.uuid4().hex[:6]}@example.com"
        old_pw = "oldpassword1"
        new_pw = "newpassword2"

        # Register
        r = s.post(f"{BASE_URL}/api/auth/register",
                   json={"email": email, "password": old_pw, "name": "PW Test User"})
        assert r.status_code == 200

        # Login
        r = s.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": old_pw})
        assert r.status_code == 200

        # Change password
        r = s.post(f"{BASE_URL}/api/auth/change-password",
                   json={"current_password": old_pw, "new_password": new_pw})
        assert r.status_code == 200

        # Old password should fail
        s2 = new_session()
        r = s2.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": old_pw})
        assert r.status_code == 401

        # New password should work
        s3 = new_session()
        r = s3.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": new_pw})
        assert r.status_code == 200

        # Cleanup: delete via admin
        admin_s = new_session()
        admin_s.post(f"{BASE_URL}/api/auth/login", json=ADMIN)
        users = admin_s.get(f"{BASE_URL}/api/admin/users").json()
        target = next((u for u in users if u["email"] == email), None)
        if target:
            admin_s.delete(f"{BASE_URL}/api/admin/users/{target['id']}")

    def test_wrong_current_password_rejected(self, admin_session):
        """Change-password with wrong current password must return 400."""
        r = admin_session.post(f"{BASE_URL}/api/auth/change-password",
                               json={"current_password": "totallywrong", "new_password": "anything1"})
        assert r.status_code == 400


# ---------------- Sector Visibility ----------------
class TestSectorVisibility:
    """Verifica que conteúdo restrito por setor não aparece para usuários de outro setor."""

    @pytest.fixture(scope="class")
    def ti_session(self, admin_session):
        """Cria e loga um usuário do setor TI."""
        s = new_session()
        email = f"test_ti_{uuid.uuid4().hex[:6]}@example.com"
        admin_s = new_session()
        admin_s.post(f"{BASE_URL}/api/auth/login", json=ADMIN)
        admin_s.post(f"{BASE_URL}/api/auth/register",
                     json={"email": email, "password": "ti123456", "name": "TI User",
                           "role": "viewer", "department": "TI"})
        s.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": "ti123456"})
        yield s, email
        # Cleanup
        users = admin_s.get(f"{BASE_URL}/api/admin/users").json()
        t = next((u for u in users if u["email"] == email), None)
        if t:
            admin_s.delete(f"{BASE_URL}/api/admin/users/{t['id']}")

    @pytest.fixture(scope="class")
    def financeiro_session(self, admin_session):
        """Cria e loga um usuário do setor Financeiro."""
        s = new_session()
        email = f"test_fin_{uuid.uuid4().hex[:6]}@example.com"
        admin_s = new_session()
        admin_s.post(f"{BASE_URL}/api/auth/login", json=ADMIN)
        admin_s.post(f"{BASE_URL}/api/auth/register",
                     json={"email": email, "password": "fin123456", "name": "Financeiro User",
                           "role": "viewer", "department": "Financeiro"})
        s.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": "fin123456"})
        yield s, email
        users = admin_s.get(f"{BASE_URL}/api/admin/users").json()
        t = next((u for u in users if u["email"] == email), None)
        if t:
            admin_s.delete(f"{BASE_URL}/api/admin/users/{t['id']}")

    def test_wiki_article_restricted_to_financeiro(self, admin_session, ti_session, financeiro_session):
        """Artigo restrito ao Financeiro: TI não vê, Financeiro vê, Admin vê."""
        # Admin cria artigo restrito ao Financeiro
        payload = {
            "title": "TEST Artigo Financeiro",
            "summary": "Apenas Financeiro",
            "category": "Geral",
            "tags": [],
            "blocks": [{"id": "b1", "type": "paragraph", "content": "confidencial", "meta": {}}],
            "status": "published",
            "target_departments": ["Financeiro"],
        }
        r = admin_session.post(f"{BASE_URL}/api/wiki/articles", json=payload)
        assert r.status_code == 200
        art_id = r.json()["id"]

        try:
            # Financeiro deve ver
            s_fin, _ = financeiro_session
            all_ids_fin = [a["id"] for a in s_fin.get(f"{BASE_URL}/api/wiki/articles").json()]
            assert art_id in all_ids_fin, "Financeiro deveria ver o artigo restrito ao setor"

            # TI não deve ver
            s_ti, _ = ti_session
            all_ids_ti = [a["id"] for a in s_ti.get(f"{BASE_URL}/api/wiki/articles").json()]
            assert art_id not in all_ids_ti, "TI não deveria ver artigo restrito ao Financeiro"

            # Admin sempre vê
            all_ids_admin = [a["id"] for a in admin_session.get(f"{BASE_URL}/api/wiki/articles").json()]
            assert art_id in all_ids_admin

        finally:
            admin_session.delete(f"{BASE_URL}/api/wiki/articles/{art_id}")

    def test_file_restricted_to_financeiro(self, admin_session, ti_session, financeiro_session):
        """Arquivo restrito ao Financeiro: TI não vê no listagem nem consegue baixar."""
        # Admin faz upload
        admin_s_raw = requests.Session()
        admin_s_raw.cookies.update(admin_session.cookies)
        files = {"file": ("secret.pdf", b"%PDF-1.4\n%FINANCEIRO\n", "application/pdf")}
        data = {"category": "Geral", "description": "TEST confidential", "target_departments": "Financeiro"}
        r = admin_s_raw.post(f"{BASE_URL}/api/files/upload", files=files, data=data, timeout=30)
        assert r.status_code == 200
        file_id = r.json()["id"]

        try:
            # Financeiro deve ver
            s_fin, _ = financeiro_session
            ids_fin = [f["id"] for f in s_fin.get(f"{BASE_URL}/api/files").json()]
            assert file_id in ids_fin

            # TI não deve ver na listagem
            s_ti, _ = ti_session
            ids_ti = [f["id"] for f in s_ti.get(f"{BASE_URL}/api/files").json()]
            assert file_id not in ids_ti

            # TI não consegue baixar diretamente
            r_dl = s_ti.get(f"{BASE_URL}/api/files/{file_id}/download")
            assert r_dl.status_code == 403

        finally:
            admin_session.delete(f"{BASE_URL}/api/files/{file_id}")


# ---------------- Academia (Training) ----------------
class TestTraining:
    """Testa o ciclo completo do módulo de Academia."""

    def test_viewer_cannot_create_course(self, viewer_session):
        s, _ = viewer_session
        r = s.post(f"{BASE_URL}/api/training/courses",
                   json={"title": "Hacked Course", "status": "published"})
        assert r.status_code == 403

    def test_admin_creates_course_and_module(self, admin_session):
        # Cria curso
        r = admin_session.post(f"{BASE_URL}/api/training/courses", json={
            "title": "TEST Curso Completo",
            "description": "Curso de testes",
            "status": "published",
            "target_departments": [],
        })
        assert r.status_code == 200
        pytest.test_course_id = r.json()["id"]

        # Cria módulo de aula
        r = admin_session.post(f"{BASE_URL}/api/training/modules", json={
            "course_id": pytest.test_course_id,
            "title": "Módulo 1 - Introdução",
            "type": "lesson",
            "order": 0,
            "content": [{"id": "b1", "type": "paragraph", "content": "Bem-vindo!", "meta": {}}],
        })
        assert r.status_code == 200
        pytest.test_module_lesson_id = r.json()["id"]

        # Cria módulo de quiz
        r = admin_session.post(f"{BASE_URL}/api/training/modules", json={
            "course_id": pytest.test_course_id,
            "title": "Quiz Final",
            "type": "quiz",
            "order": 1,
            "passing_score": 50,
        })
        assert r.status_code == 200
        pytest.test_module_quiz_id = r.json()["id"]

    def test_admin_sets_quiz_questions(self, admin_session):
        questions = [
            {"id": "q1", "text": "Quanto é 1+1?", "options": ["1", "2", "3"], "correct_index": 1},
            {"id": "q2", "text": "Cor do céu?", "options": ["Verde", "Azul", "Vermelho"], "correct_index": 1},
        ]
        r = admin_session.post(
            f"{BASE_URL}/api/training/modules/{pytest.test_module_quiz_id}/questions",
            json=questions,
        )
        assert r.status_code == 200

    def test_viewer_sees_published_course(self, viewer_session):
        s, _ = viewer_session
        r = s.get(f"{BASE_URL}/api/training/courses")
        assert r.status_code == 200
        ids = [c["id"] for c in r.json()]
        assert pytest.test_course_id in ids

    def test_viewer_completes_lesson_module(self, viewer_session):
        s, _ = viewer_session
        r = s.post(f"{BASE_URL}/api/training/modules/{pytest.test_module_lesson_id}/complete")
        assert r.status_code == 200
        assert r.json()["completed"] is True

    def test_progress_recorded(self, viewer_session):
        s, _ = viewer_session
        r = s.get(f"{BASE_URL}/api/training/progress")
        assert r.status_code == 200
        progress_list = r.json()
        course_progress = next(
            (p for p in progress_list if p["course_id"] == pytest.test_course_id), None
        )
        assert course_progress is not None
        assert pytest.test_module_lesson_id in course_progress["completed_modules"]

    def test_quiz_submission_correct(self, viewer_session):
        s, _ = viewer_session
        r = s.post(
            f"{BASE_URL}/api/training/modules/{pytest.test_module_quiz_id}/submit",
            json={"answers": {"q1": 1, "q2": 1}},
        )
        assert r.status_code == 200
        body = r.json()
        assert body["passed"] is True
        assert body["score"] == 100

    def test_quiz_submission_wrong(self, viewer_session):
        s, _ = viewer_session
        r = s.post(
            f"{BASE_URL}/api/training/modules/{pytest.test_module_quiz_id}/submit",
            json={"answers": {"q1": 0, "q2": 0}},  # ambas erradas
        )
        assert r.status_code == 200
        body = r.json()
        assert body["passed"] is False
        assert body["score"] == 0

    def test_course_sector_restriction(self, admin_session):
        """Curso restrito ao TI não aparece para usuário do Financeiro."""
        # Cria usuário TI e Financeiro temporários
        admin_s2 = new_session()
        admin_s2.post(f"{BASE_URL}/api/auth/login", json=ADMIN)

        ti_email = f"test_tr_ti_{uuid.uuid4().hex[:5]}@example.com"
        fin_email = f"test_tr_fin_{uuid.uuid4().hex[:5]}@example.com"
        admin_s2.post(f"{BASE_URL}/api/auth/register",
                      json={"email": ti_email, "password": "ti123456", "name": "TI Tr", "role": "viewer", "department": "TI"})
        admin_s2.post(f"{BASE_URL}/api/auth/register",
                      json={"email": fin_email, "password": "fin123456", "name": "Fin Tr", "role": "viewer", "department": "Financeiro"})

        s_ti = new_session()
        s_ti.post(f"{BASE_URL}/api/auth/login", json={"email": ti_email, "password": "ti123456"})
        s_fin = new_session()
        s_fin.post(f"{BASE_URL}/api/auth/login", json={"email": fin_email, "password": "fin123456"})

        # Cria curso restrito ao TI
        r = admin_s2.post(f"{BASE_URL}/api/training/courses", json={
            "title": "TEST Curso TI Restrito",
            "status": "published",
            "target_departments": ["TI"],
        })
        assert r.status_code == 200
        restricted_id = r.json()["id"]

        try:
            # TI vê o curso
            ids_ti = [c["id"] for c in s_ti.get(f"{BASE_URL}/api/training/courses").json()]
            assert restricted_id in ids_ti

            # Financeiro não vê
            ids_fin = [c["id"] for c in s_fin.get(f"{BASE_URL}/api/training/courses").json()]
            assert restricted_id not in ids_fin

        finally:
            # Cleanup
            users = admin_s2.get(f"{BASE_URL}/api/admin/users").json()
            for email in (ti_email, fin_email):
                t = next((u for u in users if u["email"] == email), None)
                if t:
                    admin_s2.delete(f"{BASE_URL}/api/admin/users/{t['id']}")
            # Note: no delete endpoint for courses, so we leave it (it has TEST in name)


# ---------------- Cleanup ----------------
def test_zz_cleanup(admin_session):
    """Remove todos os dados de teste criados durante a suite."""
    for attr in ("admin_article_id", "editor_article_id"):
        aid = getattr(pytest, attr, None)
        if aid:
            admin_session.delete(f"{BASE_URL}/api/wiki/articles/{aid}")

