# OWASP Risk Categories — Skill Security Analyzer

Maps each finding category to the OWASP Top 10 (2021) and to skill-specific threat models.

---

## Category Taxonomy

| Category ID | Label | OWASP Mapping | Description |
|-------------|-------|---------------|-------------|
| `A01` | Broken Access Control | A01:2021 | Skill attempts to read/write files or directories outside the workspace, escalate permissions, or access protected system resources |
| `A02` | Cryptographic Failure | A02:2021 | Hardcoded secrets, API keys, tokens, or passwords embedded in skill files; insecure handling of credentials |
| `A03` | Injection | A03:2021 | **Prompt injection** (instructions that override the model's safety rules or persona); **command injection** in scripts (`os.system`, `eval`, `exec`, `subprocess` with unsanitized input); **SQL injection** |
| `A04` | Insecure Design | A04:2021 | Skill architecture that inherently enables misuse: no input validation, unrestricted file access patterns, no sandboxing of executed code |
| `A05` | Security Misconfiguration | A05:2021 | Overly broad tool permissions, debug flags left on, verbose error messages exposing internals, unnecessary capabilities requested |
| `A06` | Vulnerable Components | A06:2021 | Dependencies with known CVEs; unpinned package versions; typosquatted package names (e.g., `reqeusts` instead of `requests`) |
| `A07` | Auth Failure | A07:2021 | Skill bypasses or weakens authentication; stores credentials insecurely; impersonates the user or another agent |
| `A08` | Integrity Failure | A08:2021 | Scripts downloaded from remote URLs without checksum verification; auto-update mechanisms; tampered manifests |
| `A09` | Logging Failure | A09:2021 | Skill suppresses audit logs, clears history, or exfiltrates logs to external endpoints |
| `A10` | SSRF | A10:2021 | Skill fetches external URLs, calls external APIs, or resolves hostnames as part of its workflow — especially if the URL is derived from user input or file content |
| `SK01` | Prompt Injection | Skill-specific | Instructions embedded in SKILL.md or reference files designed to override model behavior, impersonate system prompts, or inject malicious context into the conversation |
| `SK02` | Role Hijacking | Skill-specific | Instructions that attempt to redefine the agent's identity, disable safety guardrails, or claim special elevated permissions ("you are now DAN", "ignore previous instructions") |
| `SK03` | Data Exfiltration | Skill-specific | Skill reads workspace files, environment variables, or system information and transmits or logs them to external destinations |
| `SK04` | Supply Chain Risk | Skill-specific | Skill fetches dependencies at runtime, installs packages, or references third-party scripts from unverified sources |
| `SK05` | Obfuscation | Skill-specific | Code or instructions deliberately obfuscated (base64, ROT13, hex encoding, minification) to disguise malicious intent |
| `SK06` | Social Engineering | Skill-specific | Instructions designed to manipulate the user into revealing credentials, granting permissions, or taking actions outside the skill's stated purpose |
| `SK07` | Scope Creep | Skill-specific | Skill description or instructions claim a benign purpose but contain code or instructions that perform unrelated, potentially harmful actions |

---

## Risk Combinations (Escalation Rules)

When multiple categories are present together, escalate the combined severity:

| Combination | Escalation |
|-------------|-----------|
| `A03 (Injection)` + `A10 (SSRF)` | → **Critical**: exfiltration via injected network call |
| `SK01 (Prompt Injection)` + `SK02 (Role Hijacking)` | → **Critical**: full safety bypass |
| `SK03 (Data Exfiltration)` + `A02 (Credentials)` | → **Critical**: credential theft |
| `SK05 (Obfuscation)` + any other | → escalate by one level |
| `A06 (Vulnerable Components)` + active exploitation PoC exists | → **High** minimum |
