from __future__ import annotations

import asyncio
import json
import math
import os
import random
import re
import sys
import time
import traceback
from dataclasses import dataclass, field
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from agents import Agent, ModelSettings, RunContextWrapper, Runner, flush_traces, function_tool, trace
from openai.types.shared import Reasoning
from pydantic import BaseModel, Field


AGENT_NAME = "Restaurant Finder"
DEFAULT_MODEL = os.getenv("OPENAI_MODEL", "gpt-5.4")
PORT = int(os.getenv("AGENT_SERVICE_PORT", "8787"))
GOOGLE_API_KEY_ENV_NAMES = ("GOOGLE_PLACES_API_KEY", "GOOGLE_PLACES_KEY", "GOOGLE_MAPS_KEY")


def _pick_google_api_key() -> str:
    for key_name in GOOGLE_API_KEY_ENV_NAMES:
        value = os.getenv(key_name, "").strip()
        if value:
            return value
    return ""


def _log(message: str) -> None:
    print(f"[restaurant-agent] {message}", flush=True)


def _json_response(url: str, params: dict[str, Any], timeout: int = 15) -> dict[str, Any]:
    query = urlencode({key: value for key, value in params.items() if value is not None})
    request = Request(f"{url}?{query}", headers={"User-Agent": "618FOOD.COM Restaurant Agent"})
    try:
        with urlopen(request, timeout=timeout) as response:
            payload = response.read().decode("utf-8")
            return json.loads(payload)
    except HTTPError as error:
        body = error.read().decode("utf-8", errors="ignore") if hasattr(error, "read") else ""
        raise RuntimeError(f"Google API HTTP {error.code}: {body or error.reason}") from error
    except URLError as error:
        raise RuntimeError(f"Google API network error: {error.reason}") from error


def _parse_lat_lng(value: str) -> tuple[float, float] | None:
    text = (value or "").strip()
    if not text:
      return None

    match = re.match(r"^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$", text)
    if not match:
        return None

    return float(match.group(1)), float(match.group(2))


def _geocode_location(api_key: str, location: str) -> dict[str, Any] | None:
    if not location.strip():
        return None

    lat_lng = _parse_lat_lng(location)
    if lat_lng:
        lat, lng = lat_lng
        return {"lat": lat, "lng": lng, "label": location.strip()}

    data = _json_response(
        "https://maps.googleapis.com/maps/api/geocode/json",
        {"address": location.strip(), "key": api_key},
    )

    if data.get("status") != "OK":
        return None

    first = (data.get("results") or [{}])[0]
    geometry = first.get("geometry", {})
    loc = geometry.get("location", {})
    if not isinstance(loc, dict) or "lat" not in loc or "lng" not in loc:
        return None

    return {
        "lat": float(loc["lat"]),
        "lng": float(loc["lng"]),
        "label": first.get("formatted_address") or location.strip(),
    }


def _maps_url(name: str, formatted_address: str | None = None, lat: float | None = None, lng: float | None = None) -> str:
    parts = [name or "", formatted_address or ""]
    query = " ".join(part for part in parts if part).strip()
    if lat is not None and lng is not None:
        query = query or f"{lat},{lng}"
    return f"https://www.google.com/maps/search/?api=1&query={urlencode({'q': query})[2:]}" if query else "https://www.google.com/maps"


def _safe_review_snippets(reviews: list[dict[str, Any]] | None) -> list[str]:
    snippets: list[str] = []
    for review in reviews or []:
        if not isinstance(review, dict):
            continue
        text = str(review.get("text") or "").strip()
        if text:
            snippets.append(text[:240])
        if len(snippets) >= 3:
            break
    return snippets


def _normalize_price_level(value: Any) -> int | None:
    try:
        number = int(value)
    except (TypeError, ValueError):
        return None
    return number if number >= 0 else None


def _normalize_search_query(query: str) -> str:
    text = re.sub(r"\s+", " ", (query or "").strip())
    if not text:
        return ""

    text = re.sub(r"^(show|find|give|tell|look for|search for|help me find)\s+", "", text, flags=re.I)
    text = re.sub(r"\b(me|us)\b\s+", "", text, flags=re.I)
    text = re.sub(r"\b(places?|spots?|restaurants?|restaurant|locations?)\b", "", text, flags=re.I)
    text = re.sub(r"\b(current|good|great|best|top|some)\b", "", text, flags=re.I)
    text = re.sub(r"\s+", " ", text).strip(" ,.-")
    return text


