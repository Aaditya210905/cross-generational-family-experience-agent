"""
FamilyFusion AI — Data Contracts (Shared Models)

These are the frozen contracts between Person A and Person B.
Any changes require both parties' approval.
Version: 1.0
"""

from .family import (
    FamilyMember,
    Preference,
    FamilyProfileRequest,
    GenerationLabel,
    CategoryType,
)
from .entities import (
    ResolvedEntity,
    ConfidenceLevel,
    ResolvedProfile,
    ResolvedMember,
)
from .candidates import (
    Candidate,
    CandidateScore,
    CandidatePool,
    ScoreSource,
)
from .common import (
    ErrorResponse,
    ProgressEvent,
    ProgressStep,
    AdjustmentSet,
    ConstraintConfig,
    BudgetBand,
    EnergyLevel,
)

__all__ = [
    "FamilyMember",
    "Preference",
    "FamilyProfileRequest",
    "GenerationLabel",
    "CategoryType",
    "ResolvedEntity",
    "ConfidenceLevel",
    "ResolvedProfile",
    "ResolvedMember",
    "Candidate",
    "CandidateScore",
    "CandidatePool",
    "ScoreSource",
    "ErrorResponse",
    "ProgressEvent",
    "ProgressStep",
    "AdjustmentSet",
    "ConstraintConfig",
    "BudgetBand",
    "EnergyLevel",
]
