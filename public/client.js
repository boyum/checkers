class CheckersPiece {
  /**
   * @param {CheckerboardCell} cell
   * @param {'black'|'white'} color
   */
  constructor(cell, color) {
    this.cell = cell;
    this.color = color;
    this.isDouble = false;
    this._shiftX = 0;
    this._shiftY = 0;

    this._isDragged = false;

    this.createPieceElement();
  }

  startDragging() {
    this._isDragged = true;
    this.element.classList.add('piece--is-dragged');

    const bcr = this.element.getBoundingClientRect();
    this._shiftX = event.clientX - bcr.left;
    this._shiftY = event.clientY - bcr.top;
  }

  stopDragging() {
    if (!this._isDragged) {
      return;
    }

    this._isDragged = false;
    this.element.classList.remove('piece--is-dragged');

    this.resetPosition();
  }

  moveElement(pageX, pageY) {
    if (!this._isDragged) {
      return;
    }

    this.element.style.left = (pageX - this._shiftX) + 'px';
    this.element.style.top = (pageY - this._shiftY) + 'px';
  }

  createPieceElement() {
    this.element = document.createElement('div');
    this.element.classList.add('piece', `piece--${this.color}`);
  }

  resetPosition() {
    this.element.style.left = null;
    this.element.style.top = null;

    this._shiftX = 0;
    this._shiftY = 0;
  }
  
  die() {
    this.cell.piece = null;
    this.element.parentNode.removeChild(this.element);
  }
}

class CheckerboardCell {
  /**
   * @param {number} x
   * @param {number} y
   * @param {'black'|'white'} color
   */
  constructor(x, y, color) {
    this.x = x;
    this.y = y;
    this.color = color;

    /** @type {CheckersPiece} */
    this.piece = null;

    this.createCellElement();
  }

  createCellElement() {
    this.element = document.createElement('div');
    this.element.classList.add('cell', `cell--${this.color}`);
  }
}

class Checkers {
  constructor(element) {
    /** @type {HTMLElement} */
    this.element = element;
    /** @type {CheckerBoardCell[][]} */
    this.cells = [];
    /** @type {CheckersPiece[]} */
    this.whitePieces = [];
    /** @type {CheckersPiece[]} */
    this.blackPieces = [];
    /** @type {CheckersPiece} */
    this._draggedPiece = null;
    /** @type {CheckerboardCell} */
    this._activeCell = null;
    this._legalMoves = null;
    this._legalSkipMoves = null;
    
    this.players = [{
        id: 0,
        color: 'white',
      },
      {
        id: 1,
        color: 'black',
      },
    ]

    this.turn = {
      number: 0,
      player: this.players[0],
    };

    this.cellParent = document.createElement('div');
    this.cellParent.classList.add('cell-parent');

    this.element.appendChild(this.cellParent);

    this.initBoard();
    this.addEventListeners();
  }

  initBoard() {
    const rows = 8;
    const columns = 8;

    for (let i = 0; i < rows; i++) {
      this.cells.push([]);
      for (let j = 0; j < columns; j++) {
        const cellIsWhite = (i % 2 === 0 && j % 2 === 0) || (i % 2 === 1 && j % 2 === 1);
        const cellColor = cellIsWhite ? 'white' : 'black';

        const cell = new CheckerboardCell(j, i, cellColor);
        const cellElement = cell.element;

        this.cells[i].push(cell);
        this.cellParent.appendChild(cellElement);

        const cellHasPiece = !cellIsWhite && (i < 3 || i > 4);
        if (cellHasPiece) {
          const pieceColor = i < 3 ? 'white' : 'black';
          const piece = new CheckersPiece(cell, pieceColor);

          if (pieceColor === 'white') {
            this.whitePieces.push(piece);
          } else {
            this.blackPieces.push(piece);
          }

          cell.piece = piece;

          cellElement.appendChild(piece.element);
        }
      }
    }
  }

  addEventListeners() {
    this.element.addEventListener('mousedown', this.startDragging.bind(this));
    window.addEventListener('mouseup', this.stopDragging.bind(this));

    this.element.addEventListener('touchstart', this.startDragging.bind(this));
    window.addEventListener('touchend', this.stopDragging.bind(this));

    document.addEventListener('dragstart', event => event.preventDefault());
  }