def _query_variants(query: str, location: str) -> list[str]:
    cleaned = _normalize_search_query(query)
    raw = re.sub(r"\s+", " ", (query or "").strip())
    variants: list[str] = []

    def add(item: str) -> None:
        normalized = re.sub(r"\s+", " ", item or "").strip()
        if normalized and normalized not in variants:
            variants.append(normalized)

    add(raw)
    add(cleaned)

    if cleaned:
        add(f"{cleaned} restaurants")
        if location.strip():
            add(f"{cleaned} near {location}".strip())
            add(f"best {cleaned} near {location}".strip())

    if raw and raw != cleaned:
        add(f"{raw} restaurants")

    return variants[:5] if variants else ["restaurants"]


class RestaurantCandidate(BaseModel):
    place_id: str
    name: str
    formatted_address: str | None = None
    rating: float | None = None
    review_count: int | None = None
    price_level: int | None = None
    summary: str = ""
    maps_url: str | None = None
    website: str | None = None
    phone: str | None = None


class RankedRestaurant(RestaurantCandidate):
    score: float


class RestaurantFinderResponse(BaseModel):
    reply: str
    restaurants: list[RankedRestaurant] = Field(default_factory=list)
    sources: list[dict[str, str]] = Field(default_factory=list)


@dataclass
class RestaurantAgentContext:
    google_places_api_key: str
    request_id: str
    logs: list[str] = field(default_factory=list)

    def log(self, message: str) -> None:
        line = f"[{self.request_id}] {message}"
        self.logs.append(line)
        _log(line)


def _build_search_summary(item: dict[str, Any]) -> str:
    rating = item.get("rating")
    review_count = item.get("review_count")
    price_level = item.get("price_level")
    parts: list[str] = []
    if isinstance(rating, (int, float)):
        parts.append(f"{rating:.1f} rating")
    if isinstance(review_count, int) and review_count >= 0:
        parts.append(f"{review_count} reviews")
    if isinstance(price_level, int):
        price_text = "$" * max(1, min(price_level, 4))
        parts.append(price_text)
    if not parts:
        parts.append("Verified Google Places listing")
    return ", ".join(parts)


def _extract_candidate(item: dict[str, Any]) -> dict[str, Any]:
    geometry = item.get("geometry") or {}
    location = geometry.get("location") or {}
    lat = location.get("lat")
    lng = location.get("lng")
    formatted_address = item.get("formatted_address") or ""
    name = item.get("name") or ""
    website = item.get("website") or None
    maps_url = item.get("url") or _maps_url(name, formatted_address, lat, lng)
    return {
        "place_id": str(item.get("place_id") or "").strip(),
        "name": str(name).strip(),
        "formatted_address": str(formatted_address).strip() or None,
        "rating": float(item["rating"]) if isinstance(item.get("rating"), (int, float)) else None,
        "review_count": int(item["user_ratings_total"]) if isinstance(item.get("user_ratings_total"), int) else None,
        "price_level": _normalize_price_level(item.get("price_level")),
        "summary": _build_search_summary(
            {
                "rating": item.get("rating"),
                "review_count": item.get("user_ratings_total"),
                "price_level": item.get("price_level"),
            }
        ),
        "maps_url": maps_url,
        "website": website,
        "phone": None,
    }


def _google_text_search(api_key: str, location: str, query: str) -> dict[str, Any]:
    search_query = query.strip()
    if location.strip():
        search_query = f"{search_query} in {location.strip()}"
    return _json_response(
        "https://maps.googleapis.com/maps/api/place/textsearch/json",
        {"query": search_query, "key": api_key},
    )


def _google_nearby_search(api_key: str, lat: float, lng: float, query: str, radius_meters: int = 32000) -> dict[str, Any]:
    params = {
        "location": f"{lat},{lng}",
        "radius": radius_meters,
        "keyword": query.strip(),
        "type": "restaurant",
        "key": api_key,
    }
    return _json_response("https://maps.googleapis.com/maps/api/place/nearbysearch/json", params)


