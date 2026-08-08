# Task Graph

```mermaid
flowchart TD
  A["Repository and prompt baseline"] --> B["Architecture and critical path audit"]
  B --> C["Runtime doctor"]
  B --> D["Readiness endpoint"]
  B --> E["Provider write emergency stop"]
  E --> F["Denial audit evidence"]
  C --> G["Redacted support bundle"]
  C --> H["Operator runbook"]
  D --> H
  F --> H
  B --> I["UI and API audits"]
  B --> J["Security and acceptance matrix"]
  G --> K["Automated tests"]
  D --> K
  F --> K
  I --> L["Completion matrix"]
  J --> L
  K --> M["Full regression and security audit"]
  M --> N["Windows installer build"]
  M --> O["Fresh-clone verification"]
  N --> P["Commit and push"]
  O --> P
  P --> Q["External live-provider acceptance"]
  Q --> R["Signed canary release and rollback proof"]
```

External account authorization, production infrastructure, code-signing keys, and provider consent cannot be fabricated by repository code. They remain explicit successors to the pushed implementation.
