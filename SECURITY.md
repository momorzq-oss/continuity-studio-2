# Security policy

## Supported version

Security fixes are applied to the current `main` branch.

## Reporting a vulnerability

Please do not open a public issue for a suspected vulnerability. Use the repository's **Security** tab and choose **Report a vulnerability** to submit a private GitHub Security Advisory.

Include the affected route or component, reproduction steps, impact, and any suggested mitigation. Do not include real API keys, private media, exported projects, or personal production data.

## Security model

- The local Codex bridge binds to loopback and accepts only configured local origins.
- The local AI runtime manager and managed ComfyUI server bind to loopback; cross-origin requests are restricted to configured local Studio origins.
- Runtime component operations accept only registry IDs and fixed actions. Repository URLs, commits, filesystem roots, node IDs, and shell commands cannot be supplied by browser requests.
- Studio only stops the ComfyUI process it started. It will not terminate an independently managed engine.
- Workflow requests use registered semantic bindings and live node-schema validation. Unknown bindings and model/mode contradictions block submission.
- Reference staging accepts only the same project's localhost Studio file endpoint or a completed output already owned by that runtime/project. Remote URLs, redirects, arbitrary filesystem paths, non-image `LoadImage` inputs, and oversized reference payloads are rejected.
- Runtime output URLs are read-only, loopback-only, and resolve only completed known-job outputs; the browser cannot request an arbitrary ComfyUI filename.
- Models and third-party custom nodes remain external to the MIT application core and keep their upstream licenses.
- Codex reasoning runs in a read-only sandbox and cannot mutate project state directly.
- OpenAI API keys remain in ignored server-side environment files or hosted secrets.
- Project exports exclude API keys.
- Paid generation requires explicit user intent.
- Local generation also requires explicit user intent and a passing runtime preflight; a prepared prompt never implies a generated result.
- D1 stores structured project state; R2 stores media using project-isolated keys.