@function_tool
async def search_places(ctx: RunContextWrapper[RestaurantAgentContext], location: str, query: str) -> dict[str, Any]:
    """Search Google Places for restaurant candidates in a location."""
    api_key = ctx.context.google_places_api_key
    location_text = (location or "").strip()
    query_text = (query or "").strip()
    ctx.context.log(f"tool search_places(location={location_text!r}, query={query_text!r})")

    if not api_key:
        return {"results": [], "warnings": ["Google Places API key is not configured."]}

    resolved = _geocode_location(api_key, location_text) if location_text else None
    warnings: list[str] = []
    candidates: list[dict[str, Any]] = []
    seen_place_ids: set[str] = set()
    search_terms = _query_variants(query_text or "restaurants", location_text or query_text or "Illinois")

    for term in search_terms:
        try:
            if resolved:
                data = await asyncio.to_thread(
                    _google_nearby_search,
                    api_key,
                    float(resolved["lat"]),
                    float(resolved["lng"]),
                    term,
                )
            else:
                data = await asyncio.to_thread(_google_text_search, api_key, location_text, term)
        except Exception as error:
            message = str(error)
            warnings.append(message)
            ctx.context.log(f"search_places error for term={term!r}: {message}")
            continue

        status = data.get("status")
        if status not in {"OK", "ZERO_RESULTS"}:
            message = data.get("error_message") or f"Google Places search returned {status or 'UNKNOWN'}"
            warnings.append(message)
            ctx.context.log(f"search_places status={status!r} term={term!r} message={message!r}")
            continue

        for item in (data.get("results") or [])[:12]:
            if not isinstance(item, dict):
                continue
            candidate = _extract_candidate(item)
            place_id = candidate["place_id"]
            if place_id and candidate["name"] and place_id not in seen_place_ids:
                seen_place_ids.add(place_id)
                candidates.append(candidate)
            if len(candidates) >= 20:
                break
        if len(candidates) >= 20:
            break

    ctx.context.log(f"search_places returned {len(candidates)} candidates")
    return {
        "location": resolved["label"] if resolved else location_text,
        "query": query_text,
        "results": candidates,
        "warnings": warnings,
    }


@function_tool
async def get_place_details(ctx: RunContextWrapper[RestaurantAgentContext], place_id: str) -> dict[str, Any]:
    """Fetch detailed Google Places data for a restaurant candidate."""
    api_key = ctx.context.google_places_api_key
    place_id_text = (place_id or "").strip()
    ctx.context.log(f"tool get_place_details(place_id={place_id_text!r})")

    if not api_key:
        return {"place_id": place_id_text, "error": "Google Places API key is not configured."}

    try:
        data = await asyncio.to_thread(
            _json_response,
            "https://maps.googleapis.com/maps/api/place/details/json",
            {
                "place_id": place_id_text,
                "fields": ",".join(
                    [
                        "place_id",
                        "name",
                        "rating",
                        "user_ratings_total",
                        "price_level",
                        "formatted_address",
                        "formatted_phone_number",
                        "website",
                        "opening_hours",
                        "geometry",
                        "types",
                        "business_status",
                        "url",
                        "reviews",
                    ]
                ),
                "key": api_key,
            },
        )
    except Exception as error:
        ctx.context.log(f"get_place_details error: {error}")
        return {"place_id": place_id_text, "error": str(error)}

    status = data.get("status")
    if status != "OK":
        message = data.get("error_message") or f"Google Place Details returned {status or 'UNKNOWN'}"
        ctx.context.log(f"get_place_details status={status!r} message={message!r}")
        return {"place_id": place_id_text, "error": message}

    result = data.get("result") or {}
    geometry = result.get("geometry") or {}
    location = geometry.get("location") or {}
    reviews = _safe_review_snippets(result.get("reviews"))
    detail = {
        "place_id": str(result.get("place_id") or place_id_text).strip(),
        "name": str(result.get("name") or "").strip(),
        "formatted_address": str(result.get("formatted_address") or "").strip() or None,
        "rating": float(result["rating"]) if isinstance(result.get("rating"), (int, float)) else None,
        "review_count": int(result["user_ratings_total"]) if isinstance(result.get("user_ratings_total"), int) else None,
        "price_level": _normalize_price_level(result.get("price_level")),
        "phone": str(result.get("formatted_phone_number") or "").strip() or None,
        "website": str(result.get("website") or "").strip() or None,
        "maps_url": str(result.get("url") or "").strip() or None,
        "business_status": str(result.get("business_status") or "").strip() or None,
        "categories": [str(item).strip() for item in (result.get("types") or []) if str(item).strip()][:8],
        "open_now": bool(result.get("opening_hours", {}).get("open_now")) if isinstance(result.get("opening_hours"), dict) else None,
        "coordinates": {
            "lat": location.get("lat"),
            "lng": location.get("lng"),
        }
        if isinstance(location, dict) and location.get("lat") is not None and location.get("lng") is not None
        else None,
        "reviews": reviews,
    }
    ctx.context.log(f"get_place_details returned detail for {detail['name']!r}")
    return detail


