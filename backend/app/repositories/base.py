"""
TalentOps Backend — Base Repository (Interface)
Abstract base class for all repositories.
Defines the minimal contract every repository must follow (Interface Segregation).
"""
from abc import ABC, abstractmethod
from supabase import Client


class BaseRepository(ABC):
    """
    Abstract repository interface.
    All concrete repositories inherit from this and receive
    the Supabase client via constructor injection (Dependency Inversion).
    """

    def __init__(self, db: Client):
        self._db = db

    @property
    def db(self) -> Client:
        return self._db
