import uuid
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Request, Depends
from pydantic import BaseModel, Field

from auth import get_current_user, require_role

router = APIRouter(tags=["training"])

# ---------- Models ----------

class CourseCreate(BaseModel):
    title: str = Field(min_length=1)
    description: str = ""
    target_roles: List[str] = [] 
    target_departments: List[str] = []
    thumbnail: str = ""
    status: str = "draft"  # draft | published

class CourseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    target_roles: Optional[List[str]] = None
    target_departments: Optional[List[str]] = None
    thumbnail: Optional[str] = None
    status: Optional[str] = None

class ModuleCreate(BaseModel):
    course_id: str
    title: str = Field(min_length=1)
    description: str = ""
    type: str = "lesson"  # lesson | quiz
    order: int = 0
    content: List[dict] = []  # Wiki blocks for lessons
    passing_score: Optional[int] = 70

class ModuleUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    type: Optional[str] = None
    order: Optional[int] = None
    content: Optional[List[dict]] = None
    passing_score: Optional[int] = None

class Question(BaseModel):
    id: str
    text: str
    options: List[str]
    correct_index: int

class QuizSubmit(BaseModel):
    answers: Dict[str, int]  # question_id -> selected_index


# ---------- Helpers ----------

def now_iso():
    return datetime.now(timezone.utc).isoformat()

def serialize(doc: dict) -> dict:
    if not doc:
        return doc
    return {k: v for k, v in doc.items() if k != "_id"}


# ---------- Course Endpoints ----------

@router.get("/training/courses")
async def list_courses(request: Request, user: dict = Depends(get_current_user)):
    db = request.app.state.db
    query = {}
    if user["role"] not in ("admin", "editor"):
        query["status"] = "published"
        
    if user["role"] != "admin" and user.get("department") != "Diretoria":
        user_dept = user.get("department", "Geral")
        query["$or"] = [
            {"target_departments": {"$exists": False}},
            {"target_departments": {"$size": 0}},
            {"target_departments": "Geral"},
            {"target_departments": user_dept}
        ]
    
    cursor = db.courses.find(query, {"_id": 0}).sort("created_at", -1)
    courses = await cursor.to_list(length=100)
    return courses

