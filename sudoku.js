"use strict";
var _ = 0;
var board = [
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
var printb = function (b) {
    console.log('_'.repeat(19));
    for (var y = 0; y < b.length; y++) {
        var row_1 = b[y];
        console.log('[' + row_1.map(function (x) { return (x === _ ? ' ' : x); }).join('|') + ']');
    }
    console.log('-'.repeat(19));
};
var sub = function (a) { return [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(function (x) { return !a.includes(x); }); };
var col = function (board, i) { return board.map(function (row) { return row[i]; }); };
var row = function (board, i) { return board[i]; };
var sqr = function (board, y, x) {
    return board.slice(~~(y / 3) * 3, ~~(y / 3) * 3 + 3).flatMap(function (r) { return r.slice(~~(x / 3) * 3, ~~(x / 3) * 3 + 3); });
};
var sqrFromXY = function (x, y) { return ~~(x / 3) + ~~(y / 3) * 3; };
var ins = function (a, b) { return a.filter(function (x) { return b.includes(x); }); };
var count = function (board) {
    var num_count = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (var y = 0; y < board.length; y++) {
        var row_2 = board[y];
        for (var x = 0; x < row_2.length; x++) {
            var cell = row_2[x];
            num_count[cell]++;
        }
    }
    return num_count;
};
var solve = function (b) {
    var num_count = count(board);
    var empty = 0;
    for (var row_i = 0; row_i < b.length; ++row_i) {
        var brow = b[row_i];
        for (var cell_i = 0; cell_i < brow.length; ++cell_i) {
            var cell = brow[cell_i];
            if (cell === _) {
                empty++;
                var possible = ins(ins(sub(brow), sub(col(b, cell_i))), sub(sqr(b, row_i, cell_i)));
                if (possible.length === 1) {
                    b[row_i][cell_i] = possible[0];
                    empty--;
                }
                for (var n = 1; n < num_count.length; ++n) {
                    var c = num_count[n];
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
//# sourceMappingURL=sudoku.js.map