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

class Game {
  static N: number = 4;
  static $grid: HTMLDivElement = document.querySelector<HTMLDivElement>('#grid')!;
  static $score: HTMLDivElement = document.querySelector<HTMLDivElement>('#score')!;
  static $highscore: HTMLDivElement = document.querySelector<HTMLDivElement>('#highscore')!;
  static grids: { [x: string]: Tile[][] } = { 4: [], 5: [], 6: [], 7: [], 8: [], 9: [], 10: [] };
  static memory: Tile[][];
  static scores: { [x: string]: number } = { 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0 };
  static highscores: { [x: string]: number } = { 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, 9: 0, 10: 0 };
  static moved: boolean[] = [];
  static SAVE_SLOT: string = '2048-save';
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

    this.grids[this.N].forEach(row => row.forEach(t => this.$grid.appendChild(t.render())));
  }

  static newGame() {
    document.querySelector<HTMLDivElement>('.gameOver')!.style.display = 'none';
    document.addEventListener('keydown', onKeyDown);
    this.init(false);
    this.savetoStorage();
    this.updateScore();
  }

  static emptyBoard() {
    this.grids[this.N] = [];
    this.$grid.innerHTML = '';
    for (let i = 0; i < this.N; i++) {
      this.grids[this.N].push([]);
      for (let j = 0; j < this.N; j++) {
        this.grids[this.N][i].push(new Tile(0));
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
      const select = document.querySelector<HTMLSelectElement>('#select')!;
      select.value = this.N.toString();

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
      if (this.moved.some(v => v)) {
        this.setRandomTile();
        this.savetoStorage();
      } else {
        this.$grid.classList.add('error');
        setTimeout(() => {
          this.$grid.classList.remove('error');
        }, 300);
      }

      if (this.isWin() && !this.continues[this.N]) {
        document.querySelector<HTMLDivElement>('.youWin')!.style.display = 'block';
        document.removeEventListener('keydown', onKeyDown);
      }

      this.moved = [];
      this.render();

      if (this.getEmptyCellsCoords().length === 0 && this.isGameOver()) {
        document.querySelector<HTMLDivElement>('.gameOver')!.style.display = 'block';
        document.removeEventListener('keydown', onKeyDown);
      }
    }, 100);
    this.savetoStorage();
  }

  static undo() {
    if (this.memory.length > 0) {
      this.grids[this.N] = this.memory;
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
    for (let y = 0; y < this.grids[this.N].length - 1; y++) {
      for (let x = 0; x < this.grids[this.N].length - 1; x++) {
        if (this.tileAtCoords({ x, y }).value === 2048) {
          return true;
        }
      }
    }
    return false;
  }

  static isGameOver(): boolean {
    let isOver = true;
    for (let y = 0; y < this.grids[this.N].length - 1; y++) {
      for (let x = 0; x < this.grids[this.N].length - 1; x++) {
        if (this.tileAtCoords({ x, y }).value === this.tileAtCoords({ x: x + 1, y }).value) {
          isOver = false;
        }
        if (this.tileAtCoords({ x, y }).value === this.tileAtCoords({ x, y: y + 1 }).value) {
          isOver = false;
        }
      }
    }
    return isOver;
  }

  static handleSelect(e: Event) {
    document.addEventListener('keydown', onKeyDown);
    const select = e.target as HTMLSelectElement;
    this.N = +select.value;
    this.memory = [];
    this.savetoStorage();
    this.render();
    select.blur();
  }

  static getEmptyCellsCoords() {
    return this.grids[this.N].flatMap((r, y) =>
      r.map((_, x) => [y, x]).filter(([y, x]) => this.tileAtCoords({ x, y }).value < 1)
    );
  }

  static move(direction: Direction) {
    this.memory = this.grids[this.N].map(r => r.map(t => new Tile(t.value)));

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
            this.grids[this.N][y][x] = new Tile(0);
            const mergedTile = this.tileAtCoords(next);
            mergedTile.value *= 2;
            mergedTile.$tile.classList.add('mergedTile');
            this.addToScore(mergedTile.value);
            this.moved.push(true);
          } else if (prev.x === x && prev.y === y) {
            this.grids[this.N][y][x] = new Tile(0);
            this.grids[this.N][y][x].value = tile.value;
            this.moved.push(false);
          } else {
            this.moveTileVisually(this.tileAtCoords({ x, y }), v, prev, { x, y });
            this.grids[this.N][y][x] = new Tile(0);
            this.tileAtCoords(prev).value = tile.value;
            this.moved.push(true);
          }
        }
      });
    });
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
    return this.grids[this.N][y][x];
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

    if (this.grids[this.N].length === 0) {
      this.newGame();
    }

    this.grids[this.N].forEach(row => {
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

const choice = <T>(list: Array<T>): T => {
  return list[Math.floor(Math.random() * list.length)];
};

const onKeyDown = (e: KeyboardEvent) => {
  Game.handleKeyDown(e);
};

Game.init();
document.querySelectorAll('.newGameBtn')?.forEach(btn => {
  btn.addEventListener('click', Game.newGame.bind(Game));
});
document.querySelector('#undo')?.addEventListener('click', Game.undo.bind(Game));
document.addEventListener('keydown', onKeyDown);
document.querySelector('#select')?.addEventListener('change', Game.handleSelect.bind(Game));
document.querySelector('#continue')?.addEventListener('click', () => {
  document.querySelector<HTMLDivElement>('.youWin')!.style.display = 'none';
  Game.continues[Game.N] = true;
  document.addEventListener('keydown', onKeyDown);
});
