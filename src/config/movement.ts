// Existing local movement preview settings; not approved character balance.
export const MOVEMENT_PREVIEW = Object.freeze({ speed: 150, radius: 12 });

// Ground footprint only: attack poses and tall sprites should not form walls.
export const GROUND_BLOCKING = Object.freeze({ widthRatio: 0.30, minRadius: 6, maxRadius: 18 });
