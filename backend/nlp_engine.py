import re

class PythonNLPEngine:
    """
    LinguaBridge - Advanced Python NLP Engine Module
    Handles Natural Language Pre-processing tasks:
    - Multilingual tokenization & sentence boundary detection
    - Speech recognition hesitation filler & stutter token stripping
    - Informal contraction expansion & syntax normalization
    - Language intent detection & genuine NLP metadata generation
    """

    def __init__(self):
        # Multilingual hesitation filler patterns across major languages
        self.filler_patterns = [
            (r'\b(um|uh|err|erm|hmm|aaa|aaaa|eee|ooo|like|you know|i mean)\b', 'English hesitation filler'),
            (r'\b(este|eh|ehm|o sea|bueno)\b', 'Spanish hesitation filler'),
            (r'\b(euh|bah|ben|hein|du coup)\b', 'French hesitation filler'),
            (r'\b(äh|ähm|halt|sozusagen)\b', 'German hesitation filler'),
            (r'\b(uhm|मतलब|अह|उम)\b', 'Hindi hesitation filler')
        ]

        # Common informal spoken contraction expansions
        self.contractions = [
            (r'\b(wanna)\b', 'want to', 'Expanded contraction (wanna -> want to)'),
            (r'\b(gonna)\b', 'going to', 'Expanded contraction (gonna -> going to)'),
            (r'\b(gotta)\b', 'got to', 'Expanded contraction (gotta -> got to)'),
            (r'\b(im)\b', 'I am', 'Expanded contraction (im -> I am)'),
            (r'\b(cant)\b', 'cannot', 'Expanded contraction (cant -> cannot)'),
            (r'\b(dont)\b', 'do not', 'Expanded contraction (dont -> do not)'),
            (r'\b(isnt)\b', 'is not', 'Expanded contraction (isnt -> is not)')
        ]

    def process(self, text: str, source_lang: str = 'auto') -> dict:
        """
        Process and clean raw native speech recognition transcript.
        Returns dictionary containing original text, cleaned text, token count, applied rules, and NLP metadata.
        """
        if not text or not isinstance(text, str):
            return {
                "cleaned_text": "",
                "original_text": "",
                "token_count": 0,
                "was_modified": False,
                "rules_applied": [],
                "intent": "Empty Input"
            }

        original_text = text.strip()
        cleaned = original_text
        rules_applied = []

        # 1. Remove hesitation filler words (case-insensitive regex)
        for pattern, label in self.filler_patterns:
            new_text = re.sub(pattern, '', cleaned, flags=re.IGNORECASE)
            if new_text != cleaned:
                rules_applied.append(f"Removed {label}")
                cleaned = new_text

        # 2. Expand informal spoken contractions
        for pattern, replacement, label in self.contractions:
            new_text = re.sub(pattern, replacement, cleaned, flags=re.IGNORECASE)
            if new_text != cleaned:
                rules_applied.append(label)
                cleaned = new_text

        # 3. Remove duplicate adjacent stutter words (e.g. "the the" -> "the")
        new_text = re.sub(r'\b(\w+)\s+\1\b', r'\1', cleaned, flags=re.IGNORECASE)
        if new_text != cleaned:
            rules_applied.append("Removed duplicate stutter tokens")
            cleaned = new_text

        # 4. Normalize multiple spaces
        cleaned = re.sub(r'\s+', ' ', cleaned).strip()

        # 5. Strip leading and trailing noise punctuation
        cleaned = re.sub(r'^[\s,.?!:-]+', '', cleaned)
        cleaned = re.sub(r'[\s,;:.-]+$', '', cleaned)

        # 6. Capitalize sentence initial character
        if len(cleaned) > 0 and cleaned[0].islower():
            cleaned = cleaned[0].upper() + cleaned[1:]
            rules_applied.append("Capitalized sentence start")

        # 7. Ensure sentence end boundary mark (. ? !)
        if len(cleaned) > 0 and not re.search(r'[.!?]$', cleaned):
            cleaned += '.'
            rules_applied.append("Added sentence boundary punctuation")

        # Extract word tokens (support both space-delimited & CJK ideographs)
        cjk_chars = re.findall(r'[\u3040-\u30FF\u4E00-\u9FFF\uAC00-\uD7AF]', cleaned)
        latin_words = [t for t in re.findall(r'\b\w+\b', cleaned) if t]
        token_count = len(latin_words) + (len(cjk_chars) if not latin_words else 0)

        # Determine basic NLP intent classification
        intent = "General Statement"
        cleaned_lower = cleaned.lower()
        if cleaned.endswith('?') or '?' in cleaned or '？' in cleaned:
            intent = "Question / Query"
        elif cleaned.endswith('!') or '!' in cleaned or '！' in cleaned:
            intent = "Exclamation / Command"
        elif any(g in cleaned_lower for g in ['hello', 'hi', 'hey', 'hola', 'bonjour', 'guten tag', 'namaste', 'arigatou', 'arigato', 'nǐ hǎo', 'konnichiwa', 'こんにちは', 'ありがとう', 'नमस्ते', '你好', '안녕하세요']):
            intent = "Greeting / Salutation"

        return {
            "original_text": original_text,
            "cleaned_text": cleaned,
            "token_count": max(token_count, len(cleaned.split())),
            "original_word_count": max(len(original_text.split()), 1),
            "was_modified": cleaned != original_text,
            "rules_applied": rules_applied if rules_applied else ["Standard token normalization"],
            "intent": intent
        }

