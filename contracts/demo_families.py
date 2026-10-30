"""
FusionAI — 3 Demo Families with Distinct Generational Gaps

Each family has clear generational taste differences to showcase the
recommendation engine's ability to find bridge items.

Family 1: Indian Three-Generation Family (grandparent/parent/teen)
Family 2: Cross-Cultural Blended Family (different cultural backgrounds)
Family 3: Adventure Seekers with Accessibility Needs (4 members, wide age range)
"""

from contracts.models import (
    BudgetBand,
    Candidate,
    CandidatePool,
    Category,
    ConfidenceLevel,
    Constraints,
    DataSource,
    EnergyLevel,
    FamilyMember,
    FamilyProfileRequest,
    GenerationLabel,
    PersonScore,
    ResolvedEntity,
    ScoreSource,
    TimeAvailable,
)


# ═══════════════════════════════════════════════════════════════════════════
# FAMILY 1: The Sharma Family — Indian Three-Generation Household
# ═══════════════════════════════════════════════════════════════════════════
# Nani loves Bollywood classics and traditional food.
# Mom Priya loves thrillers and international cuisine.
# Teen Arjun loves Marvel, anime, and trendy restaurants.

FAMILY_1_MEMBERS = [
    FamilyMember(
        id="sharma-nani",
        nickname="Nani",
        generation=GenerationLabel.GRANDPARENT,
        avatar_emoji="👵🏽",
        liked_items=[
            "Mughal-e-Azam", "Sholay", "Mother India",
            "classical music", "historical dramas",
            "traditional Indian restaurant", "chai cafe"
        ],
        disliked_items=["horror movies", "very loud action", "spicy Thai food"],
    ),
    FamilyMember(
        id="sharma-priya",
        nickname="Priya",
        generation=GenerationLabel.PARENT,
        avatar_emoji="👩🏽",
        liked_items=[
            "Parasite", "The White Tiger", "Dune",
            "psychological thrillers", "period dramas",
            "sushi restaurant", "Italian fine dining"
        ],
        disliked_items=["slapstick comedy", "fast food chains"],
    ),
    FamilyMember(
        id="sharma-arjun",
        nickname="Arjun",
        generation=GenerationLabel.TEEN,
        avatar_emoji="👦🏽",
        liked_items=[
            "Spider-Man: Across the Spider-Verse", "Spirited Away", "Attack on Titan",
            "Marvel", "anime", "sci-fi",
            "ramen shop", "burger joint", "boba tea"
        ],
        disliked_items=["old black-and-white films", "opera"],
    ),
]

FAMILY_1_CONSTRAINTS = Constraints(
    budget_band=BudgetBand.MEDIUM,
    location="Mumbai",
    time_available=TimeAvailable.MEDIUM,
    energy_level=EnergyLevel.LOW,
    dietary=["vegetarian"],
    mobility_notes="Nani has mild knee pain, prefers seated activities",
    category=Category.MOVIES,
)

FAMILY_1_PROFILE = FamilyProfileRequest(
    family_id="demo-sharma",
    members=FAMILY_1_MEMBERS,
    constraints=FAMILY_1_CONSTRAINTS,
    category=Category.MOVIES,
)


# ═══════════════════════════════════════════════════════════════════════════
# FAMILY 2: The Tanaka-Rodriguez Family — Cross-Cultural Blended
# ═══════════════════════════════════════════════════════════════════════════
# Dad Carlos loves Mexican/Latin cinema and food.
# Stepmom Yuki loves Japanese cinema and cuisine.
# Daughter Sofia loves K-dramas, indie films, and fusion food.

