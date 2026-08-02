import argparse
import json
import sys
import time
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


def main() -> int:
    parser = argparse.ArgumentParser(description="Smoke-test the Research Agent API.")
    parser.add_argument("--api-url", default="http://localhost:8000", help="Base API URL, for example https://api.example.com")
    parser.add_argument("--token", default="", help="Optional Clerk bearer token for protected deployments")
    parser.add_argument("--skip-flow", action="store_true", help="Only check health and auth")
    parser.add_argument("--timeout", type=float, default=15.0)
    args = parser.parse_args()

    runner = SmokeRunner(api_url=args.api_url, token=args.token, timeout=args.timeout)
    runner.check_health()
    runner.check_auth_me()
    if not args.skip_flow:
        runner.check_research_flow()
    runner.summary()
    return 0 if not runner.failures else 1


class SmokeRunner:
    def __init__(self, api_url: str, token: str, timeout: float) -> None:
        self.api_url = api_url.rstrip("/")
        self.token = token.strip()
        self.timeout = timeout
        self.failures: list[str] = []
        self.warnings: list[str] = []

    def _headers(self) -> dict[str, str]:
        headers = {"X-Request-ID": f"smoke-{int(time.time())}"}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        return headers

    def check_health(self) -> None:
        payload = self._get_json("/v1/health", expected=(200,), label="health")
        if not payload:
            return
        self._ok(f"health ok: environment={payload.get('environment')} queue={payload.get('job_queue_backend')}")
        if payload.get("auth_required") and not self.token:
            self._warn("auth is required but no token was provided; protected smoke checks will fail or be skipped")

    def check_auth_me(self) -> None:
        payload = self._get_json("/v1/auth/me", expected=(200, 401), label="auth")
        if not payload:
            return
        if "user" in payload:
            self._ok("auth ok")
            return
        self._warn("auth check did not return a user; provide --token for production smoke tests")

    def check_research_flow(self) -> None:
        created = self._post_json(
            "/v1/jobs",
            {
                "query": "Smoke test: summarize the production readiness of this research agent.",
                "locale": "en-US",
                "trusted_sources": [],
                "output_format": "markdown",
                "max_spend": {"amount": "1.00", "asset": "USDC", "network": "base-sepolia"},
                "require_citations": True,
                "template": "smoke_test",
            },
            expected=(201,),
            label="create job",
        )
        if not created:
            return

        job = created.get("job") or {}
        job_id = job.get("id")
        if not job_id:
            self._fail("create job: response missing job.id")
            return
        self._ok("job created")

        run_payload = self._post_json(f"/v1/jobs/{job_id}/run", {}, expected=(200,), label="run job")
        if not run_payload:
            return

        run_job = run_payload.get("job") or {}
        report = run_payload.get("report")
        self._ok(f"job run accepted: status={run_job.get('status')}")

        detail = self._get_json(f"/v1/jobs/{job_id}", expected=(200,), label="job detail")
        if not detail:
            return

        detail_job = detail.get("job") or {}
        report_id = detail_job.get("report_id")
        if not report_id and report:
            report_id = report.get("id")

        if report_id:
            report_payload = self._get_json(f"/v1/reports/{report_id}", expected=(200,), label="report")
            if report_payload:
                self._ok("report fetched")
        else:
            self._warn("job has no report yet; this is expected when JOB_QUEUE_BACKEND=upstash and the worker has not processed it")

    def _get_json(self, path: str, expected: tuple[int, ...], label: str) -> dict[str, Any] | None:
        return self._request_json("GET", path, None, expected, label)

    def _post_json(self, path: str, payload: dict[str, Any], expected: tuple[int, ...], label: str) -> dict[str, Any] | None:
        return self._request_json("POST", path, payload, expected, label)

    def _request_json(
        self,
        method: str,
        path: str,
        payload: dict[str, Any] | None,
        expected: tuple[int, ...],
        label: str,
    ) -> dict[str, Any] | None:
        body = json.dumps(payload).encode("utf-8") if payload is not None else None
        headers = self._headers()
        if body is not None:
            headers["Content-Type"] = "application/json"
        request = Request(f"{self.api_url}{path}", data=body, headers=headers, method=method)

        try:
            with urlopen(request, timeout=self.timeout) as response:
                status_code = response.status
                response_body = response.read().decode("utf-8")
                request_id = response.headers.get("x-request-id")
        except HTTPError as exc:
            status_code = exc.code
            response_body = exc.read().decode("utf-8", errors="replace")
            request_id = exc.headers.get("x-request-id")
        except URLError as exc:
            self._fail(f"{label}: request failed: {exc}")
            return None

        if status_code not in expected:
            self._fail(f"{label}: expected {expected}, got {status_code}, request_id={request_id}, body={response_body[:300]}")
            return None

        if request_id:
            self._ok(f"{label}: request_id={request_id}")

        try:
            return json.loads(response_body)
        except ValueError:
            self._fail(f"{label}: response was not JSON")
            return None

    def _ok(self, message: str) -> None:
        print(f"[ok] {message}")

    def _warn(self, message: str) -> None:
        self.warnings.append(message)
        print(f"[warn] {message}")

    def _fail(self, message: str) -> None:
        self.failures.append(message)
        print(f"[fail] {message}")

    def summary(self) -> None:
        print()
        print(f"Smoke test complete: {len(self.failures)} failure(s), {len(self.warnings)} warning(s)")
        if self.failures:
            print("Failures:")
            for failure in self.failures:
                print(f"- {failure}")


if __name__ == "__main__":
    raise SystemExit(main())
