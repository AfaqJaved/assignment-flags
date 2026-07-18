# Example

Say flag new-checkout has rolloutPercentage: 30 in production, boolean type, defaultValue: false.

- bucketFor('new-checkout', 'user-42') might hash to 17.4 → 17.4 < 30 → true, user-42 sees the flag as true.
- bucketFor('new-checkout', 'user-99') might hash to 82.1 → 82.1 < 30 → false, user-99 falls through and gets flag.defaultValue (false).

If you later bump rolloutPercentage to 50, user-99's bucket (82.1) is still unaffected, but anyone whose bucket falls between 30 and 50 newly flips to true — existing users in the 0–30 range stay true (monotonic rollout, no random reshuffling as the percentage grows).

Edge cases are short-circuited directly (isInRollout): rolloutPercentage <= 0 → always false; >= 100 → always true, skipping the hash entirely.
