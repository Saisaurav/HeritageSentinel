// mapData.js
// Auto-derived from generate_map.py pixel coordinates.
// Coordinate space: 0–100 (percentage of map image dimensions 1600×1000px).
// Node naming:
//   top_*   — top horizontal corridor
//   sp_*    — center vertical spine (inside atrium)
//   lc_*    — left vertical corridor
//   rc_*    — right vertical corridor
//   atr_*   — atrium perimeter nodes
//   tlc/trc — top-left/right diagonal connectors
//   mlc/mrc — mid-left/right horizontal connectors
//   blc/brc — bottom-left/right connectors
//   bot_*   — bottom horizontal spine
//   *_c     — room center anchor
//   *_entry — room doorway node

export const MAP_FEATURES = [
  { key: 'feature1Title', keyDesc: 'feature1Desc' },
  { key: 'feature2Title', keyDesc: 'feature2Desc' },
  { key: 'feature3Title', keyDesc: 'feature3Desc' }
];

export const LOCATIONS = [
  {
    label: 'Gallery A',
    type: 'Location',
    minX: 5,   minY: 10, maxX: 26,  maxY: 33,
    center: { x: 15.6, y: 21.5 },
    navAnchor: 'ga_c',
    info: 'A curated gallery featuring important historical artifacts and rotating collections.'
  },
  {
    label: 'Gallery B',
    type: 'Location',
    minX: 74,  minY: 10, maxX: 95,  maxY: 33,
    center: { x: 84.4, y: 21.5 },
    navAnchor: 'gb_c',
    info: 'Exhibitions showcasing international collections and notable cultural pieces.'
  },
  {
    label: 'History Wing',
    type: 'Location',
    minX: 5,   minY: 39, maxX: 23,  maxY: 61,
    center: { x: 13.8, y: 50.0 },
    navAnchor: 'hw_c',
    info: 'Explore historical developments, preserved records and important milestones.'
  },
  {
    label: 'Innovation Hall',
    type: 'Location',
    minX: 77,  minY: 39, maxX: 95,  maxY: 61,
    center: { x: 86.2, y: 50.0 },
    navAnchor: 'ih_c',
    info: 'Displays featuring technology, engineering and future-facing innovations.'
  },
  {
    label: 'Temporary Exhibit',
    type: 'Location',
    minX: 5,   minY: 69, maxX: 34,  maxY: 90,
    center: { x: 19.4, y: 79.5 },
    navAnchor: 'te_c',
    info: 'Special rotating exhibitions available for a limited period.'
  },
  {
    label: 'Museum Archive',
    type: 'Location',
    minX: 66,  minY: 69, maxX: 95,  maxY: 90,
    center: { x: 80.6, y: 79.5 },
    navAnchor: 'ar_c',
    info: 'Preserved historical records, archival material and research collections.'
  },
  {
    label: 'Café',
    type: 'Location',
    minX: 40,  minY: 76, maxX: 60,  maxY: 90,
    center: { x: 50.0, y: 83.0 },
    navAnchor: 'cafe_c',
    info: 'Refreshments, seating and rest area for museum visitors.'
  },
  {
    label: 'Central Atrium',
    type: 'Location',
    minX: 29,  minY: 25, maxX: 71,  maxY: 70,
    center: { x: 50.0, y: 47.5 },
    navAnchor: 'sp_c',
    info: 'The central visitor area with navigation assistance and museum information.'
  }
];

// ─── Navigation graph ────────────────────────────────────────────────────────
// 61 nodes covering every walkable corridor, connector, doorway and room interior.
// All coordinates in 0–100 % space matching the 1600×1000 map image.

