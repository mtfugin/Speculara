import unittest

from backend.sense.friction import classify_text, detect_language, mine_comments, remove_contact_details
from backend.sense.model import FRICTIONS, EvidenceStore


def frictions(text):
    return {m.friction for m in classify_text(text)}


def comment(cid, text, **extra):
    row = {"id": cid, "text": text, "barangay": "Poblacion", "source": "invented sample", "collected_at": "2026-03-01"}
    row.update(extra)
    return row


class EachFrictionTests(unittest.TestCase):
    CASES = {
        "affordability": ("Everything here is overpriced for students", "Ang mahal ng kape dito"),
        "availability": ("Came at noon and the croissants were sold out", "Walang stock ng pandesal lagi"),
        "accessibility": ("There is no parking at all", "Hirap puntahan kapag rush hour"),
        "discovery": ("This place is hidden, I never found it", "Saan ba yung bagong cafe sa kanto"),
        "trust": ("The cups looked dirty", "Madumi yung mesa"),
        "quality": ("My latte tasted bitter", "Sunog yung lasa ng espresso"),
        "experience": ("The barista was rude", "Ang tagal ng order ko"),
        "compatibility": ("Do you have oat milk?", "Sana may vegan na pastry"),
    }

    def test_every_friction_is_covered_in_english_and_filipino(self):
        self.assertEqual(set(self.CASES), set(FRICTIONS))
        for friction, (english, filipino) in self.CASES.items():
            with self.subTest(friction=friction, lang="en"):
                self.assertIn(friction, frictions(english))
            with self.subTest(friction=friction, lang="fil"):
                self.assertIn(friction, frictions(filipino))


class TaglishAndLanguageTests(unittest.TestCase):
    def test_taglish_is_mixed_and_classified(self):
        text = "Ang mahal ng coffee, overpriced talaga"
        self.assertEqual(detect_language(text), "mixed")
        m = classify_text(text)[0]
        self.assertEqual((m.friction, m.language), ("affordability", "mixed"))

    def test_language_guess(self):
        self.assertEqual(detect_language("The coffee is very bitter"), "en")
        self.assertEqual(detect_language("Madumi ang mesa, ang tagal pa"), "fil")
        self.assertEqual(detect_language("12345 !!!"), "unknown")


class NegationTests(unittest.TestCase):
    def test_negated_cue_is_not_a_complaint(self):
        for text in ("It is not expensive", "Hindi mahal dito", "Not too pricey at all", "Never slow, nice staff",
                     "Wasn't sold out"):
            with self.subTest(text=text):
                self.assertEqual(classify_text(text), [])

    def test_negation_does_not_cross_a_clause(self):
        self.assertIn("affordability", frictions("Not bad, but pricey"))

    def test_cues_that_are_already_negative_still_match(self):
        self.assertIn("accessibility", frictions("No wifi"))
        self.assertIn("accessibility", frictions("Walang parking"))

    def test_sulit_only_counts_when_negated_or_asked(self):
        self.assertEqual(classify_text("Sulit ang kape"), [])
        self.assertIn("affordability", frictions("Hindi sulit ang presyo"))
        self.assertIn("affordability", frictions("Sulit ba?"))

    def test_words_that_look_like_cues_but_are_not(self):
        self.assertEqual(classify_text("So far so good, loved the cold brew"), [])


class QuestionTests(unittest.TestCase):
    def test_need_question_is_compatibility_and_availability(self):
        found = frictions("Meron bang oat milk?")
        self.assertEqual(found, {"compatibility", "availability"})

    def test_praise_of_a_diet_item_is_not_demand(self):
        self.assertEqual(classify_text("I love the oat milk latte here"), [])

    def test_plain_request_without_a_diet_word(self):
        self.assertEqual(frictions("Do you have pasta?"), {"availability"})