@function_tool
def rank_restaurants(ctx: RunContextWrapper[RestaurantAgentContext], restaurants: list[dict[str, Any]]) -> dict[str, Any]:
    """Rank verified restaurant candidates using rating and review volume."""
    ctx.context.log(f"tool rank_restaurants(count={len(restaurants)})")

    ranked: list[dict[str, Any]] = []
    for restaurant in restaurants or []:
        if not isinstance(restaurant, dict):
            continue
        rating = restaurant.get("rating")
        review_count = restaurant.get("review_count")
        score = 0.0
        if isinstance(rating, (int, float)):
            score += float(rating) * 0.7
        if isinstance(review_count, int) and review_count > 0:
            score += math.log(review_count) * 0.3

        summary_bits = []
        if isinstance(rating, (int, float)):
            summary_bits.append(f"{float(rating):.1f} rating")
        if isinstance(review_count, int):
            summary_bits.append(f"{review_count} reviews")
        if isinstance(restaurant.get("price_level"), int):
            summary_bits.append("$" * max(1, min(int(restaurant["price_level"]), 4)))
        if restaurant.get("website"):
            summary_bits.append("website verified")
        if not summary_bits:
            summary_bits.append("Verified via Google Places")

        ranked.append(
            {
                "place_id": str(restaurant.get("place_id") or "").strip(),
                "name": str(restaurant.get("name") or "").strip(),
                "rating": rating if isinstance(rating, (int, float)) else None,
                "review_count": review_count if isinstance(review_count, int) else None,
                "score": round(score, 4),
                "summary": ", ".join(summary_bits),
                "formatted_address": restaurant.get("formatted_address"),
                "phone": restaurant.get("phone"),
                "website": restaurant.get("website"),
                "maps_url": restaurant.get("maps_url"),
            }
        )

    ranked.sort(key=lambda item: item["score"], reverse=True)
    top_five = ranked[:5]
    ctx.context.log(f"rank_restaurants selected {len(top_five)} top options")

    return {
        "restaurants": top_five,
        "summary": "Ranked the verified restaurants using rating and review volume.",
    }


def _build_agent() -> Agent[RestaurantAgentContext]:
    instructions = (
        "You are Restaurant Finder, a tool-using restaurant agent for 618FOOD.COM.\n"
        "You MUST use tools to obtain real restaurant data and MUST NOT invent restaurant names, ratings, reviews, hours, or prices.\n"
        "For restaurant search requests, always start with search_places, then call get_place_details for the strongest candidates, then call rank_restaurants on the verified restaurant objects.\n"
        "If the first search is thin, call search_places again with a tighter cuisine query or a nearby Illinois town before answering.\n"
        "If the user mentions a town without a state, assume Illinois unless they specify otherwise.\n"
        "If the user asks for something unrelated to restaurants, briefly steer them back to a restaurant or food request instead of guessing.\n"
        "Use the tool results only. Do not fabricate data.\n"
        "Your final output must populate the schema exactly and keep the reply concise and helpful."
    )

    return Agent[RestaurantAgentContext](
        name=AGENT_NAME,
        instructions=instructions,
        model=DEFAULT_MODEL,
        tools=[search_places, get_place_details, rank_restaurants],
        output_type=RestaurantFinderResponse,  # type: ignore[arg-type]
        model_settings=ModelSettings(
            tool_choice="required",
            reasoning=Reasoning(effort="low"),
            temperature=0,
            max_tokens=1200,
            parallel_tool_calls=False,
        ),
    )


AGENT = _build_agent()


def _normalize_history(history: Any) -> list[dict[str, str]]:
    if not isinstance(history, list):
        return []
    turns = []
    for turn in history:
        if not isinstance(turn, dict):
            continue
        role = "assistant" if turn.get("role") == "assistant" else "user"
        content = str(turn.get("content") or "").strip()
        if content:
            turns.append({"role": role, "content": content})
    return turns