FAMILY_2_MEMBERS = [
    FamilyMember(
        id="tanrod-carlos",
        nickname="Carlos",
        generation=GenerationLabel.PARENT,
        avatar_emoji="👨🏽",
        liked_items=[
            "Roma", "Y Tu Mamá También", "Amores Perros",
            "Westerns", "adventure films",
            "Mexican restaurant", "taqueria", "steakhouse"
        ],
        disliked_items=["romantic comedies", "musicals"],
    ),
    FamilyMember(
        id="tanrod-yuki",
        nickname="Yuki",
        generation=GenerationLabel.PARENT,
        avatar_emoji="👩🏻",
        liked_items=[
            "Spirited Away", "Rashomon", "Shoplifters",
            "Studio Ghibli", "art house cinema", "quiet dramas",
            "sushi bar", "izakaya", "tea house"
        ],
        disliked_items=["excessive violence", "crude humor"],
    ),
    FamilyMember(
        id="tanrod-sofia",
        nickname="Sofia",
        generation=GenerationLabel.YOUNG_ADULT,
        avatar_emoji="👧🏽",
        liked_items=[
            "Everything Everywhere All at Once", "Crash Landing on You",
            "indie films", "K-dramas", "coming-of-age stories",
            "Korean BBQ", "fusion restaurant", "dessert cafe"
        ],
        disliked_items=["war movies", "long boring documentaries"],
    ),
]

FAMILY_2_CONSTRAINTS = Constraints(
    budget_band=BudgetBand.MEDIUM,
    location="Los Angeles",
    time_available=TimeAvailable.LONG,
    energy_level=EnergyLevel.MEDIUM,
    dietary=["pescatarian"],
    category=Category.RESTAURANTS,
)

FAMILY_2_PROFILE = FamilyProfileRequest(
    family_id="demo-tanaka-rodriguez",
    members=FAMILY_2_MEMBERS,
    constraints=FAMILY_2_CONSTRAINTS,
    category=Category.RESTAURANTS,
)


# ═══════════════════════════════════════════════════════════════════════════
# ═══════════════════════════════════════════════════════════════════════════
# FAMILY 3: The Williams Family — Adventure & Outings with Accessibility
# ═══════════════════════════════════════════════════════════════════════════
# Grandpa Bob loves history museums and scenic riverwalks, uses a wheelchair.
# Dad Mike loves science centers, planetariums, and outdoor festivals.
# Daughter Zoe (13) loves botanical gardens, escape rooms, and photography walks.
# Son Sam (10) loves aquariums, dinosaur halls, and interactive science parks.

FAMILY_3_MEMBERS = [
    FamilyMember(
        id="williams-bob",
        nickname="Grandpa Bob",
        generation=GenerationLabel.GRANDPARENT,
        avatar_emoji="👴🏼",
        liked_items=[
            "Field Museum of Natural History", "Chicago Riverwalk", "Art Institute of Chicago",
            "botanical garden tour", "aviation museum", "scenic lakefront cruise"
        ],
        disliked_items=["rollercoasters", "strenuous hiking", "extreme crowds"],
    ),
    FamilyMember(
        id="williams-mike",
        nickname="Dad Mike",
        generation=GenerationLabel.PARENT,
        avatar_emoji="👨🏼",
        liked_items=[
            "Museum of Science and Industry", "Adler Planetarium", "interactive science museum",
            "board game cafe", "lakefront bike ride", "outdoor festival"
        ],
        disliked_items=["shopping malls", "indoor playpens"],
    ),
    FamilyMember(
        id="williams-zoe",
        nickname="Zoe",
        generation=GenerationLabel.TEEN,
        avatar_emoji="👧🏼",
        liked_items=[
            "Lincoln Park Conservatory", "Navy Pier Ferris Wheel", "escape room challenge",
            "art and science museum", "sunset beach walk", "botanical garden tour"
        ],
        disliked_items=["dull lectures", "stuffy quiet archives"],
    ),
    FamilyMember(
        id="williams-sam",
        nickname="Sam",
        generation=GenerationLabel.CHILD,
        avatar_emoji="👦🏼",
        liked_items=[
            "Shedd Aquarium", "Chicago Children's Museum", "miniature golf",
            "dinosaur exhibits", "planetarium space shows", "zoo wildlife tour"
        ],
        disliked_items=["long walking tours without breaks", "silent art galleries"],
    ),
]