class ConfidenceTests(unittest.TestCase):
    def test_single_cue_is_medium(self):
        (m,) = classify_text("The espresso was bitter")
        self.assertEqual((m.confidence, len(m.cues)), ("medium", 1))

    def test_two_distinct_cues_is_high(self):
        (m,) = classify_text("Bitter and burnt espresso")
        self.assertEqual(m.confidence, "high")
        self.assertEqual(set(m.cues), {"bitter", "burnt"})

    def test_repeated_or_overlapping_cue_is_still_one(self):
        for text in ("pricey pricey pricey", "Sobrang mahal"):
            with self.subTest(text=text):
                (m,) = classify_text(text)
                self.assertEqual(m.confidence, "medium")

    def test_question_plus_sold_out_is_high_availability(self):
        m = next(x for x in classify_text("Meron bang oat milk? Sold out lagi") if x.friction == "availability")
        self.assertEqual(m.confidence, "high")


class MiningTests(unittest.TestCase):
    def setUp(self):
        self.comments = [
            comment("c1", "  Overpriced and pricey  "),
            comment("c2", "Lovely afternoon"),
            comment("c3", "Ang tagal ng order, tapos sold out pa"),
            comment("c4", ""),
        ]
        self.result = mine_comments(self.comments, data_label="illustrative")

    def test_quote_is_original_apart_from_surrounding_whitespace(self):
        first = self.result.observations[0]
        self.assertEqual(first.quote, "Overpriced and pricey")
        self.assertEqual(first.id, "d-c1")
        self.assertEqual((first.kind, first.basis, first.theme), ("demand", "observed", "affordability"))

    def test_unclassified_are_listed_not_forced(self):
        self.assertEqual(self.result.unclassified, ["c2", "c4"])
        self.assertFalse([o for o in self.result.observations if o.id.startswith(("d-c2", "d-c4"))])

    def test_several_frictions_in_one_comment_get_separate_ids(self):
        ids = {o.id for o in self.result.observations if o.quote.startswith("Ang tagal")}
        self.assertEqual(ids, {"d-c3-experience", "d-c3-availability"})

    def test_everything_validates_and_loads_into_the_store(self):
        store = EvidenceStore()
        for obs in self.result.observations:
            obs.validate()
            store.add(obs)
        self.assertEqual(len(store.observed), len(self.result.observations))
        self.assertEqual(store.labels(), {"illustrative"})
        self.assertEqual(len(EvidenceStore.from_json(store.to_json()).observed), len(store.observed))

    def test_bad_input_is_refused(self):
        with self.assertRaises(ValueError):
            mine_comments(self.comments, data_label="made up")
        with self.assertRaises(ValueError):
            mine_comments([comment("x", "pricey"), comment("x", "slow")], data_label="real")
        with self.assertRaises(ValueError):
            mine_comments([comment("", "pricey")], data_label="real")


class PrivacyTests(unittest.TestCase):
    def test_author_keys_are_ignored_and_never_stored(self):
        row = comment("p1", "Pricey coffee", author="Someone Invented", username="@invented", handle="inv",
                      profile_url="https://example.invalid/inv", user="u1")
        (obs,) = mine_comments([row], data_label="illustrative").observations
        obs.validate()
        blob = repr(obs)
        for secret in ("Someone Invented", "@invented", "example.invalid", "u1"):
            self.assertNotIn(secret, blob)
        for key in ("author", "username", "handle", "profile_url", "user"):
            self.assertNotIn(key, obs.extra)

    def test_email_and_phone_are_removed_from_the_quote(self):
        text = "Too pricey, write to sample.name@example.com or call 0917 123 4567 or +63 917 123 4567"
        (obs,) = mine_comments([comment("p2", text)], data_label="illustrative").observations
        self.assertEqual(obs.quote, "Too pricey, write to [removed] or call [removed] or [removed]")
        self.assertNotIn("example.com", obs.quote)

    def test_prices_are_not_mistaken_for_phone_numbers(self):
        self.assertEqual(remove_contact_details("Latte 150 or 200 or 300 pesos"), "Latte 150 or 200 or 300 pesos")


if __name__ == "__main__":
    unittest.main()
