"""
Demo Families — Pre-built family profiles for one-click demo mode.

These 3 families represent distinct generational gaps and cultural backgrounds.
Used by the "Load Sample Family" button in the UI.
"""


DEMO_FAMILIES = {
    "classic_american": {
        "name": "The Johnsons — Classic American Family",
        "description": "Three generations with a wide taste gap: classic films vs. modern anime",
        "members": [
            {
                "id": "demo-grandma-1",
                "nickname": "Grandma Rose",
                "generation": "grandparent",
                "liked_items": [
                    {"text": "The Sound of Music", "category": "movies"},
                    {"text": "Casablanca", "category": "movies"},
                    {"text": "Frank Sinatra", "category": "movies"},
                    {"text": "Italian restaurants", "category": "restaurants"},
                    {"text": "Garden walks", "category": "activities"},
                ],
                "disliked_items": [
                    {"text": "Horror movies", "category": "movies"},
                    {"text": "Spicy food", "category": "restaurants"},
                ],
            },
            {
                "id": "demo-dad-1",
                "nickname": "Dad Mike",
                "generation": "parent",
                "liked_items": [
                    {"text": "The Dark Knight", "category": "movies"},
                    {"text": "Inception", "category": "movies"},
                    {"text": "Breaking Bad", "category": "movies"},
                    {"text": "Steakhouses", "category": "restaurants"},
                    {"text": "Hiking", "category": "activities"},
                ],
                "disliked_items": [
                    {"text": "Romantic comedies", "category": "movies"},
                ],
            },
            {
                "id": "demo-teen-1",
                "nickname": "Zoe",
                "generation": "teen",
                "liked_items": [
                    {"text": "Spirited Away", "category": "movies"},
                    {"text": "Spider-Man: Into the Spider-Verse", "category": "movies"},
                    {"text": "Stranger Things", "category": "movies"},
                    {"text": "Ramen shops", "category": "restaurants"},
                    {"text": "Escape rooms", "category": "activities"},
                ],
                "disliked_items": [
                    {"text": "Black and white movies", "category": "movies"},
                ],
            },
        ],
    },
    "multicultural": {
        "name": "The Patels — Multicultural Bridge",
        "description": "Indian-American family spanning three generations with distinct cultural tastes",
        "members": [
            {
                "id": "demo-grandpa-2",
                "nickname": "Dada Ji",
                "generation": "grandparent",
                "liked_items": [
                    {"text": "Mughal-e-Azam", "category": "movies"},
                    {"text": "Sholay", "category": "movies"},
                    {"text": "Classical Indian music", "category": "movies"},
                    {"text": "Vegetarian Indian restaurants", "category": "restaurants"},
                    {"text": "Temple visits", "category": "activities"},
                ],
                "disliked_items": [
                    {"text": "Violence", "category": "movies"},
                    {"text": "Non-vegetarian food", "category": "restaurants"},
                ],
            },
            {
                "id": "demo-mom-2",
                "nickname": "Mom Priya",
                "generation": "parent",
                "liked_items": [
                    {"text": "3 Idiots", "category": "movies"},
                    {"text": "The Pursuit of Happyness", "category": "movies"},
                    {"text": "Cooking shows", "category": "movies"},
                    {"text": "Thai restaurants", "category": "restaurants"},
                    {"text": "Yoga classes", "category": "activities"},
                ],
                "disliked_items": [
                    {"text": "Superhero movies", "category": "movies"},
                ],
            },
            {
                "id": "demo-teen-2",
                "nickname": "Arjun",
                "generation": "teen",
                "liked_items": [
                    {"text": "RRR", "category": "movies"},
                    {"text": "Marvel movies", "category": "movies"},
                    {"text": "K-pop", "category": "movies"},
                    {"text": "Korean BBQ", "category": "restaurants"},
                    {"text": "Gaming cafes", "category": "activities"},
                ],
                "disliked_items": [
                    {"text": "Slow dramas", "category": "movies"},
                ],
            },
        ],
    },
    "young_family": {
        "name": "The Garcias — Young Family Adventure",
        "description": "Parents with a child and a teen, balancing energetic and calm preferences",
        "members": [
            {
                "id": "demo-dad-3",
                "nickname": "Papa Carlos",
                "generation": "parent",
                "liked_items": [
                    {"text": "Coco", "category": "movies"},
                    {"text": "Pan's Labyrinth", "category": "movies"},
                    {"text": "Breaking Bad", "category": "movies"},
                    {"text": "Mexican restaurants", "category": "restaurants"},
                    {"text": "Soccer", "category": "activities"},
                ],
                "disliked_items": [
                    {"text": "Anime", "category": "movies"},
                ],
            },
            {
                "id": "demo-mom-3",
                "nickname": "Mama Elena",
                "generation": "parent",
                "liked_items": [
                    {"text": "Studio Ghibli", "category": "movies"},
                    {"text": "Amélie", "category": "movies"},
                    {"text": "Baking competitions", "category": "movies"},
                    {"text": "French bistros", "category": "restaurants"},
                    {"text": "Art museums", "category": "activities"},
                ],
                "disliked_items": [
                    {"text": "Horror", "category": "movies"},
                ],
            },
            {
                "id": "demo-teen-3",
                "nickname": "Sofia",
                "generation": "teen",
                "liked_items": [
                    {"text": "Everything Everywhere All at Once", "category": "movies"},
                    {"text": "Encanto", "category": "movies"},
                    {"text": "TikTok trends", "category": "activities"},
                    {"text": "Bubble tea shops", "category": "restaurants"},
                    {"text": "Roller skating", "category": "activities"},
                ],
                "disliked_items": [
                    {"text": "War movies", "category": "movies"},
                ],
            },
            {
                "id": "demo-child-3",
                "nickname": "Little Marco",
                "generation": "child",
                "liked_items": [
                    {"text": "Toy Story", "category": "movies"},
                    {"text": "Moana", "category": "movies"},
                    {"text": "Pizza places", "category": "restaurants"},
                    {"text": "Playgrounds", "category": "activities"},
                ],
                "disliked_items": [
                    {"text": "Scary movies", "category": "movies"},
                ],
            },
        ],
    },
}


def get_demo_family(key: str) -> dict | None:
    """Get a demo family by key."""
    return DEMO_FAMILIES.get(key)


def get_all_demo_families() -> dict:
    """Get all demo families (for the selection UI)."""
    return {
        key: {
            "name": family["name"],
            "description": family["description"],
            "member_count": len(family["members"]),
        }
        for key, family in DEMO_FAMILIES.items()
    }
