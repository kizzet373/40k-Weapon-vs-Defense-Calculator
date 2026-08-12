# Wahapedia modifier coverage

`wahapedia-modifiers.generated.js` is generated from every faction root in the Wahapedia Warhammer 40,000 11th-edition sitemap. It extracts detachment rules and enhancements, then maps effects the calculator can represent: attack characteristics, hit/wound modifiers and rerolls, weapon keywords, saves, Feel No Pain, Toughness, and incoming damage modifiers.

Run `node tools/update-wahapedia-modifiers.js` to refresh it. The generator writes `wahapedia-modifiers.audit.json`, which lists every extracted entry that does not map to the damage engine. Those entries are intentionally retained in the audit instead of receiving guessed behavior; most concern movement, deployment, Objective Control, Battle-shock, Command Points, or replacement effects the average-damage engine cannot model.

Hand-authored mappings in `ability-modifiers.js` override generated mappings. Aura rules are never assigned the Conditions Met gate solely because they are auras.
