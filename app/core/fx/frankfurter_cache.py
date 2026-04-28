"""USD-based FX quotes from Frankfurter (no API key), with in-process hourly cache."""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any

import aiohttp

from app.core.utils.time import utcnow

logger = logging.getLogger(__name__)

_FRANKFURTER_BASE = "https://api.frankfurter.dev/v2/rates"
_DEFAULT_QUOTES = (
    "EUR,GBP,JPY,KRW,CAD,AUD,CHF,CNY,INR,NZD,SEK,NOK,DKK,PLN,TRY,BRL,MXN,SGD,HKD"
)
_CACHE_TTL = timedelta(hours=1)

_lock = asyncio.Lock()
_cache_rates: dict[str, float] | None = None
_cache_rate_date: str | None = None
_cache_fetched_at: datetime | None = None


@dataclass(frozen=True, slots=True)
class UsdFxSnapshot:
    """Per-1-USD rates: ``rates["KRW"]`` is how many KRW one USD buys."""

    rates: dict[str, float]
    rate_date: str | None
    fetched_at: datetime


def _parse_rates_payload(payload: Any) -> tuple[dict[str, float], str | None]:
    rates: dict[str, float] = {"USD": 1.0}
    rate_date: str | None = None
    if not isinstance(payload, list):
        return rates, rate_date
    for row in payload:
        if not isinstance(row, dict):
            continue
        quote = row.get("quote")
        raw_rate = row.get("rate")
        if not isinstance(quote, str) or not isinstance(raw_rate, (int, float)):
            continue
        rates[quote.upper()] = float(raw_rate)
        if rate_date is None and isinstance(row.get("date"), str):
            rate_date = row["date"]
    return rates, rate_date


async def get_usd_fx_snapshot_cached() -> UsdFxSnapshot | None:
    """Return cached USD→quote rates, refreshing at most once per hour."""
    global _cache_rates, _cache_rate_date, _cache_fetched_at

    async with _lock:
        now = utcnow()
        if (
            _cache_rates is not None
            and _cache_fetched_at is not None
            and now - _cache_fetched_at < _CACHE_TTL
        ):
            return UsdFxSnapshot(
                rates=dict(_cache_rates),
                rate_date=_cache_rate_date,
                fetched_at=_cache_fetched_at,
            )

        url = f"{_FRANKFURTER_BASE}?base=USD&quotes={_DEFAULT_QUOTES}"
        timeout = aiohttp.ClientTimeout(total=12)
        try:
            async with aiohttp.ClientSession(timeout=timeout, trust_env=True) as session:
                async with session.get(url, headers={"Accept": "application/json"}) as resp:
                    if resp.status != 200:
                        logger.warning("Frankfurter HTTP %s", resp.status)
                        if _cache_rates is not None:
                            return UsdFxSnapshot(
                                rates=dict(_cache_rates),
                                rate_date=_cache_rate_date,
                                fetched_at=_cache_fetched_at or now,
                            )
                        return None
                    payload = await resp.json()
        except (aiohttp.ClientError, asyncio.TimeoutError, ValueError) as exc:
            logger.warning("Frankfurter fetch failed: %s", exc)
            if _cache_rates is not None:
                return UsdFxSnapshot(
                    rates=dict(_cache_rates),
                    rate_date=_cache_rate_date,
                    fetched_at=_cache_fetched_at or now,
                )
            return None

        rates, rate_date = _parse_rates_payload(payload)
        if len(rates) <= 1:
            logger.warning("Frankfurter returned no usable rates")
            if _cache_rates is not None:
                return UsdFxSnapshot(
                    rates=dict(_cache_rates),
                    rate_date=_cache_rate_date,
                    fetched_at=_cache_fetched_at or now,
                )
            return None

        _cache_rates = rates
        _cache_rate_date = rate_date
        _cache_fetched_at = now
        return UsdFxSnapshot(rates=dict(rates), rate_date=rate_date, fetched_at=now)


def reset_frankfurter_cache_for_tests() -> None:
    global _cache_rates, _cache_rate_date, _cache_fetched_at
    _cache_rates = None
    _cache_rate_date = None
    _cache_fetched_at = None
