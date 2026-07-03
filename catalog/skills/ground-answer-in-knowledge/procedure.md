### Skill: answer grounded in the knowledge base

When the user asks something answerable from their documents/data:

1. **Retrieve first.** Call `knowledge.search` with a focused query built from the
   user's question (rephrase for keywords; run it more than once with different
   phrasings if the first result set is thin).
2. **Ground every claim.** Base the answer ONLY on the returned passages. For each
   key point, name the source (filename / passage) it came from.
3. **Quote sparingly, cite always.** Prefer a short quote or paraphrase plus a
   citation over unsupported prose.
4. **Refuse to invent.** If retrieval returns nothing relevant, say the knowledge
   base doesn't contain the answer and offer what you can (e.g. suggest what to
   upload) — never fill the gap with guessed facts.
5. **Scope.** Only answer from THIS user's knowledge base; don't rely on general
   world knowledge unless the user explicitly asked for it, and flag when you do.
