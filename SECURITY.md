# Security policy

## Supported version

Security fixes are applied to the current `main` branch.

## Reporting a vulnerability

Please do not open a public issue for a suspected vulnerability. Use the repository's **Security** tab and choose **Report a vulnerability** to submit a private GitHub Security Advisory.

Include the affected route or component, reproduction steps, impact, and any suggested mitigation. Do not include real API keys, private media, exported projects, or personal production data.

## Security model

- The local Codex bridge binds to loopback and accepts only configured local origins.
- Codex reasoning runs in a read-only sandbox and cannot mutate project state directly.
- OpenAI API keys remain in ignored server-side environment files or hosted secrets.
- Project exports exclude API keys.
- Paid generation requires explicit user intent.
- D1 stores structured project state; R2 stores media using project-isolated keys.
