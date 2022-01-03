import { choice } from './utils/choice.js';
import { $ } from './utils/$.js';

const onKeyDown = (e: KeyboardEvent) => {
  Game2048.handleKeyDown(e);
};

class Tile {
  value: number;
  $cell: HTMLDivElement;
  $tile: HTMLDivElement;

  constructor(value: number) {
    this.value = value;
    this.$cell = document.createElement('div')!;
    this.$tile = document.createElement('div')!;
    this.$tile.className = 'tile';
    this.$cell.className = 'cell';
  }

  toJSON() {
    return { value: this.value };
  }

  render() {
    this.$tile.innerText = this.value !== 0 ? this.value.toString() : '';
    this.$cell.appendChild(this.$tile);
    this.value > 0 && this.$tile.classList.add(`t${this.value <= 4096 ? this.value : 'big'}`);
    return this.$cell;
  }
}

type Direction = 'up' | 'right' | 'down' | 'left';
type Vector = { x: 1 | 0 | -1; y: 1 | 0 | -1 };

type Coordinates = {
  x: number;
  y: number;
};

class Game2048 {
  static N: number = 4;
  static $grid: HTMLDivElement = $<HTMLDivElement>('#grid')!;
  static $score: HTMLDivElement = $<HTMLDivElement>('#score')!;
  static $highscore: HTMLDivElement = $<HTMLDivElement>('#highscore')!;
  static $gameOverScreen = $<HTMLDivElement>('.gameOver')!;
  static $youWinScreen = $<HTMLDivElement>('.youWin')!;
  static $selectGrid = $<HTMLSelectElement>('#select')!;
  static grids: { [x: string]: Tile[][] } = { 4: [], 5: [], 6: [], 7: [], 8: [], 9: [], 10: [] };
  static memory: Tile[][];
  static scores: { [x: string]: number } = { 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0 };
  static highscores: { [x: string]: number } = { 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0 };
  static moved: boolean[] = [];
  static SAVE_SLOT: string = '2048-save';
  static scoreMemory: number = 0;
  static continues: { [x: string]: boolean } = {
    4: false,
    5: false,
    6: false,
    7: false,
    8: false,
    9: false,
    10: false,
  };

  static init(load = true) {
    this.scores[this.N] = 0;
    this.continues[this.N] = false;
    this.emptyBoard();

    if (load) {
      if (!this.loadFromStorage()) {
        this.setRandomTile();
        this.setRandomTile();
      }
    } else {
      this.setRandomTile();
      this.setRandomTile();
    }

    this.$grid.style.gridTemplateColumns = `repeat(${this.N}, 1fr)`;

    this.grid.forEach(row => row.forEach(t => this.$grid.appendChild(t.render())));
  }

  static get grid() {
    return this.grids[this.N];
  }

  static set grid(val: Tile[][]) {
    this.grids[this.N] = val;
  }

  static newGame() {
    this.$gameOverScreen.style.visibility = 'hidden';
    this.$gameOverScreen.style.opacity = '0%';
    this.$youWinScreen.style.visibility = 'hidden';
    this.$youWinScreen.style.opacity = '0%';
    document.addEventListener('keydown', onKeyDown);
    this.init(false);
    this.memory = [];
    this.scoreMemory = 0;
    this.savetoStorage();
    this.updateScore();
  }

  static emptyBoard() {
    this.grid = [];
    this.$grid.innerHTML = '';
    for (let i = 0; i < this.N; i++) {
      this.grid.push([]);
      for (let j = 0; j < this.N; j++) {
        this.grid[i].push(new Tile(0));
      }
    }
  }

  static serialize() {
    return JSON.stringify({
      N: this.N,
      data: Object.keys(this.scores).map(key => {
        return {
          N: key,
          grid: this.grids[key],
          score: this.scores[key],
          highscore: this.highscores[key],
          continue: this.continues[key],
        };
      }),
    });
  }

  static savetoStorage() {
    localStorage.setItem(this.SAVE_SLOT, btoa(this.serialize()));
  }

  static loadFromStorage() {
    const data = localStorage.getItem(this.SAVE_SLOT);
    if (data !== null) {
      const save = JSON.parse(atob(data));

      this.N = save.N;
      this.$selectGrid.value = this.N.toString();

      save.data.forEach((score: { N: string | number; score: number; highscore: number; continue: boolean }) => {
        this.scores[score.N] = score.score;
        this.highscores[score.N] = score.highscore;
        this.continues[score.N] = score.continue;
      });

      this.updateScore();
      this.emptyBoard();

      save.data.forEach((g: { N: number; grid: { value: number }[][] }) => {
        this.grids[g.N] = g.grid.map((r: { value: number }[]) => {
          return r.map((t: { value: number }) => new Tile(t.value));
        });
      });

      return true;
    } else {
      return false;
    }
  }

