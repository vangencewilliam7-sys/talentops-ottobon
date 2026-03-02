"""
Business Hours Utility
Ported from lib/businessHoursUtils.js — pure Python logic.
Calculates task due dates based on business hours (work hours only).
"""
from datetime import datetime, timedelta, timezone


DEFAULT_SETTINGS = {
    "work_start_time": "09:00:00",
    "work_end_time": "18:00:00",
    "exclude_weekends": True,
}


def parse_time(time_str: str) -> tuple[int, int]:
    """Parse HH:MM:SS string to (hours, minutes)."""
    parts = time_str.split(":")
    return int(parts[0]), int(parts[1])


def get_work_hours_per_day(settings: dict = DEFAULT_SETTINGS) -> float:
    """Get total work hours per day."""
    sh, sm = parse_time(settings.get("work_start_time", DEFAULT_SETTINGS["work_start_time"]))
    eh, em = parse_time(settings.get("work_end_time", DEFAULT_SETTINGS["work_end_time"]))
    return (eh + em / 60) - (sh + sm / 60)


def is_work_day(dt: datetime, settings: dict = DEFAULT_SETTINGS) -> bool:
    """Check if a given day is a work day."""
    if settings.get("exclude_weekends", True):
        return dt.weekday() < 5  # Mon=0 .. Fri=4
    return True


def is_within_business_hours(dt: datetime, settings: dict = DEFAULT_SETTINGS) -> bool:
    """Check if current time is within business hours."""
    if not is_work_day(dt, settings):
        return False

    sh, sm = parse_time(settings.get("work_start_time", DEFAULT_SETTINGS["work_start_time"]))
    eh, em = parse_time(settings.get("work_end_time", DEFAULT_SETTINGS["work_end_time"]))

    current_minutes = dt.hour * 60 + dt.minute
    start_minutes = sh * 60 + sm
    end_minutes = eh * 60 + em

    return start_minutes <= current_minutes < end_minutes


def get_next_business_day_start(dt: datetime, settings: dict = DEFAULT_SETTINGS) -> datetime:
    """Get the next business day's start time."""
    sh, sm = parse_time(settings.get("work_start_time", DEFAULT_SETTINGS["work_start_time"]))
    result = dt + timedelta(days=1)
    result = result.replace(hour=sh, minute=sm, second=0, microsecond=0)

    while not is_work_day(result, settings):
        result += timedelta(days=1)

    return result


def calculate_due_datetime(
    start_date: datetime, allocated_hours: float, settings: dict = DEFAULT_SETTINGS
) -> dict:
    """
    Calculate due date/time based on allocated hours and business hours.
    Returns: { due_date: 'YYYY-MM-DD', due_time: 'HH:MM:SS' }
    """
    if not allocated_hours or allocated_hours <= 0:
        eh, em = parse_time(settings.get("work_end_time", DEFAULT_SETTINGS["work_end_time"]))
        result = start_date.replace(hour=eh, minute=em, second=0)
        return {
            "due_date": result.strftime("%Y-%m-%d"),
            "due_time": settings.get("work_end_time", DEFAULT_SETTINGS["work_end_time"]),
        }

    sh, sm = parse_time(settings.get("work_start_time", DEFAULT_SETTINGS["work_start_time"]))
    eh, em = parse_time(settings.get("work_end_time", DEFAULT_SETTINGS["work_end_time"]))
    work_hours_per_day = get_work_hours_per_day(settings)

    remaining = allocated_hours
    current = start_date

    # Move to work hours if outside
    if not is_within_business_hours(current, settings):
        if is_work_day(current, settings):
            current_min = current.hour * 60 + current.minute
            start_min = sh * 60 + sm
            if current_min < start_min:
                current = current.replace(hour=sh, minute=sm, second=0)
            else:
                current = get_next_business_day_start(current, settings)
        else:
            current = get_next_business_day_start(current, settings)

    # Hours left today
    end_min = eh * 60 + em
    cur_min = current.hour * 60 + current.minute
    hours_left_today = (end_min - cur_min) / 60

    if remaining <= hours_left_today:
        current += timedelta(hours=remaining)
    else:
        remaining -= hours_left_today
        current = get_next_business_day_start(current, settings)

        while remaining > work_hours_per_day:
            remaining -= work_hours_per_day
            current = get_next_business_day_start(current, settings)

        current += timedelta(hours=remaining)

    return {
        "due_date": current.strftime("%Y-%m-%d"),
        "due_time": current.strftime("%H:%M:%S"),
    }


def calculate_elapsed_business_hours(
    start_date: datetime, end_date: datetime, settings: dict = DEFAULT_SETTINGS
) -> float:
    """Calculate elapsed business hours between two dates."""
    if end_date <= start_date:
        return 0.0

    sh, sm = parse_time(settings.get("work_start_time", DEFAULT_SETTINGS["work_start_time"]))
    eh, em = parse_time(settings.get("work_end_time", DEFAULT_SETTINGS["work_end_time"]))

    total_hours = 0.0
    current = start_date

    while current < end_date:
        if is_work_day(current, settings):
            day_start = current.replace(hour=sh, minute=sm, second=0)
            day_end = current.replace(hour=eh, minute=em, second=0)

            effective_start = max(current, day_start)
            effective_end = min(end_date, day_end)

            if effective_end > effective_start:
                total_hours += (effective_end - effective_start).total_seconds() / 3600

        current = (current + timedelta(days=1)).replace(hour=sh, minute=sm, second=0)

    return total_hours
