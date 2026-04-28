from __future__ import annotations

DISPLAY_COST_CURRENCY_CODES: tuple[str, ...] = (
    "USD",
    "EUR",
    "GBP",
    "JPY",
    "KRW",
    "CAD",
    "AUD",
    "CHF",
    "CNY",
    "INR",
    "NZD",
    "SEK",
    "NOK",
    "DKK",
    "PLN",
    "TRY",
    "BRL",
    "MXN",
    "SGD",
    "HKD",
)

DISPLAY_COST_CURRENCY_SET = frozenset(DISPLAY_COST_CURRENCY_CODES)


def normalize_display_cost_currency(value: str | None) -> str:
    code = (value or "USD").strip().upper()
    if code not in DISPLAY_COST_CURRENCY_SET:
        return "USD"
    return code
