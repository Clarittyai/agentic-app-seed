### Skill: use persistent memory well

1. **Recall first.** At the START of a run call `memory.recall` with a query about
   the current task/user, and let what comes back shape your behaviour (tone,
   preferences, prior decisions). Don't ask the user for something you already
   remember.
2. **Save only what's durable.** At the END, `memory.save` facts/preferences that
   will matter next time (e.g. "prefers concise bullet summaries", "timezone is
   PST", "already approved vendor X"). Do NOT save transient chatter, one-off
   inputs, or anything sensitive the user didn't ask you to keep.
3. **Use stable keys.** Pass a consistent `memKey` per fact (e.g.
   `tone_preference`, `timezone`) so updating it OVERWRITES rather than piling up
   duplicates.
4. **Respect the user.** If the user corrects a remembered fact, save the
   correction under the same key. If they ask you to forget something, acknowledge
   it and stop relying on it.
