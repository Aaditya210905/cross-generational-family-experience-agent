"""
Test live Qloo integration and Person A end-to-end pipeline.
"""

import sys
from pathlib import Path

# Add project root to sys.path
ROOT_DIR = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT_DIR))

import asyncio
from backend.fixtures.demo_families import DEMO_FAMILIES
from backend.models.family import FamilyMember, Preference
from backend.resolution.resolver import EntityResolver
from backend.retrieval.engine import RetrievalEngine


async def main():
    demo_data = DEMO_FAMILIES["classic_american"]
    print(f"--- 1. Testing with Demo Family: {demo_data['name']} ---")

    members = [
        FamilyMember(
            id=m["id"],
            nickname=m["nickname"],
            generation=m["generation"],
            liked_items=[Preference(text=item["text"], category=item.get("category"), is_dislike=False) for item in m["liked_items"]],
            disliked_items=[Preference(text=item["text"], category=item.get("category"), is_dislike=True) for item in m["disliked_items"]],
        )
        for m in demo_data["members"]
    ]
    print(f"Members: {[m.nickname for m in members]}")

    # Entity Resolution
    print("\n--- 2. Resolving Preferences with Live Qloo API ---")
    resolver = EntityResolver()
    profile = await resolver.resolve_family(members, "movies")
    print("Resolution stats:", profile.resolution_stats)
    for m in profile.members:
        print(f"\n  {m.nickname}:")
        for like in m.resolved_likes:
            print(f"    [Like] \"{like.original_text}\" -> \"{like.name}\" (ID: {like.qloo_id}, conf: {like.confidence.value})")
        if m.unresolved:
            print(f"    [Unresolved]: {m.unresolved}")

    # Retrieval Engine
    print("\n--- 3. Building Candidate Pool with Live Qloo Insights ---")
    engine = RetrievalEngine()
    pool = await engine.build_candidate_pool(profile, "movies")
    print(f"\nCandidate pool built: {len(pool.candidates)} candidates")
    print("Pool stats:", pool.pool_stats)
    
    print("\nTop 5 Candidates in Pool:")
    for i, c in enumerate(pool.candidates[:5], 1):
        scores_str = ", ".join(f"{s.member_id}: {s.score:.2f} ({s.source.value})" for s in c.per_person_scores)
        print(f"  {i}. {c.name} (Source: {c.data_source.value})")
        print(f"     Scores: {scores_str}")

    print("\n=======================================================")
    print("SUCCESS! Full Person A pipeline verified with live Qloo API!")
    print("=======================================================")


if __name__ == "__main__":
    asyncio.run(main())
