import pincodeZoneMap from "@/data/pincode_zone_map.json";

export interface MospiStats {
  cpi_health_inflation_pct: number;
  urban_mpce_salaried_monthly: number;
  health_spend_share_pct: number;
}

export interface ResolvedPincode {
  state: string;
  city_tier: string;
  expected_insurance_zone: string;
  mospi_stats: MospiStats;
}

interface RawMapEntry {
  state: string;
  city_tier: string;
  zone: string;
  mospi_stats: MospiStats;
}

interface PincodeMapData {
  prefix_ranges: Record<string, RawMapEntry>;
  default_fallback: RawMapEntry;
}

const mapData = pincodeZoneMap as unknown as PincodeMapData;

const FALLBACK: ResolvedPincode = {
  state: mapData.default_fallback?.state || "National Average",
  city_tier: mapData.default_fallback?.city_tier || "Tier-3",
  expected_insurance_zone: mapData.default_fallback?.zone || "Zone 3",
  mospi_stats: mapData.default_fallback?.mospi_stats || {
    cpi_health_inflation_pct: 6.2,
    urban_mpce_salaried_monthly: 7606,
    health_spend_share_pct: 6.8,
  },
};

// Pre-index numeric 3-digit prefixes for O(1) matching (handles single keys, comma-separated keys, and hyphenated ranges)
const prefixIndex = new Map<number, RawMapEntry>();

if (mapData && mapData.prefix_ranges) {
  for (const [key, entry] of Object.entries(mapData.prefix_ranges)) {
    const parts = key.split(",");
    for (const rawPart of parts) {
      const part = rawPart.trim();
      if (part.includes("-")) {
        const [startStr, endStr] = part.split("-").map((s) => s.trim());
        const start = parseInt(startStr, 10);
        const end = parseInt(endStr, 10);
        if (!isNaN(start) && !isNaN(end)) {
          const min = Math.min(start, end);
          const max = Math.max(start, end);
          for (let p = min; p <= max; p++) {
            prefixIndex.set(p, entry);
          }
        }
      } else {
        const val = parseInt(part, 10);
        if (!isNaN(val)) {
          prefixIndex.set(val, entry);
        }
      }
    }
  }
}

/**
 * Resolves an Indian PIN code into state, city tier, expected insurance zone, and MoSPI stats
 * using zero-token local dictionary lookup on the 3-digit prefix.
 *
 * @param pincode 6-digit Indian PIN code (number or string)
 * @returns { state, city_tier, expected_insurance_zone, mospi_stats }
 */
export function resolvePincode(pincode: number | string | null | undefined): ResolvedPincode {
  if (pincode === null || pincode === undefined) {
    return { ...FALLBACK };
  }

  // Sanitize input to clean digits
  const cleanPin = String(pincode).trim().replace(/\D/g, "");
  if (cleanPin.length < 3) {
    return { ...FALLBACK };
  }

  const prefixNum = parseInt(cleanPin.slice(0, 3), 10);
  if (isNaN(prefixNum)) {
    return { ...FALLBACK };
  }

  const match = prefixIndex.get(prefixNum);
  if (!match) {
    return { ...FALLBACK };
  }

  return {
    state: match.state,
    city_tier: match.city_tier,
    expected_insurance_zone: match.zone,
    mospi_stats: match.mospi_stats,
  };
}
