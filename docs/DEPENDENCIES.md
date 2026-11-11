# Dependency and originality notes

LinkLab business rules, SQL, interface, tests and documentation are original project code authored during this session. External documentation informed security and API choices. No URL-shortener repository or tutorial application was copied.

Framework infrastructure started from the supported Sites/Vinext scaffold. Standard packages provide React rendering, Next-compatible APIs, Cloudflare Worker tooling, Drizzle schema generation, Lucide icons, TypeScript, ESLint and Prettier. Their original licenses apply. The vendored Sites Vite integration retains its license in `scripts/vite/sites-vite-plugin.LICENSE`.

Unused generic UI components, chart libraries, form libraries, and their direct dependencies were removed. The framework was upgraded from the supplied beta to the registry's stable release. React/Next, Cloudflare tooling and related packages were upgraded after the initial audit found known advisories. Exact resolved versions and integrity hashes are in `package-lock.json`.

The initial full audit reported 33 findings (1 critical, 15 high, 16 moderate, 1 low) against the original scaffold dependency graph. The final audit result is recorded in `docs/evidence/VALIDATION.md` and its JSON evidence. An audit is a point-in-time registry advisory check, not proof that dependencies are free of vulnerabilities.

No external AI API is called by the application at runtime. The AI assistance is the engineering process and review evidence, as required by the assignment. No AI key is required to run the service.

Targeted transitive overrides are recorded in package.json: patched Sharp, minimatch (under the TypeScript ESLint parser), esbuild, and fflate. These replace advisory-affected versions without accepting the audit tool's proposed unrelated framework downgrades. Type checks, lint, schema generation, tests and the build were rerun against the resolved graph. Review and remove overrides when upstream dependency constraints catch up.