FAMILY_3_CONSTRAINTS = Constraints(
    budget_band=BudgetBand.MEDIUM,
    location="Chicago",
    time_available=TimeAvailable.MEDIUM,
    energy_level=EnergyLevel.LOW,
    dietary=[],
    mobility_notes="Grandpa Bob uses a wheelchair — requires wheelchair accessible & step-free venues",
    category=Category.ACTIVITIES,
)

FAMILY_3_PROFILE = FamilyProfileRequest(
    family_id="demo-williams",
    members=FAMILY_3_MEMBERS,
    constraints=FAMILY_3_CONSTRAINTS,
    category=Category.ACTIVITIES,
)


# ═══════════════════════════════════════════════════════════════════════════
# MOCK CANDIDATE POOLS — For Person B development before Person A delivers
# ═══════════════════════════════════════════════════════════════════════════

def _make_candidate(
    qloo_id: str,
    name: str,
    entity_type: str,
    tags: list[str],
    scores: dict[str, tuple[float, ScoreSource]],
    source_members: list[str],
    metadata: dict | None = None,
    data_source: DataSource = DataSource.FALLBACK,
) -> Candidate:
    """Helper to build a Candidate with per-person scores."""
    per_person = {}
    for member_id, (score, src) in scores.items():
        nickname = member_id.split("-")[-1].capitalize()
        per_person[member_id] = PersonScore(
            member_id=member_id,
            nickname=nickname,
            score=score,
            source=src,
        )
    return Candidate(
        entity=ResolvedEntity(
            qloo_id=qloo_id,
            name=name,
            type=entity_type,
            confidence=ConfidenceLevel.EXACT,
            user_confirmed=True,
            tags=tags,
        ),
        source_members=source_members,
        per_person_scores=per_person,
        tags=tags,
        metadata=metadata or {},
        data_source=data_source,
    )


