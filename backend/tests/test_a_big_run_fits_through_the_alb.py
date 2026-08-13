"""A run's answer has to fit through the ALB, and a long list did not.

In production the app is a Lambda behind an ALB, and an ALB refuses any Lambda
response over 1 MB. It does not fail the invocation: the function returns, logs
a clean END, and the ALB turns the answer into a bare 502. Nothing in the app
can see that happen.

Measured on an automation that reads the YC directory's 622 companies and emails
the list. `/internal/run-workflow` returns the collection four times over — the
read step's output, `readCache`, `writePreviews`, `outputs` — which at 622 rows
is about 1.29 MB. At 40 rows the same automation returned 58 KB and worked, so
the ceiling is only reachable once someone's list gets long, which is exactly
when the automation is worth having. The platform showed "Request failed with
status code 502" and marked BOTH steps DIDN'T RUN, while the read had run for
thirty seconds and succeeded.

These pin the two things the fix rests on:

  1. the response is actually compressed, and a realistic run fits with room to
     spare rather than merely squeaking under, and
  2. Mangum base64-encodes a gzip body instead of mangling it — the one step
     that could quietly be wrong, because Mangum tries `body.decode()` first for
     an application/json content-type.
"""

from __future__ import annotations

import base64
import gzip
import json

import pytest
from fastapi import FastAPI
from fastapi.middleware.gzip import GZipMiddleware

mangum = pytest.importorskip("mangum")

#: What an ALB will accept from a Lambda target. Not ours to raise.
ALB_LIMIT_BYTES = 1024 * 1024


def _yc_sized_run_response() -> dict:
    """The real shape, at the real size: 622 rows carried four times over.

    Both the widths and the shape come from the measured run, because the size
    is the whole point and a tidier stand-in lands under the limit. A read's
    result carries the collection three ways at once — `rows` (the row text),
    `records` (that text again, plus the row's link), and `links` — and the
    extractor writes the link under BOTH `url` and `link` on purpose, so a
    reference to either spelling resolves. Row text averages ~113 characters and
    a company URL ~45; the whole read step measured 684 bytes per row and the
    stored run 1,456.
    """
    rows = []
    texts = []
    links = []
    for i in range(622):
        link = f"https://www.ycombinator.com/companies/company-number-{i:04d}"
        text = (
            f"Company Number {i:04d} San Francisco, CA, USA "
            f"Building the infrastructure layer for something specific "
            f"and plausible FALL 2025 B2B ENGINEERING, PRODUCT AND DESIGN"
        )
        rows.append({"text": text, "url": link, "link": link})
        texts.append(text)
        links.append(link)
    read_output = {
        "result": {
            "rows": texts,
            "records": rows,
            "links": links,
            "fields": ["text", "url", "link"],
        }
    }
    return {
        "workflowId": "yc-weekly",
        "status": "success",
        "outputs": {"report": {"rows": rows}},
        "error": None,
        "readCache": {"n1": read_output},
        "writePreviews": [
            {"id": "n2", "tool": "gmail.send", "input": {"report": {"rows": rows}}}
        ],
        "anomalies": [],
        "steps": [
            {"id": "n1", "status": "success", "output": read_output, "error": None},
            {
                "id": "n2",
                "status": "previewed",
                "output": {"report": {"rows": rows}},
                "error": None,
            },
        ],
    }


def _alb_event(path: str, accept_encoding: str | None) -> dict:
    headers = {"host": "app.example.com"}
    if accept_encoding is not None:
        headers["accept-encoding"] = accept_encoding
    return {
        "requestContext": {"elb": {"targetGroupArn": "arn:aws:elasticloadbalancing:x"}},
        "httpMethod": "GET",
        "path": path,
        "queryStringParameters": {},
        "headers": headers,
        "body": "",
        "isBase64Encoded": False,
    }


def _app() -> FastAPI:
    """A stand-in for the real app carrying the SAME middleware line as main.py."""
    app = FastAPI()
    app.add_middleware(GZipMiddleware, minimum_size=1024, compresslevel=6)

    @app.get("/internal/run-workflow")
    def run_workflow() -> dict:
        return _yc_sized_run_response()

    @app.get("/tiny")
    def tiny() -> dict:
        return {"ok": True}

    return app


def _invoke(path: str = "/internal/run-workflow", accept: str | None = "gzip") -> dict:
    handler = mangum.Mangum(_app(), lifespan="off")
    return handler(_alb_event(path, accept), None)


def test_the_payload_that_broke_it_really_is_over_the_limit():
    # If this ever stops being true the rest of the file is testing nothing, so
    # state the premise rather than trusting the memory of one investigation.
    raw = json.dumps(_yc_sized_run_response()).encode()

    assert len(raw) > ALB_LIMIT_BYTES, (
        f"the uncompressed run response is {len(raw)} bytes, which no longer "
        "exceeds the ALB's 1 MB ceiling — re-derive this fixture from a real read"
    )


def test_a_622_row_run_now_fits_with_room_to_spare():
    body = _invoke()["body"]

    # Base64 is what actually crosses the wire, so measure THAT, not the gzip
    # stream inside it: the encoding adds a third back on and a fix that fits
    # only before encoding does not fit.
    assert len(body.encode()) < ALB_LIMIT_BYTES
    # Not merely under. The next person's list is longer than this one, and a
    # fix that lands at 0.99 MB is a fix that expires without warning.
    assert len(body.encode()) < ALB_LIMIT_BYTES // 4


def test_mangum_base64s_the_gzip_body_instead_of_mangling_it():
    # THE STEP THAT COULD QUIETLY BE WRONG. Mangum treats application/json as
    # text and tries `body.decode()` before it considers base64. That decode
    # raises on a gzip stream — \x1f\x8b is a continuation byte with no lead
    # byte — so the base64 path is taken by construction. If a future Mangum
    # decides differently, the body arrives corrupt rather than merely large.
    res = _invoke()

    assert res["isBase64Encoded"] is True
    headers = {k.lower(): v for k, v in res["headers"].items()}
    assert headers.get("content-encoding") == "gzip"

    decoded = json.loads(gzip.decompress(base64.b64decode(res["body"])))
    assert decoded["status"] == "success"
    assert len(decoded["steps"][0]["output"]["result"]["records"]) == 622
    assert [s["id"] for s in decoded["steps"]] == ["n1", "n2"]


def test_a_caller_that_cannot_gunzip_still_gets_its_answer():
    # The platform's caller sends Accept-Encoding by default, but the widget,
    # the health check and anything hand-rolled may not. Compression must be a
    # negotiation, never a requirement.
    res = _invoke(accept=None)

    assert res["isBase64Encoded"] is False
    headers = {k.lower(): v for k, v in res["headers"].items()}
    assert "content-encoding" not in headers
    assert json.loads(res["body"])["status"] == "success"


def test_small_answers_are_left_alone():
    # A widget read is a few hundred bytes; compressing it spends CPU to make it
    # bigger. minimum_size is why the fix is invisible everywhere but here.
    res = _invoke(path="/tiny")

    assert res["isBase64Encoded"] is False
    assert json.loads(res["body"]) == {"ok": True}
