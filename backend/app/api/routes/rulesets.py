from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import select
from app.api.deps import get_db
from app.api.schemas import RuleSetCreate, RuleSetOut
from app.db.models import RuleSet

router = APIRouter(prefix="/rulesets", tags=["rulesets"])

@router.post("", response_model=RuleSetOut)
def create_ruleset(payload: RuleSetCreate, db: Session = Depends(get_db)):
    item = RuleSet(**payload.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return item

@router.get("", response_model=list[RuleSetOut])
def list_rulesets(db: Session = Depends(get_db)):
    return list(db.execute(select(RuleSet).order_by(RuleSet.id.desc())).scalars().all())