def get_mock_pool_family_1() -> CandidatePool:
    """Sharma Family — Movies. Mix of Bollywood, international, and anime-adjacent."""
    R = ScoreSource.REAL
    E = ScoreSource.ESTIMATED
    candidates = [
        _make_candidate(
            "q-lagaan", "Lagaan", "movie",
            ["bollywood", "drama", "sports", "historical", "musical", "family"],
            {"sharma-nani": (0.92, R), "sharma-priya": (0.75, R), "sharma-arjun": (0.45, E)},
            ["sharma-nani"],
            {"runtime_min": 224, "year": 2001, "language": "Hindi"},
        ),
        _make_candidate(
            "q-ratatouille", "Ratatouille", "movie",
            ["animation", "comedy", "family", "food", "heartwarming", "pixar"],
            {"sharma-nani": (0.55, E), "sharma-priya": (0.72, R), "sharma-arjun": (0.78, R)},
            ["sharma-arjun"],
            {"runtime_min": 111, "year": 2007, "language": "English"},
        ),
        _make_candidate(
            "q-coco", "Coco", "movie",
            ["animation", "family", "music", "culture", "emotional", "pixar", "festival"],
            {"sharma-nani": (0.80, R), "sharma-priya": (0.82, R), "sharma-arjun": (0.76, R)},
            ["sharma-priya", "sharma-arjun"],
            {"runtime_min": 105, "year": 2017, "language": "English"},
        ),
        _make_candidate(
            "q-3idiots", "3 Idiots", "movie",
            ["bollywood", "comedy", "drama", "education", "heartwarming", "friendship"],
            {"sharma-nani": (0.88, R), "sharma-priya": (0.85, R), "sharma-arjun": (0.70, R)},
            ["sharma-nani", "sharma-priya"],
            {"runtime_min": 170, "year": 2009, "language": "Hindi"},
        ),
        _make_candidate(
            "q-howl", "Howl's Moving Castle", "movie",
            ["animation", "fantasy", "studio_ghibli", "romance", "adventure", "magical"],
            {"sharma-nani": (0.40, E), "sharma-priya": (0.65, R), "sharma-arjun": (0.90, R)},
            ["sharma-arjun"],
            {"runtime_min": 119, "year": 2004, "language": "Japanese"},
        ),
        _make_candidate(
            "q-lunchbox", "The Lunchbox", "movie",
            ["drama", "romance", "food", "indian", "quiet", "heartwarming"],
            {"sharma-nani": (0.85, R), "sharma-priya": (0.88, R), "sharma-arjun": (0.30, E)},
            ["sharma-nani", "sharma-priya"],
            {"runtime_min": 104, "year": 2013, "language": "Hindi"},
        ),
        _make_candidate(
            "q-spiderspiderverse", "Spider-Man: Across the Spider-Verse", "movie",
            ["animation", "superhero", "action", "sci-fi", "visually_stunning", "marvel"],
            {"sharma-nani": (0.20, E), "sharma-priya": (0.55, E), "sharma-arjun": (0.95, R)},
            ["sharma-arjun"],
            {"runtime_min": 140, "year": 2023, "language": "English"},
        ),
        _make_candidate(
            "q-barfi", "Barfi!", "movie",
            ["bollywood", "comedy", "romance", "heartwarming", "silent_comedy", "emotional"],
            {"sharma-nani": (0.90, R), "sharma-priya": (0.80, R), "sharma-arjun": (0.50, E)},
            ["sharma-nani"],
            {"runtime_min": 151, "year": 2012, "language": "Hindi"},
        ),
        _make_candidate(
            "q-princessmononoke", "Princess Mononoke", "movie",
            ["animation", "fantasy", "studio_ghibli", "nature", "epic", "adventure"],
            {"sharma-nani": (0.35, E), "sharma-priya": (0.60, R), "sharma-arjun": (0.88, R)},
            ["sharma-arjun"],
            {"runtime_min": 134, "year": 1997, "language": "Japanese"},
        ),
        _make_candidate(
            "q-dil-chahta-hai", "Dil Chahta Hai", "movie",
            ["bollywood", "comedy", "drama", "friendship", "coming_of_age", "road_trip"],
            {"sharma-nani": (0.70, R), "sharma-priya": (0.82, R), "sharma-arjun": (0.60, E)},
            ["sharma-priya"],
            {"runtime_min": 183, "year": 2001, "language": "Hindi"},
        ),
        _make_candidate(
            "q-grave-of-fireflies", "Grave of the Fireflies", "movie",
            ["animation", "drama", "war", "emotional", "studio_ghibli", "historical"],
            {"sharma-nani": (0.65, R), "sharma-priya": (0.70, R), "sharma-arjun": (0.55, E)},
            ["sharma-priya"],
            {"runtime_min": 89, "year": 1988, "language": "Japanese"},
        ),
        _make_candidate(
            "q-piku", "Piku", "movie",
            ["bollywood", "comedy", "drama", "family", "road_trip", "generational"],
            {"sharma-nani": (0.82, R), "sharma-priya": (0.78, R), "sharma-arjun": (0.42, E)},
            ["sharma-nani", "sharma-priya"],
            {"runtime_min": 123, "year": 2015, "language": "Hindi"},
        ),
        # Non-vegetarian restaurant (should be filtered by constraint)
        _make_candidate(
            "q-meat-bbq", "Smokey's BBQ Pit", "restaurant",
            ["bbq", "meat", "non_vegetarian", "american", "grill"],
            {"sharma-nani": (0.10, E), "sharma-priya": (0.30, E), "sharma-arjun": (0.65, E)},
            [],
            {"price_level": 2, "cuisine": "BBQ", "vegetarian_friendly": False},
        ),
    ]
    return CandidatePool(
        candidates=candidates,
        members=FAMILY_1_MEMBERS,
        family_id="demo-sharma",
        category=Category.MOVIES,
        constraints=FAMILY_1_CONSTRAINTS,
    )