export const NAV_NODES = [
  // ── Top horizontal corridor ────────────────────────────────────────────────
  { id: 'top_gaExit', x: 26.2, y: 17.7, neighbors: ['ga_c', 'tlc_t', 'top_l'] },
  { id: 'top_l',      x: 33.8, y: 17.7, neighbors: ['top_cl', 'top_gaExit'] },
  { id: 'top_cl',     x: 41.2, y: 17.7, neighbors: ['top_c', 'top_l'] },
  { id: 'top_c',      x: 50.0, y: 17.7, neighbors: ['sp_t', 'top_cl', 'top_cr'] },
  { id: 'top_cr',     x: 58.8, y: 17.7, neighbors: ['top_c', 'top_r'] },
  { id: 'top_r',      x: 66.2, y: 17.7, neighbors: ['top_cr', 'top_gbExit'] },
  { id: 'top_gbExit', x: 73.8, y: 17.7, neighbors: ['gb_c', 'top_r', 'trc_t'] },

  // ── Top-left diagonal connector (Gallery A corridor → Atrium) ──────────────
  { id: 'tlc_t', x: 27.7, y: 21.0, neighbors: ['tlc_b', 'top_gaExit'] },
  { id: 'tlc_b', x: 27.7, y: 25.5, neighbors: ['atr_tl', 'tlc_t'] },

  // ── Top-right diagonal connector (Gallery B corridor → Atrium) ─────────────
  { id: 'trc_t', x: 72.3, y: 21.0, neighbors: ['top_gbExit', 'trc_b'] },
  { id: 'trc_b', x: 72.3, y: 25.5, neighbors: ['atr_tr', 'trc_t'] },

  // ── Atrium top row ─────────────────────────────────────────────────────────
  { id: 'atr_tl', x: 33.8, y: 29.0, neighbors: ['atr_tc', 'lc_t', 'tlc_b'] },
  { id: 'atr_tc', x: 50.0, y: 29.0, neighbors: ['atr_tl', 'atr_tr', 'sp_1'] },
  { id: 'atr_tr', x: 66.2, y: 29.0, neighbors: ['atr_tc', 'rc_t', 'trc_b'] },

  // ── Center vertical spine (inside atrium) ──────────────────────────────────
  { id: 'sp_t', x: 50.0, y: 23.0, neighbors: ['sp_1', 'top_c'] },
  { id: 'sp_1', x: 50.0, y: 32.0, neighbors: ['atr_tc', 'sp_2', 'sp_t'] },
  { id: 'sp_2', x: 50.0, y: 40.0, neighbors: ['lc_1', 'rc_1', 'sp_1', 'sp_c'] },
  { id: 'sp_c', x: 50.0, y: 47.5, neighbors: ['sp_2', 'sp_3'] },
  { id: 'sp_3', x: 50.0, y: 55.0, neighbors: ['lc_3', 'rc_3', 'sp_4', 'sp_c'] },
  { id: 'sp_4', x: 50.0, y: 63.0, neighbors: ['atr_bc', 'sp_3', 'sp_5'] },
  { id: 'sp_5', x: 50.0, y: 71.0, neighbors: ['atr_bl', 'atr_br', 'sp_4', 'sp_b'] },
  { id: 'sp_b', x: 50.0, y: 78.0, neighbors: ['bot_c', 'sp_5'] },

  // ── Left vertical corridor ─────────────────────────────────────────────────
  { id: 'lc_t', x: 35.6, y: 34.0, neighbors: ['atr_tl', 'lc_1'] },
  { id: 'lc_1', x: 35.6, y: 41.0, neighbors: ['lc_2', 'lc_t', 'sp_2'] },
  { id: 'lc_2', x: 35.6, y: 48.0, neighbors: ['lc_1', 'lc_3', 'mlc_r'] },
  { id: 'lc_3', x: 35.6, y: 55.0, neighbors: ['lc_2', 'lc_b', 'sp_3'] },
  { id: 'lc_b', x: 35.6, y: 61.0, neighbors: ['atr_bl', 'lc_3'] },

  // ── Right vertical corridor ────────────────────────────────────────────────
  { id: 'rc_t', x: 64.4, y: 34.0, neighbors: ['atr_tr', 'rc_1'] },
  { id: 'rc_1', x: 64.4, y: 41.0, neighbors: ['rc_2', 'rc_t', 'sp_2'] },
  { id: 'rc_2', x: 64.4, y: 48.0, neighbors: ['mrc_l', 'rc_1', 'rc_3'] },
  { id: 'rc_3', x: 64.4, y: 55.0, neighbors: ['rc_2', 'rc_b', 'sp_3'] },
  { id: 'rc_b', x: 64.4, y: 61.0, neighbors: ['atr_br', 'rc_3'] },

  // ── Atrium bottom row ──────────────────────────────────────────────────────
  { id: 'atr_bl', x: 35.6, y: 66.5, neighbors: ['atr_bc', 'bot_lc', 'lc_b', 'sp_5'] },
  { id: 'atr_bc', x: 50.0, y: 66.5, neighbors: ['atr_bl', 'atr_br', 'sp_4'] },
  { id: 'atr_br', x: 64.4, y: 66.5, neighbors: ['atr_bc', 'bot_rc', 'rc_b', 'sp_5'] },

  // ── Mid-left connector → History Wing ─────────────────────────────────────
  { id: 'mlc_r',    x: 35.6, y: 50.3, neighbors: ['lc_2', 'mlc_l'] },
  { id: 'mlc_l',    x: 22.6, y: 50.3, neighbors: ['hw_entry', 'mlc_r'] },
  { id: 'hw_entry', x: 22.4, y: 50.3, neighbors: ['hw_c', 'mlc_l'] },

  // ── Mid-right connector → Innovation Hall ─────────────────────────────────
  { id: 'mrc_l',    x: 64.4, y: 50.3, neighbors: ['mrc_r', 'rc_2'] },
  { id: 'mrc_r',    x: 77.4, y: 50.3, neighbors: ['ih_entry', 'mrc_l'] },
  { id: 'ih_entry', x: 77.6, y: 50.3, neighbors: ['ih_c', 'mrc_r'] },

  // ── Bottom horizontal spine ────────────────────────────────────────────────
  { id: 'bot_lc', x: 35.6, y: 80.8, neighbors: ['atr_bl', 'blc_l', 'bot_l'] },
  { id: 'bot_l',  x: 41.2, y: 80.8, neighbors: ['bot_cl', 'bot_lc'] },
  { id: 'bot_cl', x: 45.6, y: 80.8, neighbors: ['bot_c', 'bot_l', 'cafe_l'] },
  { id: 'bot_c',  x: 50.0, y: 80.8, neighbors: ['bot_cl', 'bot_cr', 'cafe_c', 'sp_b'] },
  { id: 'bot_cr', x: 54.4, y: 80.8, neighbors: ['bot_c', 'bot_r', 'cafe_r'] },
  { id: 'bot_r',  x: 58.8, y: 80.8, neighbors: ['bot_cr', 'bot_rc'] },
  { id: 'bot_rc', x: 64.4, y: 80.8, neighbors: ['atr_br', 'bot_r', 'brc_r'] },

  // ── Bottom-left connector → Temporary Exhibit ─────────────────────────────
  { id: 'blc_l',    x: 30.6, y: 80.8, neighbors: ['bot_lc', 'te_entry'] },
  { id: 'te_entry', x: 26.9, y: 80.8, neighbors: ['blc_l', 'te_c'] },

  // ── Bottom-right connector → Museum Archive ────────────────────────────────
  { id: 'brc_r',    x: 69.4, y: 80.8, neighbors: ['ar_entry', 'bot_rc'] },
  { id: 'ar_entry', x: 71.9, y: 80.8, neighbors: ['ar_c', 'brc_r'] },

  // ── Room interior anchors ──────────────────────────────────────────────────
  { id: 'ga_c',   x: 15.6, y: 21.5, neighbors: ['top_gaExit'] },
  { id: 'gb_c',   x: 84.4, y: 21.5, neighbors: ['top_gbExit'] },
  { id: 'hw_c',   x: 13.8, y: 50.0, neighbors: ['hw_entry'] },
  { id: 'ih_c',   x: 86.2, y: 50.0, neighbors: ['ih_entry'] },
  { id: 'te_c',   x: 19.4, y: 79.5, neighbors: ['te_entry'] },
  { id: 'ar_c',   x: 80.6, y: 79.5, neighbors: ['ar_entry'] },
  { id: 'cafe_l', x: 43.8, y: 83.0, neighbors: ['bot_cl', 'cafe_c'] },
  { id: 'cafe_c', x: 50.0, y: 83.0, neighbors: ['bot_c', 'cafe_l', 'cafe_r'] },
  { id: 'cafe_r', x: 56.2, y: 83.0, neighbors: ['bot_cr', 'cafe_c'] },
];