  startDragging(event) {
    window.addEventListener('mousemove', this.drag.bind(this));

    const draggedElement = event.target.closest('.piece');
    
    if (!draggedElement) {
      return;
    }
    
    this._draggedPiece = this.findPieceFromElement(draggedElement);

    const wrongTurn = this._draggedPiece.color !== this.turn.player.color;

    if (!this._draggedPiece || wrongTurn) {
      return;
    }

    this._draggedPiece.startDragging();

    if (!this._legalMoves) {
      this._legalMoves = this.calculateLegalMoves({
        currentCell: this._activeCell || this._draggedPiece.cell,
        color: this._draggedPiece.color,
        cells: this.cells,
        yDirection: this._draggedPiece.color === 'white' ? 1 : -1,
        pieceCanMoveBackwards: this._draggedPiece.isDouble
      });

      this._legalMoves.forEach(({move}) => {
        move.element.classList.add('cell--legal-move');
      });
    }
  }

  stopDragging() {
    window.removeEventListener('mousemove', this.drag.bind(this));

    if (!this._draggedPiece || !this._activeCell) {
      return;
    }

    const newCellIsALegalMove = this._activeCell.element.classList.contains('cell--legal-move');
    if (newCellIsALegalMove) {
      this._activeCell.element.appendChild(this._draggedPiece.element);
      this._draggedPiece.cell.piece = null;
      this._activeCell.piece = this._draggedPiece;
      this._draggedPiece.cell = this._activeCell;
      
      this.upgradePiece(this._draggedPiece);
      
      const move = this._legalMoves.filter(cell => this._activeCell === cell.move)[0]; 
      if (move.skips) {
        move.skips.piece.die();
        
        // const  
      }

      this.nextTurn();
    } else {
      this._draggedPiece.resetPosition();
    }

    if (this._legalMoves) {
      this._legalMoves.forEach(({move}) => {
        move.element.classList.remove('cell--legal-move');
      });
      this._legalMoves = null;
    }

    this._draggedPiece.stopDragging();
    this._draggedPiece = null;
  }

  drag(event) {
    const activeElement = event.target.closest('.cell');
    this._activeCell = this.findCellFromElement(activeElement);

    if (!this._draggedPiece || !this._activeCell) {
      return;
    }

    this._draggedPiece.moveElement(event.pageX, event.pageY);
  }

  /**
   * @param {Object} param0
   * @param {CheckerboardCell} param0.currentCell
   * @param {1|-1} param0.yDirection
   * @param {boolean} pieceCanMoveBackwards
   * @param {CheckerboardCell[]} param0.cells
   * @param {'white'|'black'} param0.color
   * @return {CheckerboardCell[]}
   */
  calculateLegalMoves({currentCell, yDirection, pieceCanMoveBackwards, cells, color}) {
    const isByFarEnd = yDirection > 0 ? currentCell.y === 7 : currentCell.y === 0;
    const isByOwnEnd = yDirection < 0 ? currentCell.y === 7 : currentCell.y === 0;    
    
    /** @type {CheckerboardCell[]} */
    const legalMoves = [];

    if (!isByFarEnd) {
      const legalLeftMove = this.calculateLegalMove({currentCell, xDirection: -1, yDirection, cells, color});
      if (legalLeftMove) {
        legalMoves.push(legalLeftMove);
      }
      
      const legalRightMove = this.calculateLegalMove({currentCell, xDirection: 1, yDirection, cells, color});
      if (legalRightMove) {
        legalMoves.push(legalRightMove);
      }
    }
    if (pieceCanMoveBackwards && !isByOwnEnd) {
      yDirection *= -1;
      
      const legalLeftMove = this.calculateLegalMove({currentCell, xDirection: -1, yDirection, cells, color});
      if (legalLeftMove) {
        legalMoves.push(legalLeftMove);
      }
      
      const legalRightMove = this.calculateLegalMove({currentCell, xDirection: 1, yDirection, cells, color});
      if (legalRightMove) {
        legalMoves.push(legalRightMove);
      }
    }
    return legalMoves;
  }