def get_mock_pool_family_2() -> CandidatePool:
    """Tanaka-Rodriguez Family — Restaurants in LA. Cross-cultural fusion focus."""
    R = ScoreSource.REAL
    E = ScoreSource.ESTIMATED
    candidates = [
        _make_candidate(
            "q-nobu-la", "Nobu Los Angeles", "restaurant",
            ["japanese", "fusion", "sushi", "seafood", "upscale", "celebrity"],
            {"tanrod-carlos": (0.60, E), "tanrod-yuki": (0.88, R), "tanrod-sofia": (0.75, R)},
            ["tanrod-yuki"],
            {"price_level": 4, "cuisine": "Japanese Fusion", "vegetarian_friendly": True,
             "pescatarian_friendly": True},
        ),
        _make_candidate(
            "q-guelaguetza", "Guelaguetza", "restaurant",
            ["mexican", "oaxacan", "mole", "traditional", "family_friendly", "cultural"],
            {"tanrod-carlos": (0.92, R), "tanrod-yuki": (0.55, E), "tanrod-sofia": (0.65, R)},
            ["tanrod-carlos"],
            {"price_level": 2, "cuisine": "Oaxacan Mexican", "vegetarian_friendly": True,
             "pescatarian_friendly": True},
        ),
        _make_candidate(
            "q-majordomo", "Majordōmo", "restaurant",
            ["asian_fusion", "korean", "noodles", "modern", "trendy", "creative"],
            {"tanrod-carlos": (0.65, R), "tanrod-yuki": (0.72, R), "tanrod-sofia": (0.85, R)},
            ["tanrod-sofia"],
            {"price_level": 3, "cuisine": "Asian Fusion", "vegetarian_friendly": True,
             "pescatarian_friendly": True},
        ),
        _make_candidate(
            "q-broken-spanish", "Broken Spanish", "restaurant",
            ["mexican", "modern", "fusion", "creative", "upscale", "latin"],
            {"tanrod-carlos": (0.80, R), "tanrod-yuki": (0.68, R), "tanrod-sofia": (0.78, R)},
            ["tanrod-carlos", "tanrod-sofia"],
            {"price_level": 3, "cuisine": "Modern Mexican", "vegetarian_friendly": True,
             "pescatarian_friendly": True},
        ),
        _make_candidate(
            "q-sushi-gen", "Sushi Gen", "restaurant",
            ["japanese", "sushi", "traditional", "authentic", "seafood"],
            {"tanrod-carlos": (0.45, E), "tanrod-yuki": (0.90, R), "tanrod-sofia": (0.60, E)},
            ["tanrod-yuki"],
            {"price_level": 2, "cuisine": "Japanese Sushi", "vegetarian_friendly": False,
             "pescatarian_friendly": True},
        ),
        _make_candidate(
            "q-kang-hodong", "Kang Ho-Dong Baekjeong", "restaurant",
            ["korean", "bbq", "meat", "fun", "interactive", "lively"],
            {"tanrod-carlos": (0.72, R), "tanrod-yuki": (0.50, E), "tanrod-sofia": (0.88, R)},
            ["tanrod-sofia"],
            {"price_level": 2, "cuisine": "Korean BBQ", "vegetarian_friendly": False,
             "pescatarian_friendly": False},
        ),
        _make_candidate(
            "q-guerrilla-tacos", "Guerrilla Tacos", "restaurant",
            ["mexican", "tacos", "modern", "street_food", "creative", "casual"],
            {"tanrod-carlos": (0.85, R), "tanrod-yuki": (0.58, E), "tanrod-sofia": (0.72, R)},
            ["tanrod-carlos"],
            {"price_level": 2, "cuisine": "Modern Mexican", "vegetarian_friendly": True,
             "pescatarian_friendly": True},
        ),
        _make_candidate(
            "q-republique", "Republique", "restaurant",
            ["french", "brunch", "bakery", "upscale_casual", "beautiful_space"],
            {"tanrod-carlos": (0.55, E), "tanrod-yuki": (0.70, R), "tanrod-sofia": (0.82, R)},
            ["tanrod-sofia"],
            {"price_level": 3, "cuisine": "French", "vegetarian_friendly": True,
             "pescatarian_friendly": True},
        ),
        _make_candidate(
            "q-matsuhisa", "Matsuhisa", "restaurant",
            ["japanese", "peruvian", "fusion", "sushi", "inventive", "upscale"],
            {"tanrod-carlos": (0.75, R), "tanrod-yuki": (0.82, R), "tanrod-sofia": (0.70, R)},
            ["tanrod-carlos", "tanrod-yuki"],
            {"price_level": 4, "cuisine": "Japanese-Peruvian Fusion", "vegetarian_friendly": True,
             "pescatarian_friendly": True},
        ),
        _make_candidate(
            "q-bestia", "Bestia", "restaurant",
            ["italian", "modern", "trendy", "pasta", "creative", "date_night"],
            {"tanrod-carlos": (0.62, E), "tanrod-yuki": (0.65, E), "tanrod-sofia": (0.80, R)},
            ["tanrod-sofia"],
            {"price_level": 3, "cuisine": "Italian", "vegetarian_friendly": True,
             "pescatarian_friendly": True},
        ),
    ]
    return CandidatePool(
        candidates=candidates,
        members=FAMILY_2_MEMBERS,
        family_id="demo-tanaka-rodriguez",
        category=Category.RESTAURANTS,
        constraints=FAMILY_2_CONSTRAINTS,
    )


