// Breadboard layout and display configuration
export const BREADBOARD_VERTICAL_SCALE = 1.09;
export const BREADBOARD_DISPLAY_SCALE = 0.8;
export const BREADBOARD_GRID_PADDING = 26
export const BREADBOARD_SPACING = 5;
export const BREADBOARD_CELL_SIZE = 5;
export const BREADBOARD_MARGIN = 20; 

// Boards stacked in one layout (e.g. "Eurorack"): each board ends at its bottom power-rail pair.
// A rail pair is a board bottom when it ends the layout or the next non-empty row is another
// board's top rail. Single-board layouts yield one board spanning the whole layout.
// Module y = rows from the layout bottom to its board's bottom row (0 = last board).
export function getBoardBottomRows(layout: string[]): number[] {
  const isRail = (row?: string) => !!row && row.includes('P') && !row.includes('M');
  const isEmpty = (row: string) => !row.includes('P') && !row.includes('M');
  const bottoms: number[] = [];
  for (let r = 0; r + 2 < layout.length; r++) {
    if (!isRail(layout[r]) || !isRail(layout[r + 1])) continue;
    let next = r + 2;
    while (next < layout.length && isEmpty(layout[next])) next++;
    if (next > r + 2 && isRail(layout[next])) bottoms.push(r + 1);
  }
  bottoms.push(layout.length - 1);
  return bottoms;
}