  calculateLegalMove({currentCell, xDirection, yDirection, cells, color}) {
    let legalMove = null;
    let cell;
    let isByBorder; 
    let hasPiece;
    const goesLeft = xDirection < 0; 
    
    if (goesLeft) {
      const {cell: c, isByBorder: i, hasPiece: h} = this.checkCellLeft(currentCell, yDirection, cells);
      cell = c;
      isByBorder = i;
      hasPiece = h;
    } else {
      const {cell: c, isByBorder: i, hasPiece: h} = this.checkCellRight(currentCell, yDirection, cells);
      cell = c;
      isByBorder = i;
      hasPiece = h;
    }
    
    if (!cell) {
      return legalMove;
    }
    
    const cellIsValid = !isByBorder && !hasPiece;
    const canSkip = !isByBorder && this.cellHasPieceOfOppositeColor(cell, color);
    
    if (cellIsValid) {
      legalMove = {move: cell, skips: null};
    } else if (canSkip) {
      let cellNext;
      let isByBorderNext;
      let hasPieceNext;
      
      if (goesLeft) {
        const {cell: c2, isByBorder: i2, hasPiece: h2} = this.checkCellLeft(cell, yDirection, cells);
        cellNext = c2;
        isByBorderNext = i2;
        hasPieceNext = h2;
      } else {
        const {cell: c2, isByBorder: i2, hasPiece: h2} = this.checkCellRight(cell, yDirection, cells);
        cellNext = c2;
        isByBorderNext = i2;
        hasPieceNext = h2;
      }
      
      const cellNextIsValid = !isByBorderNext && !hasPieceNext;
      
      if (cellNext && cellNextIsValid) {
        legalMove = {move: cellNext, skips: cell, xDirection, yDirection};
      }
    }      
    
    return legalMove;
  }
  
  checkCellLeft(currentCell, yDirection, cells) {
    const xDirection = -1;

    const isByLeftBorder = currentCell.x === 0;

    const validCell = this.checkIfCellIsValid(currentCell, xDirection, yDirection, cells);
    validCell.isByBorder = isByLeftBorder;
    
    return validCell;
  }

  checkCellRight(currentCell, yDirection, cells) {
    const xDirection = 1;

    const isByRightBorder = currentCell.x === 7;

    const validCell = this.checkIfCellIsValid(currentCell, xDirection, yDirection, cells);
    validCell.isByBorder = isByRightBorder;
    
    return validCell;
  }

  checkIfCellIsValid(currentCell, xDirection, yDirection, cells) {
    const newX = currentCell.x + xDirection;
    const newY = currentCell.y + yDirection;
    
    const isOutOfBounds = (newX < 0 || newX >= cells.length) || (newY < 0 || newY >= cells.length);
    
    if (isOutOfBounds) {
      return {
        isByBorder: false,
        hasPiece: false,
        cell: null
      }; 
    }
    
    const cell = cells[newY][newX];

    if (!cell) {
      return {
        isByBorder: false,
        hasPiece: false,
        cell: null
      };
    }

    const hasPiece = this.cellHasPiece(cell);

    return {
      isByBorder: false,
      hasPiece,
      cell
    };
  }

  cellHasPiece(cell) {
    return !!cell.element.querySelector('.piece');
  }
  
  cellHasPieceOfOppositeColor(cell, color) {
    const oppositeColor = color === 'white' ? 'black' : 'white';
    return !!cell.element.querySelector(`.piece--${oppositeColor}`);
  }

  /**
   * @param {HTMLElement} element 
   * @return {CheckersPiece}
   */
  findPieceFromElement(element) {
    if (!element) {
      return null;
    }

    const pieceIsWhite = element.classList.contains('piece--white');
    const pieceGroup = pieceIsWhite ? this.whitePieces : this.blackPieces;

    return pieceGroup.filter(piece => piece.element === element)[0];
  }

  /**
   * @param {HTMLElement} element 
   * @return {CheckerboardCell}
   */
  findCellFromElement(element) {
    if (!element) {
      return null;
    }

    return this.cells.flat()
      .filter(cell => cell.element === element)[0];
  }

  nextTurn() {
    this.turn.number++;

    const nextPlayerId = (this.turn.player.id + 1) % this.players.length;
    const nextPlayer = this.players[nextPlayerId];

    this.turn.player = nextPlayer;
  }
  
  upgradePiece(piece) {
    if (this.pieceShouldUpgrade(piece)) {
      piece.isDouble = true;
      
      piece.element.classList.add('piece--double');
    } 
  }
  
  pieceShouldUpgrade(piece) {
    if (!piece || piece.isDouble) {
      return false;
    }
    
    return (piece.color === 'white' && piece.cell.y === 7) || (piece.color === 'black' && piece.cell.y === 0);
  }
}

function init() {
  const checkerBoardElement = document.querySelector('.js-checkerboard');
  const checkers = new Checkers(checkerBoardElement);
}

document.addEventListener('DOMContentLoaded', init);