  static handleKeyDown(e: KeyboardEvent) {
    switch (e.key) {
      case 'w':
      case 'ц':
      case 'ArrowUp':
        this.move('up');
        break;
      case 'a':
      case 'ф':
      case 'ArrowLeft':
        this.move('left');
        break;
      case 's':
      case 'ы':
      case 'ArrowDown':
        this.move('down');
        break;
      case 'd':
      case 'в':
      case 'ArrowRight':
        this.move('right');
        break;
      default:
        return;
    }
    setTimeout(() => {
      this.afterMove();
    }, 100);
  }

  static afterMove() {
    if (this.moved.some(v => v)) {
      this.setRandomTile();
      this.savetoStorage();
    } else {
      this.$grid.classList.add('error');
      setTimeout(() => {
        this.$grid.classList.remove('error');
      }, 300);
    }

    this.moved = [];
    this.render();

    if (!this.continues[this.N] && this.isWin()) {
      this.$youWinScreen.style.visibility = 'visible';
      this.$youWinScreen.style.opacity = '1';
      document.removeEventListener('keydown', onKeyDown);
    } else if (this.getEmptyCellsCoords().length === 0 && this.isGameOver()) {
      this.$gameOverScreen.style.visibility = 'visible';
      this.$gameOverScreen.style.opacity = '1';
      document.removeEventListener('keydown', onKeyDown);
    }

    this.savetoStorage();
  }

  static undo() {
    if (this.memory.length > 0) {
      this.grid = this.memory;
      this.addToScore(-this.scoreMemory);
      this.scoreMemory = 0;
      this.$gameOverScreen.style.visibility = 'hidden';
      this.$gameOverScreen.style.opacity = '0%';
      this.$youWinScreen.style.visibility = 'hidden';
      this.$youWinScreen.style.opacity = '0%';
      document.addEventListener('keydown', onKeyDown);
      this.savetoStorage();
    }
    this.render();
  }

  static setRandomTile() {
    const emptyCells = this.getEmptyCellsCoords();
    const cell = choice(emptyCells);
    if (cell) {
      const [y, x] = cell;
      const newTile = this.tileAtCoords({ x, y });
      newTile.$tile.classList.add('newTile');
      newTile.value = Math.random() < 0.9 ? 2 : 4;
    }
  }

  static isWin() {
    for (let y = 0; y < this.grid.length; y++) {
      for (let x = 0; x < this.grid.length; x++) {
        if (this.tileAtCoords({ x, y }).value === 2048) {
          return true;
        }
      }
    }
    return false;
  }

  static isGameOver(): boolean {
    let isOver = true;
    for (let y = 0; y < this.grid.length; y++) {
      for (let x = 0; x < this.grid.length - 1; x++) {
        if (this.tileAtCoords({ x, y }).value === this.tileAtCoords({ x: x + 1, y }).value) {
          isOver = false;
        }
      }
    }
    for (let y = 0; y < this.grid.length - 1; y++) {
      for (let x = 0; x < this.grid.length; x++) {
        if (this.tileAtCoords({ x, y }).value === this.tileAtCoords({ x, y: y + 1 }).value) {
          isOver = false;
        }
      }
    }
    return isOver;
  }

  static handleSelect(_: Event) {
    document.addEventListener('keydown', onKeyDown);
    this.N = +this.$selectGrid.value;
    this.memory = [];
    this.savetoStorage();
    this.render();
    this.$selectGrid.blur();
  }

  static getEmptyCellsCoords() {
    return this.grid.flatMap((r, y) =>
      r.map((_, x) => [y, x]).filter(([y, x]) => this.tileAtCoords({ x, y }).value < 1)
    );
  }

  static move(direction: Direction) {
    const memory = this.grid.map(r => r.map(t => new Tile(t.value)));
    let scoreMemory = 0;

    const v = this.getVector(direction);
    let ys = [...Array(this.N).keys()];
    let xs = [...Array(this.N).keys()];

    if (v.y === 1) ys = ys.reverse();
    if (v.x === 1) xs = xs.reverse();

    ys.forEach(y => {
      xs.forEach(x => {
        const tile = this.tileAtCoords({ x, y });
        if (tile.value > 0) {
          const { prev, next } = this.getPossibleCoords({ x, y }, v);

          if (
            this.isInbounds(next) &&
            this.tileAtCoords(next).value === tile.value &&
            !this.tileAtCoords(next).$tile.classList.contains('mergedTile')
          ) {
            this.moveTileVisually(this.tileAtCoords({ x, y }), v, next, { x, y });
            this.grid[y][x] = new Tile(0);
            const mergedTile = this.tileAtCoords(next);
            mergedTile.value *= 2;
            mergedTile.$tile.classList.add('mergedTile');
            scoreMemory += mergedTile.value;
            this.addToScore(mergedTile.value);
            this.moved.push(true);
          } else if (prev.x === x && prev.y === y) {
            this.grid[y][x] = new Tile(0);
            this.grid[y][x].value = tile.value;
            this.moved.push(false);
          } else {
            this.moveTileVisually(this.tileAtCoords({ x, y }), v, prev, { x, y });
            this.grid[y][x] = new Tile(0);
            this.tileAtCoords(prev).value = tile.value;
            this.moved.push(true);
          }
        }
      });
    });

    if (this.moved.some(vec => vec)) {
      this.memory = memory;
      this.scoreMemory = scoreMemory;
    }
  }

