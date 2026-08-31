from fastapi import APIRouter, Depends

from app.auth import require_role, MANAGER_UP
from app.services.report_scheduler_service import send_daily_report

router = APIRouter(
    prefix="/reports",
    tags=["Reports"]
)


@router.post(
    "/send-now",
    dependencies=[Depends(require_role(*MANAGER_UP))]
)
def send_report_now():
    return send_daily_report()
