from fastapi import APIRouter, Depends

from app.auth import require_role
from app.services.report_scheduler_service import send_daily_report

router = APIRouter(
    prefix="/reports",
    tags=["Reports"]
)


@router.post(
    "/send-now",
    dependencies=[Depends(require_role("ADMIN", "SALES_MANAGER"))]
)
def send_report_now():
    return send_daily_report()
