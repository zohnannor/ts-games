const _ = 0;

const board = [
  [_, _, _, _, _, _, _, _, _],
  [_, 7, _, _, 9, 5, 3, 4, _],
  [_, 9, _, _, 4, 2, _, 6, _],
  [_, 5, 9, _, 6, _, _, 2, _],
  [_, 2, 6, 8, 5, 3, 7, 9, _],
  [_, _, _, 9, 2, 4, 8, 5, _],
  [_, _, _, 5, 3, 7, _, 8, _],
  [_, 4, 5, 2, 8, _, _, 7, _],
  [_, _, _, _, _, _, _, _, _],
];

const printb = (b: number[][]) => {
  console.log('_'.repeat(19));
  for (let y = 0; y < b.length; y++) {
    const row = b[y];
    console.log('[' + row.map((x: number) => (x === _ ? ' ' : x)).join('|') + ']');
  }
  console.log('-'.repeat(19));
};

const sub = (a: number[]) => [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(x => !a.includes(x));
const col = (board: number[][], i: number) => board.map((row: number[]) => row[i]);
const row = (board: number[][], i: number) => board[i];
const sqr = (board: number[][], y: number, x: number) =>
  board.slice(~~(y / 3) * 3, ~~(y / 3) * 3 + 3).flatMap((r: number[]) => r.slice(~~(x / 3) * 3, ~~(x / 3) * 3 + 3));
const sqrFromXY = (x: number, y: number) => ~~(x / 3) + ~~(y / 3) * 3;
const ins = (a: number[], b: number[]) => a.filter((x: number) => b.includes(x));

const count = (board: number[][]) => {
  const num_count = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (let y = 0; y < board.length; y++) {
    const row = board[y];
    for (let x = 0; x < row.length; x++) {
      const cell = row[x];
      num_count[cell]++;
    }
  }
  return num_count;
};

const solve = (b: number[][]): number[][] => {
  const num_count = count(board);
  let empty = 0;

  for (let row_i = 0; row_i < b.length; ++row_i) {
    const brow = b[row_i];
    for (let cell_i = 0; cell_i < brow.length; ++cell_i) {
      const cell = brow[cell_i];
      if (cell === _) {
        empty++;
        const possible = ins(ins(sub(brow), sub(col(b, cell_i))), sub(sqr(b, row_i, cell_i)));
        if (possible.length === 1) {
          b[row_i][cell_i] = possible[0];
          empty--;
        }
        for (let n = 1; n < num_count.length; ++n) {
          const c = num_count[n];
          if (c === 8 && possible.includes(n)) {
            b[row_i][cell_i] = n;
            empty--;
          }
        }
      }
    }
  }

  if (empty > 0) {
    return solve(b);
  }
  return b;
};

debugger;

printb(board);
console.log();
printb(solve(board));
