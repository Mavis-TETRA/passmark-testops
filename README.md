# Passmark TestOps

<p>
  <img alt="Local AI" src="https://img.shields.io/badge/AI-Ollama%20local-111827?style=for-the-badge">
  <img alt="Automation" src="https://img.shields.io/badge/Automation-Playwright-2563eb?style=for-the-badge">
  <img alt="Database" src="https://img.shields.io/badge/Database-PostgreSQL-334155?style=for-the-badge">
  <img alt="QC Files" src="https://img.shields.io/badge/Export-CSV%20%7C%20Excel%20%7C%20Word-16a34a?style=for-the-badge">
</p>

**Local AI testcase generation and lightweight automation runner for QC teams.**

Passmark TestOps helps testers turn a natural-language testing request into a QC-ready testcase file, review it outside the app, import it back, run supported automation, capture screenshots, and export the final result bundle.

<table>
  <tr>
    <td><strong>Primary flow</strong></td>
    <td>AI testcase file first, automation second.</td>
  </tr>
  <tr>
    <td><strong>Best for</strong></td>
    <td>QC teams that want editable testcase artifacts before running automated checks.</td>
  </tr>
  <tr>
    <td><strong>Runtime</strong></td>
    <td>Docker Compose with PostgreSQL, Ollama, and the web app.</td>
  </tr>
</table>

## Choose Language

<p>
  <a href="./README.vi.md"><strong>Đọc bản tiếng Việt</strong></a>
  &nbsp;|&nbsp;
  <a href="./README.en.md"><strong>Read the English guide</strong></a>
</p>

## Product Flow

```mermaid
flowchart LR
  A["Describe what to test"] --> B["AI creates QC testcase file"]
  B --> C["Export CSV / Excel / Word"]
  C --> D["Tester reviews and edits"]
  D --> E["Import CSV"]
  E --> F["Run supported automation"]
  F --> G["Capture actual result and screenshots"]
  G --> H["Export final result files"]
```

## Interface Preview

```text
Passmark TestOps
├─ Project: Website QA
│  ├─ Homepage SEO review
│  ├─ Elder-user UI check
│  └─ Checkout regression
│
└─ Current item
   What do you want to test?
   [ https://example.com/                                ]
   [ Describe risks, modules, pages, roles, data...      ]
   [ Generate testcase file ]

   Run history
   - testcase file generated: 40 cases
   - auto test result: 38/40 passed, screenshots attached
```

> Markdown platforms usually block JavaScript-powered language switching inside README files, so this repository uses reliable language links instead.
