"""
Export all data contracts as JSON schemas for the /contracts folder.

Run this script to regenerate the JSON schema files that Person B
also relies on. Both persons must agree on any changes.
"""

import json
import sys
import os

# Add parent to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.models.family import FamilyProfileRequest, FamilyMember, Preference
from backend.models.entities import ResolvedProfile, ResolvedMember, ResolvedEntity
from backend.models.candidates import CandidatePool, Candidate, CandidateScore
from backend.models.common import (
    ErrorResponse,
    ProgressEvent,
    AdjustmentSet,
    ConstraintConfig,
)

CONTRACTS = {
    "FamilyProfileRequest": FamilyProfileRequest,
    "FamilyMember": FamilyMember,
    "Preference": Preference,
    "ResolvedProfile": ResolvedProfile,
    "ResolvedMember": ResolvedMember,
    "ResolvedEntity": ResolvedEntity,
    "CandidatePool": CandidatePool,
    "Candidate": Candidate,
    "CandidateScore": CandidateScore,
    "ErrorResponse": ErrorResponse,
    "ProgressEvent": ProgressEvent,
    "AdjustmentSet": AdjustmentSet,
    "ConstraintConfig": ConstraintConfig,
}


def export_schemas():
    """Export all contract schemas to JSON files."""
    contracts_dir = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "contracts",
    )
    os.makedirs(contracts_dir, exist_ok=True)

    all_schemas = {}
    for name, model in CONTRACTS.items():
        schema = model.model_json_schema()
        all_schemas[name] = schema

        # Write individual schema file
        filepath = os.path.join(contracts_dir, f"{name}.json")
        with open(filepath, "w") as f:
            json.dump(schema, f, indent=2)
        print(f"  ✓ {name} → {filepath}")

    # Write combined schema
    combined_path = os.path.join(contracts_dir, "_all_schemas.json")
    with open(combined_path, "w") as f:
        json.dump(all_schemas, f, indent=2)
    print(f"\n  ✓ Combined → {combined_path}")
    print(f"\n  Total: {len(all_schemas)} schemas exported")


if __name__ == "__main__":
    print("Exporting FamilyFusion AI contracts...\n")
    export_schemas()
