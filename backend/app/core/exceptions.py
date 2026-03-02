"""
TalentOps Backend — Custom Exceptions
Centralized exception hierarchy for clean error handling.
"""
from fastapi import HTTPException, status


class TalentOpsException(Exception):
    """Base exception for all TalentOps errors."""
    def __init__(self, message: str = "An unexpected error occurred"):
        self.message = message
        super().__init__(self.message)


class NotFoundError(TalentOpsException):
    """Raised when a requested resource is not found."""
    def __init__(self, resource: str, identifier: str | int):
        super().__init__(f"{resource} with id '{identifier}' not found")
        self.resource = resource
        self.identifier = identifier


class UnauthorizedError(TalentOpsException):
    """Raised when authentication fails."""
    def __init__(self, message: str = "Invalid or expired authentication token"):
        super().__init__(message)


class ForbiddenError(TalentOpsException):
    """Raised when user lacks permission for an action."""
    def __init__(self, message: str = "You do not have permission to perform this action"):
        super().__init__(message)


class ValidationError(TalentOpsException):
    """Raised when input validation fails at the service level."""
    def __init__(self, message: str = "Invalid input data"):
        super().__init__(message)


class ExternalServiceError(TalentOpsException):
    """Raised when an external service (OpenAI, etc.) fails."""
    def __init__(self, service: str, message: str = ""):
        super().__init__(f"External service '{service}' failed: {message}")
        self.service = service


def exception_to_http(exc: TalentOpsException) -> HTTPException:
    """Convert a domain exception to an HTTP exception."""
    status_map = {
        NotFoundError: status.HTTP_404_NOT_FOUND,
        UnauthorizedError: status.HTTP_401_UNAUTHORIZED,
        ForbiddenError: status.HTTP_403_FORBIDDEN,
        ValidationError: status.HTTP_422_UNPROCESSABLE_ENTITY,
        ExternalServiceError: status.HTTP_502_BAD_GATEWAY,
    }
    code = status_map.get(type(exc), status.HTTP_500_INTERNAL_SERVER_ERROR)
    return HTTPException(status_code=code, detail=exc.message)
