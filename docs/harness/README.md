# MindSpace Harness

The Harness turns product intent into an engineering process that is readable by humans and coding agents, and verifiable by tools.

| Concern | Authority |
| --- | --- |
| Full product vision | `requirement.md` |
| Current delivery boundary | `product-scope.md` |
| System shape and dependencies | `architecture.md` |
| Coding constraints | `engineering-rules.md` |
| Task lifecycle | `workflow.md` |
| Verification strategy | `testing.md` |
| Security and AI controls | `security-and-ai-safety.md` |
| Completion gate | `definition-of-done.md` |
| Important trade-offs | `decisions/` |

```text
Requirement -> Scope -> Plan -> Implement -> Validate -> Review
                    ^                         |
                    +-------- Fix <-----------+
```

The Harness evolves when a recurring failure reveals a missing rule or check. Prefer an executable check over prose when a rule can be enforced reliably.

Product changes update `requirement.md`; architecture changes require a decision record; phase promotion updates the config, scope, test gates, and Definition of Done together.

```bash
node scripts/validate-harness.mjs
```
