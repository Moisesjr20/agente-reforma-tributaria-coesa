---
name: skill-creator
framework: doe
description: Create new skills, modify and improve existing skills, and measure skill performance. Use when users want to create a skill from scratch, edit, or optimize an existing skill, run evals to test a skill, or iterate on a skill based on user feedback.
---

# Skill Creator

> **Operação DOE** — Esta skill segue a arquitetura DOE. Toda nova skill criada DEVE incluir `framework: doe` no frontmatter e o bloco de Operação DOE no início do corpo. Toda execução segue: **Análise → Plano → Aprovação → Execução → Review**.

---

A skill for creating new skills and iteratively improving them.

At a high level, the process of creating a skill goes like this:

- Decide what you want the skill to do and roughly how it should do it
- Write a draft of the skill
- Create a few test prompts and run the agent with access to the skill
- Help the user evaluate the results qualitatively
- Rewrite the skill based on feedback
- Repeat until you're satisfied

Your job when using this skill is to figure out where the user is in this process and then jump in and help them progress through these stages. Maybe they say "I want to make a skill for X" — you help narrow it down, write a draft, write the test cases, and iterate. Maybe they already have a draft — go straight to the eval/iterate part.

Of course, be flexible. If the user says "I don't need to run evaluations, just vibe with me", do that instead.

---

## Environment: GueClaw (Telegram Bot)

This agent runs as a Telegram bot without subagents, without a browser, and without the Python scripts from the original skill-creator infrastructure. Adapt accordingly:

- **Skip** spawning subagents for parallel eval runs — run test prompts inline yourself
- **Skip** the browser-based eval-viewer (`generate_review.py`) — present results directly in the conversation
- **Skip** `run_loop.py` and description optimization scripts — optimize descriptions by reasoning
- **Do** use the full skill creation interview, writing, and iteration workflow
- **Do** create `evals/evals.json` when useful for tracking test cases
- **Do** follow the Claude.ai-specific instructions section below

Skills are installed to: `.agents/skills/<skill-name>/SKILL.md`

---

## Communicating with the user

The skill creator may be used by people across a wide range of familiarity with coding jargon. Pay attention to context cues to understand how to phrase your communication. In the default case:

- "evaluation" and "benchmark" are borderline, but OK
- For "JSON" and "assertion" you want to see serious cues from the user that they know what those things are before using them without explaining them

It's OK to briefly explain terms if you're in doubt.

---

## Creating a skill

### Capture Intent

Start by understanding the user's intent. The current conversation might already contain a workflow the user wants to capture (e.g., they say "turn this into a skill"). If so, extract answers from the conversation history first — the tools used, the sequence of steps, corrections the user made, input/output formats observed. The user may need to fill the gaps, and should confirm before proceeding.

1. What should this skill enable the agent to do?
2. When should this skill trigger? (what user phrases/contexts)
3. What's the expected output format?
4. Should we set up test cases to verify the skill works? Skills with objectively verifiable outputs benefit from test cases. Skills with subjective outputs often don't need them.

### Interview and Research

Proactively ask questions about edge cases, input/output formats, example files, success criteria, and dependencies. Come prepared with context to reduce burden on the user.

### Write the SKILL.md

Based on the user interview, fill in these components:

- **framework**: Always `doe` (required for all new skills)
- **name**: Skill identifier (directory name too)
- **description**: When to trigger, what it does. This is the primary triggering mechanism — include both what the skill does AND specific contexts for when to use it. All "when to use" info goes here, not in the body. Note: there's a tendency to "undertrigger" skills. To combat this, make the skill descriptions a little pushy. Instead of "How to build a dashboard", write "How to build a dashboard. Use this skill whenever the user mentions dashboards, data visualization, or wants to display data, even if they don't explicitly ask for a 'dashboard.'"
- **version**: Semantic version (optional)
- **author**: Author name (optional)
- **category**: Skill category (optional)
- **tools**: List of tool names needed (optional)
- **the rest of the skill body :)**

### Skill Writing Guide

#### Anatomy of a Skill

```
skill-name/
├── SKILL.md (required)
│   ├── YAML frontmatter (name, description required)
│   └── Markdown instructions
└── Bundled Resources (optional)
    ├── scripts/    - Executable code for deterministic/repetitive tasks
    ├── references/ - Docs loaded into context as needed
    └── assets/     - Files used in output (templates, icons, fonts)
```

#### Progressive Disclosure

Skills use a three-level loading system:
1. **Metadata** (name + description) — Always in context (~100 words)
2. **SKILL.md body** — In context whenever skill triggers (<500 lines ideal)
3. **Bundled resources** — As needed (unlimited)

