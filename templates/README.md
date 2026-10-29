# Templates

| File | Role |
| --- | --- |
| `needs-statement-template.md` | The questionnaire sent to the project team. The input to the skill. |
| `requirement-specification-template.md` | The shape of the `/needs-to-requirements` output, and also offered in the app so a specification can be drafted or refined by hand. |
| `requirements.md` | The single combined questionnaire the pair above replaced. `hidden: true`, kept so drafts started before the split still open. |

A file with `hidden: true` stays in this folder and is still served, but is left out of
`index.json` and so never appears on the start page.

After adding or editing a file, run `node scripts/build-template-index.mjs` (the deploy workflow
does this automatically).

See "Writing templates" and "From needs to requirements" in the main README for the conventions.
