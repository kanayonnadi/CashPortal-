# Knowledge Documents

Drop CashPortal FAQ files in this folder as `.txt`, `.md`, or `.pdf`.

Examples:

- `cashportal-faq.md`
- `security-policy.md`
- `card-support.pdf`

The chatbot reads this folder when it starts. To reload documents without restarting, send the running process a SIGHUP signal:

```sh
kill -HUP <pid>
```

Large combined document content is trimmed according to `knowledge.max_chars` in `config.yaml`.

This `README.md` file is ignored by the knowledge loader.