  private static addToScore(value: number) {
    this.scores[this.N] += value;
    this.highscores[this.N] = Math.max(this.scores[this.N], this.highscores[this.N]);
  }

  static moveTileVisually(tile: Tile, v: Vector, newTile: Coordinates, { x, y }: Coordinates) {
    if (v.x !== 0) {
      tile.$tile.style.transform = `translateX(calc(${newTile.x - x} * (var(--tile-size) + 2 * var(--space))))`;
    } else {
      tile.$tile.style.transform = `translateY(calc(${newTile.y - y} * (var(--tile-size) + 2 * var(--space))))`;
    }
  }

  static isInbounds({ x, y }: Coordinates) {
    return x >= 0 && x < this.N && y >= 0 && y < this.N;
  }

  static tileAtCoords({ x, y }: Coordinates) {
    return this.grid[y][x];
  }

  static getPossibleCoords({ x, y }: Coordinates, v: Vector) {
    let prev: Coordinates = { x, y };
    let next: Coordinates = { x, y };
    do {
      prev.x = next.x;
      prev.y = next.y;
      next.x += v.x;
      next.y += v.y;
    } while (this.isInbounds(next) && this.tileAtCoords(next).value < 1);

    return { prev, next };
  }

  static getVector(direction: Direction): Vector {
    switch (direction) {
      case 'up':
        return { x: 0, y: -1 };
      case 'down':
        return { x: 0, y: 1 };
      case 'left':
        return { x: -1, y: 0 };
      case 'right':
        return { x: 1, y: 0 };
    }
  }

  static render() {
    this.$grid.style.gridTemplateColumns = `repeat(${this.N}, 1fr)`;
    this.$grid.innerHTML = '';

    if (this.grid.length === 0) {
      this.newGame();
    }

    this.grid.forEach(row => {
      row.forEach(t => {
        this.$grid.appendChild(t.render());
      });
    });

    this.updateScore();
  }

  private static updateScore() {
    this.$score.innerHTML = this.scores[this.N].toString();
    this.$highscore.innerHTML = this.highscores[this.N].toString();
  }
}

class TouchManager {
  static x: number;
  static y: number;

  static touchStart(e: TouchEvent) {
    e.preventDefault();
    if (e.touches.length > 1) {
      return;
    }
    this.x = e.touches[0].clientX;
    this.y = e.touches[0].clientY;
  }

  static touchEnd(e: TouchEvent) {
    e.preventDefault();
    if (e.touches.length > 1) {
      return;
    }
    const x = e.changedTouches[0].clientX;
    const y = e.changedTouches[0].clientY;

    const dx = x - this.x;
    const dy = y - this.y;

    if (Math.abs(dx) > 50 || Math.abs(dy) > 50) {
      if (Math.abs(dx) > Math.abs(dy)) {
        Game2048.move(dx > 0 ? 'right' : 'left');
      } else {
        Game2048.move(dy > 0 ? 'down' : 'up');
      }
      setTimeout(() => {
        Game2048.afterMove();
      }, 100);
      Game2048.savetoStorage();
    }
  }
}

Game2048.init();

document.querySelectorAll('.newGameBtn')?.forEach(btn => {
  btn.addEventListener('click', Game2048.newGame.bind(Game2048));
});
$('#undo')?.addEventListener('click', Game2048.undo.bind(Game2048));
document.addEventListener('keydown', onKeyDown);
Game2048.$selectGrid.addEventListener('change', Game2048.handleSelect.bind(Game2048));
$('#continue')?.addEventListener('click', () => {
  Game2048.$youWinScreen.style.visibility = 'hidden';
  Game2048.$youWinScreen.style.opacity = '0%';
  Game2048.continues[Game2048.N] = true;
  document.addEventListener('keydown', onKeyDown);
});

const handletouchStart = TouchManager.touchStart;
const handletouchEnd = TouchManager.touchEnd;

Game2048.$grid.addEventListener('touchstart', handletouchStart);
Game2048.$grid.addEventListener('touchend', handletouchEnd);
