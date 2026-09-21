from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database.session import get_db
from app.models.user import User
from app.models.notifications import Notification, NotificationType
from app.schemas.notifications import NotificationResponse, NotificationSummary
from app.services.automation_engine import trigger_system_alerts_scan, process_due_recurring_invoices
from app.api.deps import (
    get_current_user, verify_entity_access
)

router = APIRouter()

@router.get("", response_model=NotificationSummary)
def get_notifications(
    entity_id: int = Query(...),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verify_entity_access(entity_id, current_user, db)

    unread_count = db.query(Notification).filter(
        Notification.entity_id == entity_id,
        Notification.is_read == False
    ).count()

    total_count = db.query(Notification).filter(
        Notification.entity_id == entity_id
    ).count()

    notifs = db.query(Notification).filter(
        Notification.entity_id == entity_id
    ).order_by(desc(Notification.created_at)).limit(limit).all()

    return NotificationSummary(
        unread_count=unread_count,
        total_count=total_count,
        notifications=notifs
    )

@router.put("/{notification_id}/read", response_model=NotificationResponse)
def mark_notification_as_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    notif = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notif:
        raise HTTPException(status_code=404, detail="Notification not found")
    verify_entity_access(notif.entity_id, current_user, db)

    notif.is_read = True
    db.commit()
    db.refresh(notif)
    return notif

@router.put("/mark-all-read", response_model=dict)
def mark_all_notifications_as_read(
    entity_id: int = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verify_entity_access(entity_id, current_user, db)
    db.query(Notification).filter(
        Notification.entity_id == entity_id,
        Notification.is_read == False
    ).update({"is_read": True})
    db.commit()
    return {"message": "All notifications marked as read"}

@router.post("/trigger-checks", response_model=dict)
def trigger_automation_checks(
    entity_id: int = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    verify_entity_access(entity_id, current_user, db)
    
    # 1. Run overdue and low stock scan
    alerts_count = trigger_system_alerts_scan(entity_id, db)

    # 2. Run recurring invoices scan
    rec_inv_ids = process_due_recurring_invoices(entity_id, db)

    return {
        "message": "Automation cycle completed successfully",
        "new_alerts_count": alerts_count,
        "recurring_invoices_generated": len(rec_inv_ids)
    }
