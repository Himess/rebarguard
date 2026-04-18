"""Base agent contract. Each agent is a Hermes skill with a clean async `run` entry."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, Generic, TypeVar

from rebarguard.hermes import HermesClient, get_hermes_client
from rebarguard.schemas import AgentRole
from rebarguard.vision import KimiVisionClient, get_kimi_client

TIn = TypeVar("TIn")
TOut = TypeVar("TOut")


class BaseAgent(ABC, Generic[TIn, TOut]):
    """All structural-inspection agents inherit from this.

    - Stateless by design (state lives in DB / caller).
    - `run` is the entry point; implementations may call Hermes, Kimi, or other tools.
    - `role` identifies the agent in debate streams.
    """

    role: AgentRole

    def __init__(
        self,
        hermes: HermesClient | None = None,
        kimi: KimiVisionClient | None = None,
    ):
        self._hermes = hermes
        self._kimi = kimi

    @property
    def hermes(self) -> HermesClient:
        if self._hermes is None:
            self._hermes = get_hermes_client()
        return self._hermes

    @property
    def kimi(self) -> KimiVisionClient:
        if self._kimi is None:
            self._kimi = get_kimi_client()
        return self._kimi

    @abstractmethod
    async def run(self, payload: TIn) -> TOut:
        """Execute the agent's responsibility and return a structured report."""

    async def emit(self, content: str, *, kind: str = "observation", evidence: Any = None) -> dict:
        """Convenience for streaming a debate message from the agent."""
        return {
            "agent": self.role.value,
            "kind": kind,
            "content": content,
            "evidence": evidence,
        }
