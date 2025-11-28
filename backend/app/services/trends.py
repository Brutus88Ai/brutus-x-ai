# backend/app/services/trends.py
# TrendScout service using pytrends with proxy rotation and exponential backoff.

from pytrends.request import TrendReq
from typing import List, Optional, Dict
import random
import time
import logging
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
import httpx

logger = logging.getLogger("trendscout")

class ProxyRotationError(Exception):
    pass

class TrendScout:
    def __init__(self, proxies: Optional[List[str]] = None, timeout: int = 10):
        # proxies is a list of http proxy URLs like 'http://user:pass@host:port' or 'http://host:port'
        self.proxies = proxies or []
        self.timeout = timeout

    def _build_trendreq(self, proxy: Optional[str] = None) -> TrendReq:
        if proxy:
            # pytrends can accept custom requests session; but simplest is to set proxies env on httpx if needed.
            # We use the requests session via TrendReq which uses requests underneath.
            return TrendReq(hl='de-DE', tz=360, timeout=(10, 25), proxies={"http": proxy, "https": proxy})
        return TrendReq(hl='de-DE', tz=360, timeout=(10, 25))

    def _choose_proxy(self) -> Optional[str]:
        if not self.proxies:
            return None
        return random.choice(self.proxies)

    @retry(stop=stop_after_attempt(5), wait=wait_exponential(multiplier=1, min=1, max=20))
    def fetch_related_queries(self, keyword: str) -> Dict:
        """Fetch related queries for a keyword, rotating proxies on failures.

        Self-Correction test: If Google Trends returns HTTP 429, the retry/backoff will trigger and
        the method will rotate proxies up to the configured attempts. After max attempts a ProxyRotationError is raised.
        """
        last_err = None
        tried = set()
        attempts = 0
        while attempts < 5:
            proxy = self._choose_proxy()
            attempts += 1
            tried.add(proxy)
            try:
                pytrends = self._build_trendreq(proxy=proxy)
                pytrends.build_payload([keyword], cat=0, timeframe='now 7-d', geo='DE')
                res = pytrends.related_queries()
                return res
            except Exception as e:
                last_err = e
                logger.warning(f"Trend fetch failed with proxy={proxy}: {e}")
                # simple heuristic: if 429 or network error, try next proxy after backoff
                time.sleep(min(2 ** attempts, 15))
                continue
        raise ProxyRotationError(f"Failed to fetch trends after trying proxies: {tried}. Last error: {last_err}")

    def safe_fetch_top_trend(self, keywords: List[str]) -> Optional[str]:
        """Return the top trend among provided keywords by checking related query volume heuristics.

        Self-Correction test: If the function encounters repeated network errors, it returns None instead of raising, allowing the caller to fallback to a default trend.
        """
        for kw in keywords:
            try:
                res = self.fetch_related_queries(kw)
                # naive heuristic: take top related query
                if isinstance(res, dict):
                    top = res.get(kw) or res.get('')
                    if top and isinstance(top, dict):
                        rq = top.get('top')
                        if rq and len(rq) > 0:
                            return rq[0][0]
            except ProxyRotationError as e:
                logger.error(f"Proxy rotation exhausted for keyword {kw}: {e}")
            except Exception as e:
                logger.warning(f"Unexpected error while fetching related queries for {kw}: {e}")
        return None

# Example usage (self-test):
# scout = TrendScout(proxies=["http://127.0.0.1:8001", "http://127.0.0.1:8002"]) 
# try:
#     top = scout.safe_fetch_top_trend(["ai", "ki revolution"])
#     print("Top trend:", top)
# except Exception as e:
#     print("TrendScout failed test:", e)
