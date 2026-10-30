/**
 * Country detection for a phone number being typed into the admin panel.
 *
 * The seller types their number without a "+" (the "+" is fixed in the UI),
 * so the digits already start with the country calling code. We match the
 * longest known dial code first: "61400…" → 61 (Australia), while "1809…"
 * resolves to the Dominican Republic before the generic +1 (United States).
 *
 * Flags are loaded straight from flagpedia.net, which publishes every country
 * flag as /data/flags/h160/<iso2>.png (lower-case ISO 3166-1 alpha-2).
 */

const DIAL_CODES: Record<string, string> = {
  // 1–2 digit codes
  "1": "US",
  "7": "RU",
  "20": "EG",
  "27": "ZA",
  "30": "GR",
  "31": "NL",
  "32": "BE",
  "33": "FR",
  "34": "ES",
  "36": "HU",
  "39": "IT",
  "40": "RO",
  "41": "CH",
  "43": "AT",
  "44": "GB",
  "45": "DK",
  "46": "SE",
  "47": "NO",
  "48": "PL",
  "49": "DE",
  "51": "PE",
  "52": "MX",
  "53": "CU",
  "54": "AR",
  "55": "BR",
  "56": "CL",
  "57": "CO",
  "58": "VE",
  "60": "MY",
  "61": "AU",
  "62": "ID",
  "63": "PH",
  "64": "NZ",
  "65": "SG",
  "66": "TH",
  "81": "JP",
  "82": "KR",
  "84": "VN",
  "86": "CN",
  "90": "TR",
  "91": "IN",
  "92": "PK",
  "93": "AF",
  "94": "LK",
  "95": "MM",
  "98": "IR",
  "212": "MA",
  "213": "DZ",
  "216": "TN",
  "218": "LY",
  "220": "GM",
  "221": "SN",
  "233": "GH",
  "234": "NG",
  "254": "KE",
  "255": "TZ",
  "256": "UG",
  "260": "ZM",
  "263": "ZW",
  "351": "PT",
  "352": "LU",
  "353": "IE",
  "354": "IS",
  "355": "AL",
  "356": "MT",
  "357": "CY",
  "358": "FI",
  "359": "BG",
  "370": "LT",
  "371": "LV",
  "372": "EE",
  "373": "MD",
  "374": "AM",
  "375": "BY",
  "380": "UA",
  "381": "RS",
  "385": "HR",
  "386": "SI",
  "387": "BA",
  "389": "MK",
  "420": "CZ",
  "421": "SK",
  "423": "LI",
  "501": "BZ",
  "502": "GT",
  "503": "SV",
  "504": "HN",
  "505": "NI",
  "506": "CR",
  "507": "PA",
  "509": "HT",
  "591": "BO",
  "592": "GY",
  "593": "EC",
  "594": "GF",
  "595": "PY",
  "596": "MQ",
  "597": "SR",
  "598": "UY",
  "599": "CW",
  "673": "BN",
  "674": "NR",
  "675": "PG",
  "676": "TO",
  "677": "SB",
  "678": "VU",
  "679": "FJ",
  "685": "WS",
  "686": "KI",
  "852": "HK",
  "853": "MO",
  "855": "KH",
  "856": "LA",
  "880": "BD",
  "886": "TW",
  "960": "MV",
  "961": "LB",
  "962": "JO",
  "963": "SY",
  "964": "IQ",
  "965": "KW",
  "966": "SA",
  "967": "YE",
  "968": "OM",
  "970": "PS",
  "971": "AE",
  "972": "IL",
  "973": "BH",
  "974": "QA",
  "975": "BT",
  "976": "MN",
  "977": "NP",
  "992": "TJ",
  "993": "TM",
  "994": "AZ",
  "995": "GE",
  "996": "KG",
  "998": "UZ",
  // North-American numbering plan islands (longest-prefix wins over "1")
  "1242": "BS",
  "1246": "BB",
  "1264": "AI",
  "1268": "AG",
  "1284": "VG",
  "1340": "VI",
  "1345": "KY",
  "1441": "BM",
  "1473": "GD",
  "1649": "TC",
  "1664": "MS",
  "1670": "MP",
  "1671": "GU",
  "1684": "AS",
  "1721": "SX",
  "1758": "LC",
  "1767": "DM",
  "1784": "VC",
  "1787": "PR",
  "1809": "DO",
  "1829": "DO",
  "1849": "DO",
  "1868": "TT",
  "1869": "KN",
  "1876": "JM",
};

const MAX_DIAL_LENGTH = 4;

export interface DialCountry {
  /** The matched calling code, e.g. "61". */
  dial: string;
  /** ISO 3166-1 alpha-2 code, e.g. "AU". */
  iso2: string;
}

/**
 * Longest-prefix lookup of the calling code the digits start with. Returns
 * null until enough digits have been typed to know a country.
 */
export function findCountryByPhone(digits: string): DialCountry | null {
  const cleaned = digits.replace(/\D/g, "");
  for (let length = MAX_DIAL_LENGTH; length >= 1; length--) {
    if (cleaned.length < length) continue;
    const prefix = cleaned.slice(0, length);
    const iso2 = DIAL_CODES[prefix];
    if (iso2) return { dial: prefix, iso2 };
  }
  return null;
}

/** Flag image published by flagpedia.net for an ISO alpha-2 code. */
export function flagUrl(iso2: string): string {
  return `https://flagpedia.net/data/flags/h160/${iso2.toLowerCase()}.png`;
}

/** Human-readable country name, falling back to the raw code. */
export function countryName(iso2: string): string {
  try {
    const name = new Intl.DisplayNames(["en"], { type: "region" }).of(iso2);
    return name || iso2;
  } catch {
    return iso2;
  }
}
