import { mkdtempSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function findPythonCommand(): string | null {
  for (const candidate of ["python3", "python"]) {
    if (spawnSync(candidate, ["--version"], { encoding: "utf8" }).status === 0) return candidate;
  }
  return null;
}

describe("launch readiness CLI", () => {
  it("checks health, security headers, SEO, manifest, and canonical launch pages", () => {
    const script = readFileSync("scripts/check_launch_readiness.py", "utf8");

    expect(script).toContain("/api/health");
    expect(script).toContain("validate_security_headers");
    expect(script).toContain("x-content-type-options");
    expect(script).toContain("strict-transport-security");
    expect(script).toContain("permissions-policy");
    expect(script).toContain("/robots.txt");
    expect(script).toContain("/sitemap.xml");
    expect(script).toContain("/manifest.webmanifest");
    expect(script).toContain("/players/luka-doncic");
    expect(script).toContain("/teams/los-angeles-lakers");
    expect(script).toContain('type="application/ld+json"');
    expect(script).toContain('"@type":"SearchAction"');
    expect(script).toContain("--require-custom-domain");
  });

  const pythonCommand = findPythonCommand();
  const runIfPython = pythonCommand ? it : it.skip;

  runIfPython("is valid Python", () => {
    const pycacheDirectory = mkdtempSync(join(tmpdir(), "basketball-savant-pycache-"));
    const result = spawnSync(pythonCommand!, ["-m", "py_compile", "scripts/check_launch_readiness.py"], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PYTHONPYCACHEPREFIX: pycacheDirectory,
      },
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
  });
});