@router.post("/training/courses")
async def create_course(req: CourseCreate, request: Request, user: dict = Depends(require_role("admin", "editor"))):
    db = request.app.state.db
    course_id = str(uuid.uuid4())
    doc = {
        "id": course_id,
        "title": req.title.strip(),
        "description": req.description.strip(),
        "target_roles": req.target_roles,
        "target_departments": req.target_departments,
        "thumbnail": req.thumbnail,
        "status": req.status,
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await db.courses.insert_one(doc)
    return serialize(doc)

@router.get("/training/courses/{course_id}")
async def get_course(course_id: str, request: Request, user: dict = Depends(get_current_user)):
    db = request.app.state.db
    course = await db.courses.find_one({"id": course_id}, {"_id": 0})
    if not course:
        raise HTTPException(status_code=404, detail="Curso não encontrado")
    
    if course["status"] != "published" and user["role"] not in ("admin", "editor"):
        raise HTTPException(status_code=403, detail="Acesso negado")
        
    if user["role"] != "admin" and user.get("department") != "Diretoria":
        user_dept = user.get("department", "Geral")
        target_depts = course.get("target_departments", [])
        if target_depts and len(target_depts) > 0 and "Geral" not in target_depts and user_dept not in target_depts:
            raise HTTPException(status_code=403, detail="Sem permissão para visualizar este curso")
    
    # Fetch modules
    cursor = db.modules.find({"course_id": course_id}, {"_id": 0}).sort("order", 1)
    modules = await cursor.to_list(length=100)
    
    # Do not leak correct_index for quizzes unless admin
    for m in modules:
        if m.get("type") == "quiz" and "questions" in m:
            if user["role"] not in ("admin", "editor"):
                for q in m["questions"]:
                    q.pop("correct_index", None)
                    
    course["modules"] = modules
    return course

@router.patch("/training/courses/{course_id}")
async def update_course(course_id: str, req: CourseUpdate, request: Request, user: dict = Depends(require_role("admin", "editor"))):
    db = request.app.state.db
    update_data = {k: v for k, v in req.model_dump(exclude_none=True).items()}
    if not update_data:
        return {"ok": True}
        
    update_data["updated_at"] = now_iso()
    res = await db.courses.update_one({"id": course_id}, {"$set": update_data})
    if not res.matched_count:
        raise HTTPException(status_code=404, detail="Curso não encontrado")
    return {"ok": True}


# ---------- Module Endpoints ----------

@router.post("/training/modules")
async def create_module(req: ModuleCreate, request: Request, user: dict = Depends(require_role("admin", "editor"))):
    db = request.app.state.db
    module_id = str(uuid.uuid4())
    doc = {
        "id": module_id,
        "course_id": req.course_id,
        "title": req.title.strip(),
        "description": req.description.strip(),
        "type": req.type,
        "order": req.order,
        "content": req.content,
        "passing_score": req.passing_score,
        "questions": [], # For quizzes
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }
    await db.modules.insert_one(doc)
    return serialize(doc)

@router.patch("/training/modules/{module_id}")
async def update_module(module_id: str, req: ModuleUpdate, request: Request, user: dict = Depends(require_role("admin", "editor"))):
    db = request.app.state.db
    update_data = {k: v for k, v in req.model_dump(exclude_none=True).items()}
    if not update_data:
        return {"ok": True}
        
    update_data["updated_at"] = now_iso()
    res = await db.modules.update_one({"id": module_id}, {"$set": update_data})
    if not res.matched_count:
        raise HTTPException(status_code=404, detail="Módulo não encontrado")
    return {"ok": True}

@router.post("/training/modules/{module_id}/questions")
async def set_quiz_questions(module_id: str, questions: List[Question], request: Request, user: dict = Depends(require_role("admin", "editor"))):
    db = request.app.state.db
    module = await db.modules.find_one({"id": module_id})
    if not module or module.get("type") != "quiz":
        raise HTTPException(status_code=400, detail="Módulo inválido ou não é um quiz")
    
    questions_data = [q.model_dump() for q in questions]
    await db.modules.update_one({"id": module_id}, {"$set": {"questions": questions_data, "updated_at": now_iso()}})
    return {"ok": True}


# ---------- Progress & Quiz Submission ----------

@router.get("/training/progress")
async def get_user_progress(request: Request, user: dict = Depends(get_current_user)):
    db = request.app.state.db
    cursor = db.user_progress.find({"user_id": user["id"]}, {"_id": 0})
    progress = await cursor.to_list(length=1000)
    return progress

@router.post("/training/modules/{module_id}/complete")
async def complete_module(module_id: str, request: Request, user: dict = Depends(get_current_user)):
    # For lessons (non-quiz), simply mark as completed
    db = request.app.state.db
    module = await db.modules.find_one({"id": module_id})
    if not module:
        raise HTTPException(status_code=404, detail="Módulo não encontrado")
        
    if module.get("type") == "quiz":
        raise HTTPException(status_code=400, detail="Use o endpoint de submit para quizzes")
        
    course_id = module["course_id"]
    await _mark_module_completed(db, user["id"], course_id, module_id, score=None)
    return {"ok": True, "completed": True}

@router.post("/training/modules/{module_id}/submit")
async def submit_quiz(module_id: str, submission: QuizSubmit, request: Request, user: dict = Depends(get_current_user)):
    db = request.app.state.db
    module = await db.modules.find_one({"id": module_id})
    if not module or module.get("type") != "quiz":
        raise HTTPException(status_code=404, detail="Quiz não encontrado")
        
    questions = module.get("questions", [])
    if not questions:
        raise HTTPException(status_code=400, detail="Quiz não possui perguntas")
        
    total_questions = len(questions)
    correct_answers = 0
    
    for q in questions:
        q_id = q["id"]
        user_answer = submission.answers.get(q_id)
        if user_answer is not None and user_answer == q["correct_index"]:
            correct_answers += 1
            
    score_percentage = int((correct_answers / total_questions) * 100)
    passing_score = module.get("passing_score", 70)
    passed = score_percentage >= passing_score
    
    course_id = module["course_id"]
    
    # Save result history
    await db.quiz_results.insert_one({
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "module_id": module_id,
        "course_id": course_id,
        "score": score_percentage,
        "passed": passed,
        "created_at": now_iso()
    })
    
    if passed:
        await _mark_module_completed(db, user["id"], course_id, module_id, score=score_percentage)
        
    return {
        "score": score_percentage,
        "passed": passed,
        "passing_score": passing_score,
        "correct_count": correct_answers,
        "total": total_questions
    }

async def _mark_module_completed(db, user_id: str, course_id: str, module_id: str, score: Optional[int] = None):
    # Find existing progress or create
    progress = await db.user_progress.find_one({"user_id": user_id, "course_id": course_id})
    if not progress:
        progress = {
            "id": str(uuid.uuid4()),
            "user_id": user_id,
            "course_id": course_id,
            "completed_modules": [],
            "scores": {},
            "created_at": now_iso(),
            "updated_at": now_iso()
        }
        await db.user_progress.insert_one(progress)
        
    update_data = {}
    if module_id not in progress.get("completed_modules", []):
        update_data["$push"] = {"completed_modules": module_id}
        
    set_data = {"updated_at": now_iso()}
    if score is not None:
        set_data[f"scores.{module_id}"] = score
        
    if set_data:
        update_data["$set"] = set_data
        
    if update_data:
        await db.user_progress.update_one(
            {"user_id": user_id, "course_id": course_id},
            update_data
        )

# ---------- Indexes ----------

async def create_indexes(db):
    await db.courses.create_index("id", unique=True)
    await db.modules.create_index("id", unique=True)
    await db.modules.create_index("course_id")
    await db.user_progress.create_index([("user_id", 1), ("course_id", 1)], unique=True)
