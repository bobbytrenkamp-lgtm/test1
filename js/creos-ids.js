/* js/creos-ids.js — CREOS universal entity ID utility (Phase 4, integration
   boundary only).

   WHY THIS FILE EXISTS:
   docs/CREOS_IDS.md documented a shared CREOS-*-XXXXX ID scheme but marked
   it "Not implemented." This file implements the generator/validator side
   of that scheme so a future SiteIntel -> Underwrite handoff can tag a
   record with a real, collision-safe CREOS ID. It does NOT touch this
   app's own identifiers (facilities_master.json keys, county FIPS codes,
   parcel IDs, etc.) — those remain the source of truth for everything this
   app does internally. Nothing in this repository calls
   generateCreosUlid() yet; it exists so the capability is available and
   tested before it's wired into any real handoff.

   Ported from the CREOS Enterprise repository's hardened, spec-verified
   implementation (test4's src/domain/ids.ts, see that repo's BUG-005 in
   BUG_TRACKER.md for why the encoding has to be done this specific way).
   Same ULID spec (https://github.com/ulid/spec): a 26-character Crockford
   base32 string — 10 characters of millisecond timestamp, 16 characters of
   randomness. Ported by hand (not npm-installed) because this app has no
   bundler or package.json; keeping the algorithm identical to test4's is
   what matters, not sharing a build artifact.

   Display IDs (CREOS-PROP-XXXXX, derived from the last 5 characters of the
   real ULID) are for humans; the ULID itself is the real identifier. See
   test4/docs/ARCHITECTURE.md's "Entity architecture" section.
*/
(function () {
  const CROCKFORD_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

  /* Canonical ULID timestamp encoding: repeated `value % 32` / `value / 32`
     in the INTEGER domain, most-significant digit first. This is the
     algorithm the spec actually defines. A byte-array + generic streaming
     base32 encoder (padding a trailing partial 5-bit group by shifting it
     left) does NOT match this for a 48-bit value, since 48 isn't a multiple
     of 5 — that was test4's BUG-005. Don't "simplify" this back to a byte
     array without re-reading that bug. */
  function encodeCrockfordInt(value, length) {
    let output = '';
    let n = value;
    for (let i = length; i > 0; i--) {
      const digit = n % 32;
      output = CROCKFORD_ALPHABET[digit] + output;
      n = (n - digit) / 32;
    }
    return output;
  }

  /* Byte-array streaming encoder — correct here because 80 bits (10 random
     bytes) is exactly 16 Crockford digits with no remainder, unlike the
     48-bit timestamp above. */
  function encodeCrockfordBytesExact(bytes) {
    let bits = 0;
    let value = 0;
    let output = '';
    for (let i = 0; i < bytes.length; i++) {
      value = (value << 8) | bytes[i];
      bits += 8;
      while (bits >= 5) {
        output += CROCKFORD_ALPHABET[(value >>> (bits - 5)) & 0x1f];
        bits -= 5;
      }
    }
    if (bits !== 0) {
      throw new Error('encodeCrockfordBytesExact: input bit length must be a multiple of 5');
    }
    return output;
  }

  function randomBytes(n) {
    const out = new Uint8Array(n);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(out);
    } else {
      /* Node without a Web Crypto global (rare, older runtimes) — fall
         back to Math.random(). Never used in a browser context, where
         crypto.getRandomValues is always available. */
      for (let i = 0; i < n; i++) out[i] = Math.floor(Math.random() * 256);
    }
    return out;
  }

  const MAX_CREOS_ULID_TIMESTAMP_MS = 281474976710655; // 2^48 - 1

  function generateCreosUlid(now) {
    const ts = now === undefined ? Date.now() : now;
    if (!Number.isInteger(ts) || ts < 0 || ts > MAX_CREOS_ULID_TIMESTAMP_MS) {
      throw new Error(
        'generateCreosUlid: timestamp ' + ts + ' is out of ULID\'s representable range ' +
        '(0 to ' + MAX_CREOS_ULID_TIMESTAMP_MS + ')',
      );
    }
    const timePart = encodeCrockfordInt(ts, 10);
    const randomPart = encodeCrockfordBytesExact(randomBytes(10));
    return timePart + randomPart;
  }

  /* A syntactically well-formed 26-char Crockford string can still encode a
     timestamp above MAX_CREOS_ULID_TIMESTAMP_MS if its first character is
     '8' or higher (2^48 requires only 1 bit of the first base32 digit's 5
     bits, so digits 8-Z there are unreachable from a real timestamp). */
  const OVERFLOW_PATTERN = /^[0-7]/;
  const ULID_PATTERN = /^[0-9A-HJKMNP-TV-Z]{26}$/;

  function isValidCreosUlid(value) {
    return typeof value === 'string' && ULID_PATTERN.test(value) && OVERFLOW_PATTERN.test(value);
  }

  /* CREOS-<PREFIX>-<last 5 chars, uppercase> — a derived display id only,
     never a second source of truth. See test4/src/domain/ids.ts's
     toDisplayId(). */
  function creosDisplayId(prefix, ulid) {
    if (!isValidCreosUlid(ulid)) {
      throw new Error('creosDisplayId: not a valid CREOS ULID: ' + ulid);
    }
    return 'CREOS-' + prefix + '-' + ulid.slice(-5);
  }

  window.generateCreosUlid = generateCreosUlid;
  window.isValidCreosUlid = isValidCreosUlid;
  window.creosDisplayId = creosDisplayId;
  window.MAX_CREOS_ULID_TIMESTAMP_MS = MAX_CREOS_ULID_TIMESTAMP_MS;
})();
