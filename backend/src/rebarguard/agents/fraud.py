"""FraudAgent — EXIF validation, timestamp sanity, reference-marker presence, hash dedup."""

from __future__ import annotations

import hashlib
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from pathlib import Path

import piexif

from rebarguard.agents.base import BaseAgent
from rebarguard.schemas import AgentRole, FraudReport, RebarDetection


@dataclass
class FraudInput:
    photo_paths: list[Path]
    detections: list[RebarDetection]
    now: datetime = field(default_factory=datetime.utcnow)
    known_hashes: set[str] = field(default_factory=set)


class FraudAgent(BaseAgent[FraudInput, FraudReport]):
    role = AgentRole.FRAUD

    async def run(self, payload: FraudInput) -> FraudReport:
        issues: list[str] = []
        exif_ok = True
        hash_dup = False
        geo_ok: bool | None = None

        for photo in payload.photo_paths:
            ts, coords = self._read_exif(photo)
            if ts is None:
                issues.append(f"{photo.name}: no EXIF timestamp.")
                exif_ok = False
            elif abs((payload.now - ts).total_seconds()) > timedelta(days=7).total_seconds():
                issues.append(
                    f"{photo.name}: EXIF date {ts.isoformat()} is far from inspection time."
                )
                exif_ok = False
            if coords is not None:
                geo_ok = geo_ok if geo_ok is False else True
            h = self._sha256(photo)
            if h in payload.known_hashes:
                hash_dup = True
                issues.append(f"{photo.name}: previously uploaded photo (hash match).")

        ref_ok = any(d.reference_marker_found for d in payload.detections)
        if not ref_ok:
            issues.append("No reference marker found in any photo.")

        severity = self._severity(len(issues), hash_dup, not exif_ok)
        summary = self._summary(exif_ok, ref_ok, hash_dup, len(issues))
        return FraudReport(
            exif_timestamp_valid=exif_ok,
            geolocation_valid=geo_ok,
            reference_marker_present=ref_ok,
            photo_hash_duplicate=hash_dup,
            inconsistencies=issues,
            severity=severity,
            summary=summary,
        )

    @staticmethod
    def _read_exif(path: Path) -> tuple[datetime | None, tuple[float, float] | None]:
        try:
            exif = piexif.load(str(path))
        except Exception:  # noqa: BLE001
            return None, None
        ts: datetime | None = None
        raw = exif.get("Exif", {}).get(piexif.ExifIFD.DateTimeOriginal)
        if raw:
            try:
                ts = datetime.strptime(raw.decode(), "%Y:%m:%d %H:%M:%S")
            except Exception:  # noqa: BLE001
                ts = None
        gps = exif.get("GPS") or {}
        if gps:
            try:
                lat = _dms_to_dd(
                    gps[piexif.GPSIFD.GPSLatitude], gps[piexif.GPSIFD.GPSLatitudeRef].decode()
                )
                lon = _dms_to_dd(
                    gps[piexif.GPSIFD.GPSLongitude], gps[piexif.GPSIFD.GPSLongitudeRef].decode()
                )
                return ts, (lat, lon)
            except Exception:  # noqa: BLE001
                pass
        return ts, None

    @staticmethod
    def _sha256(path: Path) -> str:
        h = hashlib.sha256()
        with path.open("rb") as f:
            for chunk in iter(lambda: f.read(65536), b""):
                h.update(chunk)
        return h.hexdigest()

    @staticmethod
    def _severity(n_issues: int, hash_dup: bool, exif_bad: bool) -> str:
        if hash_dup:
            return "critical"
        if exif_bad and n_issues >= 2:
            return "high"
        if n_issues >= 2:
            return "medium"
        if n_issues >= 1:
            return "low"
        return "low"

    @staticmethod
    def _summary(exif_ok: bool, ref_ok: bool, dup: bool, n: int) -> str:
        if dup:
            return "Critical: a photo was previously uploaded (hash duplicate)."
        if not exif_ok and not ref_ok:
            return "Missing EXIF and reference marker — inspection reliability is low."
        if not ref_ok:
            return "No reference marker — measurements cannot be verified."
        if n == 0:
            return "No fraud indicators detected."
        return f"{n} inconsistency/-ies found."


def _dms_to_dd(dms: tuple, ref: str) -> float:
    d, m, s = (v[0] / v[1] for v in dms)
    val = d + m / 60 + s / 3600
    if ref in ("S", "W"):
        val = -val
    return val