**Key patterns:**
- Keep SKILL.md under 500 lines; if approaching this limit, add hierarchy with clear pointers
- Reference files clearly from SKILL.md with guidance on when to read them
- For large reference files (>300 lines), include a table of contents

#### Principle of Lack of Surprise

Skills must not contain malware, exploit code, or any content that could compromise system security. A skill's contents should not surprise the user in their intent if described. Don't go along with requests to create misleading skills or skills designed to facilitate unauthorized access, data exfiltration, or other malicious activities.

#### Writing Patterns

Prefer using the imperative form in instructions.

**Defining output formats:**
```markdown
## Report structure
ALWAYS use this exact template:
# [Title]
## Executive summary
## Key findings
## Recommendations
```

**Examples pattern:**
```markdown
## Commit message format
**Example 1:**
Input: Added user authentication with JWT tokens
Output: feat(auth): implement JWT-based authentication
```

### Writing Style

Try to explain to the model *why* things are important in lieu of heavy-handed MUSTs. Use theory of mind and try to make the skill general. Start by writing a draft and then look at it with fresh eyes and improve it.

### Test Cases

After writing the skill draft, come up with 2-3 realistic test prompts — the kind of thing a real user would actually say. Share them with the user: "Here are a few test cases I'd like to try. Do these look right, or do you want to add more?" Then run them.

Save test cases to `evals/evals.json`:

```json
{
  "skill_name": "example-skill",
  "evals": [
    {
      "id": 1,
      "prompt": "User's task prompt",
      "expected_output": "Description of expected result",
      "files": []
    }
  ]
}
```

See `references/schemas.md` for the full schema (including the `assertions` field).

---

## Running and evaluating test cases (GueClaw / no-subagent mode)

Since this agent has no subagents or browser, follow these steps:

1. **For each test case**, read the skill's SKILL.md and then follow its instructions to accomplish the test prompt yourself inline. Do them one at a time.
2. **Present results** directly in the conversation — show the prompt and the output. If the output is a file, tell the user where it is and ask them to inspect it.
3. **Ask for feedback inline**: "How does this look? Anything you'd change?"
4. **Skip quantitative benchmarking** — it relies on baseline comparisons which aren't meaningful without subagents. Focus on qualitative feedback.

---

## Improving the skill

This is the heart of the loop. You've run the test cases, the user has reviewed the results, and now you need to make the skill better based on their feedback.

### How to think about improvements

1. **Generalize from the feedback.** We're trying to create skills that can be used many times across many different prompts. Rather than put in fiddly overfitty changes, try to understand what the user actually wants and transmit that understanding into the instructions. Try different metaphors or patterns if there's a stubborn issue.

2. **Keep the prompt lean.** Remove things that aren't pulling their weight. Read the transcripts — if the skill is making the agent waste time doing things that are unproductive, remove the parts causing that.

3. **Explain the why.** Try hard to explain the **why** behind everything you're asking the agent to do. If you find yourself writing ALWAYS or NEVER in all caps, that's a yellow flag — reframe and explain the reasoning instead.

4. **Look for repeated work.** If test runs all independently wrote similar helper scripts or took the same multi-step approach, that's a signal the skill should bundle that script in `scripts/`.

### The iteration loop

After improving the skill:

1. Apply your improvements to the skill
2. Rerun all test cases
3. Ask the user to review and give feedback
4. Read the feedback, improve again, repeat

Keep going until:
- The user says they're happy
- The feedback is all positive
- You're not making meaningful progress

---

## Description Optimization

The description field in SKILL.md frontmatter is the primary mechanism that determines whether the agent invokes a skill. After creating or improving a skill, offer to optimize the description.

### How to do it (no scripts)

1. Generate 10-15 trigger eval queries — a mix of should-trigger and should-not-trigger
2. For **should-trigger** (6-8): different phrasings of the same intent, some formal, some casual. Include cases where the user doesn't explicitly name the skill but clearly needs it.
3. For **should-not-trigger** (6-8): near-misses — queries that share keywords but actually need something different.
4. Review the set with the user: does this look right?
5. Propose a revised description and explain how it addresses the trigger cases
6. Update `SKILL.md` frontmatter with the improved description

### How skill triggering works

Skills appear in the agent's available skills list with their name + description. The agent decides whether to consult a skill based on that description. The agent only consults skills for tasks it can't easily handle on its own — complex, multi-step, or specialized queries reliably trigger skills when the description matches.

---

## Reference files

- `references/schemas.md` — JSON structures for evals.json, grading.json, etc.
- `agents/grader.md` — How to evaluate assertions against outputs (for inline grading)
- `agents/analyzer.md` — How to analyze benchmark results

---

After finishing a skill, package it by ensuring the directory structure is clean and the SKILL.md frontmatter is complete. Present the final file path to the user.

Good luck!
