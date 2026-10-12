import { describe, expect, it } from "vitest";
import {
  normalizePoster,
  encodePoster,
  decodePoster,
  moveSlot,
  isDuplicate,
  posterDimensions,
} from "../client/src/poster";
const movie = {
  imdbId: "tt43043341",
  title: "Crisis",
  cast: "Alexisonfire",
  year: null,
  posterMd: "https://m.media-amazon.com/test.jpg",
  posterLg: "https://m.media-amazon.com/test.jpg",
};
const board = {
  gridSize: 9,
  title: "@Kayla 🎵",
  background: "slate",
  showCaptions: false,
  slots: [movie, ...Array(8).fill(null)],
};
describe("portable boards", () => {
  it("recovers an empty board from malformed saved data", () => {
    const result = normalizePoster({
      gridSize: 4,
      slots: ["broken"],
      background: "unknown",
    });
    expect(result?.gridSize).toBe(9);
    expect(result?.slots).toEqual(Array(9).fill(null));
    expect(result?.showCaptions).toBe(true);
  });
  it("preserves Unicode names, order, empty slots and captions in a share link", () => {
    expect(decodePoster(encodePoster(board))).toEqual(board);
  });
  it("rejects executable or arbitrary external cover URLs in shared data", () => {
    const result = normalizePoster({
      ...board,
      slots: [{ ...movie, posterLg: "javascript:alert(1)" }],
    });
    expect(result?.slots[0]?.posterLg).toBe("");
  });
  it("keeps local uploaded covers out of public share payloads", () => {
    const local = {
      ...board,
      slots: [
        {
          ...movie,
          imdbId: "local-1",
          posterMd: "data:image/png;base64,AA==",
          posterLg: "data:image/png;base64,AA==",
        },
        ...Array(8).fill(null),
      ],
    };
    const shared = decodePoster(encodePoster(local));
    expect(shared?.slots[0]?.title).toBe("Crisis");
    expect(shared?.slots[0]?.posterLg).toBe("");
  });
  it("rejects corrupt share payloads instead of replacing saved work", () => {
    expect(decodePoster("not-a-board")).toBeNull();
    expect(decodePoster(btoa("{}"))).toBeNull();
  });
});
describe("positional board behavior", () => {
  it("moves by swapping with a neighbor, preserving gaps", () => {
    expect(moveSlot([movie, null, { ...movie, imdbId: "tt2" }], 0, 1)).toEqual([
      null,
      movie,
      { ...movie, imdbId: "tt2" },
    ]);
  });
  it("leaves a board unchanged at either boundary", () => {
    expect(moveSlot([movie, null], 0, -1)).toEqual([movie, null]);
    expect(moveSlot([movie, null], 0, 2)).toEqual([movie, null]);
  });
  it("prevents duplicates by ID or title and cast while allowing replacement", () => {
    expect(isDuplicate([movie], movie)).toBe(true);
    expect(
      isDuplicate([movie], { ...movie, imdbId: "local-1", title: " crisis " }),
    ).toBe(true);
    expect(isDuplicate([movie], movie, 0)).toBe(false);
  });
  it("exports portrait dimensions for every board size", () => {
    expect(posterDimensions(9, "standard")).toEqual([1800, 2250]);
    expect(posterDimensions(12, "standard")).toEqual([1800, 2250]);
    expect(posterDimensions(15, "standard")).toEqual([1800, 2250]);
    expect(posterDimensions(15, "story")).toEqual([1080, 1920]);
  });
});

it("round-trips a full board with long Unicode movie metadata", () => {
  const longBoard = {
    ...board,
    gridSize: 15,
    slots: Array.from({ length: 15 }, (_, i) => ({
      ...movie,
      imdbId: `tt${i + 1}`,
      title: "音".repeat(191),
      cast: "楽".repeat(190),
    })),
  };
  expect(decodePoster(encodePoster(longBoard))).toEqual(longBoard);
});