def get_mock_pool_family_3() -> CandidatePool:
    """Williams Family — Activities & Outings for 4 members across 3 generations."""
    R = ScoreSource.REAL
    E = ScoreSource.ESTIMATED
    candidates = [
        _make_candidate(
            "act-msi", "Museum of Science and Industry", "activity",
            ["museum", "science", "interactive", "family_friendly", "wheelchair_accessible", "chicago"],
            {
                "williams-bob": (0.85, R), "williams-mike": (0.95, R),
                "williams-zoe": (0.88, R), "williams-sam": (0.92, R),
            },
            ["williams-mike", "williams-sam", "williams-zoe"],
            {"price_level": 2, "runtime_min": 180, "location": "Chicago", "wheelchair_accessible": True},
        ),
        _make_candidate(
            "act-shedd", "Shedd Aquarium", "activity",
            ["aquarium", "animals", "ocean", "accessible", "family_friendly", "indoor", "chicago"],
            {
                "williams-bob": (0.78, R), "williams-mike": (0.82, R),
                "williams-zoe": (0.85, R), "williams-sam": (0.98, R),
            },
            ["williams-sam", "williams-zoe"],
            {"price_level": 2, "runtime_min": 150, "location": "Chicago", "wheelchair_accessible": True},
        ),
        _make_candidate(
            "act-adler", "Adler Planetarium & Sky Theater", "activity",
            ["planetarium", "space", "accessible", "scenic_views", "chicago", "seated"],
            {
                "williams-bob": (0.80, R), "williams-mike": (0.92, R),
                "williams-zoe": (0.75, R), "williams-sam": (0.88, R),
            },
            ["williams-mike", "williams-sam"],
            {"price_level": 2, "runtime_min": 120, "location": "Chicago", "wheelchair_accessible": True},
        ),
        _make_candidate(
            "act-lincoln-park", "Lincoln Park Conservatory & Gardens", "activity",
            ["botanical_garden", "nature", "peaceful", "accessible", "free", "family", "chicago"],
            {
                "williams-bob": (0.90, R), "williams-mike": (0.65, E),
                "williams-zoe": (0.92, R), "williams-sam": (0.60, E),
            },
            ["williams-bob", "williams-zoe"],
            {"price_level": 0, "runtime_min": 90, "location": "Chicago", "wheelchair_accessible": True},
        ),
        _make_candidate(
            "act-field-museum", "Field Museum of Natural History", "activity",
            ["museum", "dinosaurs", "history", "accessible", "educational", "chicago"],
            {
                "williams-bob": (0.92, R), "williams-mike": (0.80, R),
                "williams-zoe": (0.78, R), "williams-sam": (0.90, R),
            },
            ["williams-bob", "williams-sam"],
            {"price_level": 2, "runtime_min": 180, "location": "Chicago", "wheelchair_accessible": True},
        ),
        _make_candidate(
            "act-riverwalk", "Chicago Riverwalk & Architecture Cruise", "activity",
            ["scenic_walk", "waterfront", "accessible", "architecture", "chicago", "outdoor"],
            {
                "williams-bob": (0.88, R), "williams-mike": (0.85, R),
                "williams-zoe": (0.80, R), "williams-sam": (0.68, E),
            },
            ["williams-bob", "williams-mike"],
            {"price_level": 2, "runtime_min": 90, "location": "Chicago", "wheelchair_accessible": True},
        ),
        _make_candidate(
            "act-navy-pier", "Navy Pier Pavilion & Centennial Wheel", "activity",
            ["sightseeing", "waterfront", "accessible", "family_attraction", "chicago"],
            {
                "williams-bob": (0.70, E), "williams-mike": (0.75, R),
                "williams-zoe": (0.86, R), "williams-sam": (0.88, R),
            },
            ["williams-zoe", "williams-sam"],
            {"price_level": 2, "runtime_min": 120, "location": "Chicago", "wheelchair_accessible": True},
        ),
        _make_candidate(
            "act-millennium-park", "Millennium Park & Cloud Gate Plaza", "activity",
            ["public_park", "art", "scenic", "accessible", "free", "chicago"],
            {
                "williams-bob": (0.82, R), "williams-mike": (0.78, R),
                "williams-zoe": (0.88, R), "williams-sam": (0.72, R),
            },
            ["williams-bob", "williams-zoe"],
            {"price_level": 0, "runtime_min": 75, "location": "Chicago", "wheelchair_accessible": True},
        ),
    ]
    return CandidatePool(
        candidates=candidates,
        members=FAMILY_3_MEMBERS,
        family_id="demo-williams",
        category=Category.ACTIVITIES,
        constraints=FAMILY_3_CONSTRAINTS,
    )