def _build_agent_input(message: str, history: list[dict[str, str]], page_context: Any) -> str:
    lines = []
    if isinstance(page_context, dict):
        brand = str(page_context.get("brand") or "").strip()
        page_title = str(page_context.get("pageTitle") or "").strip()
        page_summary = str(page_context.get("pageSummary") or "").strip()
        if brand or page_title or page_summary:
            lines.append(
                "Context:\n"
                + "\n".join(
                    part
                    for part in [
                        f"Brand: {brand}" if brand else "",
                        f"Page title: {page_title}" if page_title else "",
                        f"Page summary: {page_summary}" if page_summary else "",
                    ]
                    if part
                )
            )

    if history:
        transcript_lines = []
        for turn in history:
            speaker = "Assistant" if turn["role"] == "assistant" else "User"
            transcript_lines.append(f"{speaker}: {turn['content']}")
        lines.append("\n".join(transcript_lines))

    lines.append(f"User: {message.strip()}")
    return "\n\n".join(lines)


async def _run_agent(payload: dict[str, Any]) -> dict[str, Any]:
    message = str(payload.get("message") or "").strip()
    history = _normalize_history(payload.get("history"))
    page_context = payload.get("pageContext") if isinstance(payload.get("pageContext"), dict) else {}
    request_id = str(payload.get("requestId") or f"req_{int(time.time() * 1000)}_{random.randint(1000, 9999)}")
    google_key = _pick_google_api_key()

    if not message:
        return {
            "reply": "Please send a restaurant question with a town, ZIP, or cuisine.",
            "restaurants": [],
            "sources": [],
            "requestId": request_id,
        }

    if not google_key:
        return {
            "reply": "The restaurant agent is online, but Google Places credentials are missing on the server.",
            "restaurants": [],
            "sources": [],
            "requestId": request_id,
        }

    context = RestaurantAgentContext(google_places_api_key=google_key, request_id=request_id)
    agent_input = _build_agent_input(message, history, page_context)

    with trace("Restaurant Finder", group_id=request_id, metadata={"message": message[:200]}):
        try:
            result = await Runner.run(
                AGENT,
                agent_input,
                context=context,
                max_turns=8,
            )
        finally:
            flush_traces()

    final_output = result.final_output
    if isinstance(final_output, RestaurantFinderResponse):
        output = final_output
    elif isinstance(final_output, dict):
        output = RestaurantFinderResponse.model_validate(final_output)
    else:
        output = RestaurantFinderResponse(reply=str(final_output or ""), restaurants=[], sources=[])

    restaurants = output.restaurants[:5]
    sources = output.sources[:5]

    if not sources:
        for restaurant in restaurants:
            if restaurant.website:
                sources.append({"title": restaurant.name, "url": restaurant.website})
            elif restaurant.maps_url:
                sources.append({"title": restaurant.name, "url": restaurant.maps_url})

    context.log(f"agent final reply length={len(output.reply.strip())} restaurants={len(restaurants)} sources={len(sources)}")

    return {
        "reply": output.reply.strip() or "Here are the best verified restaurants I found.",
        "restaurants": [restaurant.model_dump() for restaurant in restaurants],
        "sources": sources[:5],
        "requestId": request_id,
    }


class AgentHTTPRequestHandler(BaseHTTPRequestHandler):
    def _send_json(self, status_code: int, payload: dict[str, Any]) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:  # noqa: N802
        if self.path == "/health":
            self._send_json(200, {"ok": True})
            return
        self._send_json(404, {"error": "Not found"})

    def do_POST(self) -> None:  # noqa: N802
        if self.path != "/chat":
            self._send_json(404, {"error": "Not found"})
            return

        try:
            length = int(self.headers.get("Content-Length") or "0")
            raw_body = self.rfile.read(length).decode("utf-8") if length > 0 else "{}"
            payload = json.loads(raw_body or "{}")
        except Exception as error:
            self._send_json(400, {"error": f"Invalid JSON body: {error}"})
            return

        try:
            response = asyncio.run(_run_agent(payload))
            self._send_json(200, response)
        except Exception as error:
            _log(f"agent run failed: {error}")
            traceback_text = "".join(traceback.format_exception(error))
            _log(traceback_text)
            self._send_json(
                500,
                {
                    "error": "Unable to complete restaurant agent run.",
                    "details": str(error),
                },
            )

    def log_message(self, format: str, *args: Any) -> None:  # noqa: A003
        _log(format % args)


def main() -> None:
    server = ThreadingHTTPServer(("127.0.0.1", PORT), AgentHTTPRequestHandler)
    _log(f"Restaurant agent service listening on http://127.0.0.1:{PORT}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
