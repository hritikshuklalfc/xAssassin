/* Coordinate Helpers (Opta 0-100 to SVG pitch) */
const Y = (y) => (parseFloat(y) / 100) * 68;
const X = (x) => parseFloat(x);

window.Y = Y;
window.X = X;