# ─── Lookup helpers ──────────────────────────────────────────────────────────

ALL_DEMO_FAMILIES = {
    "demo-sharma": {
        "profile": FAMILY_1_PROFILE,
        "pool_fn": get_mock_pool_family_1,
        "label": "The Sharma Family — Three Generations",
        "description": "Nani (grandparent), Priya (parent), Arjun (teen) — Bollywood meets anime",
    },
    "demo-tanaka-rodriguez": {
        "profile": FAMILY_2_PROFILE,
        "pool_fn": get_mock_pool_family_2,
        "label": "The Tanaka-Rodriguez Family — Cross-Cultural",
        "description": "Carlos (Mexican), Yuki (Japanese), Sofia (Gen-Z) — Fusion food adventure",
    },
    "demo-williams": {
        "profile": FAMILY_3_PROFILE,
        "pool_fn": get_mock_pool_family_3,
        "label": "The Williams Family — Adventure & Outings",
        "description": "Grandpa Bob (wheelchair), Dad Mike, Zoe (13), Sam (10) — Accessible science museums, gardens & lakefront outings",
    },
}


def get_demo_pool(family_id: str) -> CandidatePool | None:
    """Get a mock candidate pool by family ID."""
    entry = ALL_DEMO_FAMILIES.get(family_id)
    if entry:
        return entry["pool_fn"]()
    return None
