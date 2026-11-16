import {
  createApiKey,
  durationToSeconds,
  hashPassword,
  safeEqual,
  sanitizeFilename,
  sha256,
  verifyPassword,
} from "./crypto";

describe("crypto utilities", () => {
  it("hashes and verifies passwords with argon2id", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(hash).toMatch(/^\$argon2id\$/);
    await expect(verifyPassword(hash, "correct horse battery staple")).resolves.toBe(true);
    await expect(verifyPassword(hash, "wrong password")).resolves.toBe(false);
  });

  it("returns false for malformed password hashes", async () => {
    await expect(verifyPassword("not-a-hash", "anything")).resolves.toBe(false);
  });

  it("creates API keys with a stable hash and safe prefix", () => {
    const first = createApiKey();
    const second = createApiKey();

    expect(first.key).toMatch(/^vf_live_[a-f0-9]{48}$/);
    expect(first.prefix).toHaveLength(14);
    expect(first.prefix).toBe(first.key.slice(0, 14));
    expect(first.hash).toBe(sha256(first.key));
    expect(first.key).not.toBe(second.key);
    expect(first.hash).not.toBe(second.hash);
  });

  it("compares secrets without leaking length information", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
  });

  it("parses duration strings in a predictable way", () => {
    expect(durationToSeconds("30s", 0)).toBe(30);
    expect(durationToSeconds("15m", 0)).toBe(900);
    expect(durationToSeconds("12h", 0)).toBe(43_200);
    expect(durationToSeconds("30d", 0)).toBe(2_592_000);
    expect(durationToSeconds(" 5 m ", 0)).toBe(300);
    expect(durationToSeconds("forever", 123)).toBe(123);
    expect(durationToSeconds("", 456)).toBe(456);
  });

  it("sanitizes filenames without leaving path separators", () => {
    const cleaned = sanitizeFilename("../../etc/passwd");
    expect(cleaned).not.toContain("/");
    expect(cleaned).not.toContain("..");
    expect(cleaned).toContain("passwd");

    const spaced = sanitizeFilename("my video (final).mp4");
    expect(spaced).not.toMatch(/\s/);
    expect(spaced.endsWith(".mp4")).toBe(true);

    expect(sanitizeFilename("a".repeat(300))).toHaveLength(120);
  });
});
