from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.audit_log import AuditLog
from app.schemas.common import PaginatedResponse
from pydantic import BaseModel

router = APIRouter(prefix="/audit-logs", tags=["audit-logs"])


class AuditLogRead(BaseModel):
    id: int
    entity_type: str
    entity_id: int
    action: str
    changed_by: str | None = None
    changes: dict | None = None
    timestamp: datetime

    model_config = {"from_attributes": True}


@router.get("", response_model=PaginatedResponse[AuditLogRead])
def list_audit_logs(
    entity_type: str | None = Query(None),
    entity_id: int | None = Query(None),
    action: str | None = Query(None),
    from_date: str | None = Query(None),
    to_date: str | None = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
):
    q = db.query(AuditLog)
    if entity_type:
        q = q.filter(AuditLog.entity_type == entity_type)
    if entity_id is not None:
        q = q.filter(AuditLog.entity_id == entity_id)
    if action:
        q = q.filter(AuditLog.action == action)
    if from_date:
        try:
            q = q.filter(AuditLog.timestamp >= datetime.fromisoformat(from_date))
        except ValueError:
            pass
    if to_date:
        try:
            q = q.filter(AuditLog.timestamp <= datetime.fromisoformat(to_date))
        except ValueError:
            pass

    total = q.count()
    items = q.order_by(AuditLog.timestamp.desc()).offset(offset).limit(limit).all()
    return PaginatedResponse(items=items, total=total, limit=limit, offset=offset)
