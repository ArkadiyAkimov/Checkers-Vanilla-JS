gamesContainer = document.getElementById('gamesContainer');

class Game {
  constructor(gameId) {
    this.UniqueGameId = gameId;
    this.board = new Board(gameId);
  }
}

class Board {
  constructor(gameId) {
    this.UniqueGameId = gameId;
    this.spaces = [];
    this.createBoard();
    this.graphics = new Graphics(this);
    this.isBlackTurn = true;
    this.graphics.createVisualBoard(this.spaces);
    this.moveFrom;
    this.moveTo;
    this.justAte;
    this.winner;
    this.whiteCanMove = true;
    this.BlackCanMove = true;
    this.eatenDuringLastTurn = [];
    this.eatenDuringLastTurnCount = 0;
    this.isAdditionalMove = false;
    this.wasAdditionalMove = false;
    this.phase;
  }

  createBoard() {
    let dropLine = 0;
    let isWithinGame = false;
    for (let i = 0; i < 64; i++) {
      if (isWithinGame) {
        if (i < 24) this.spaces[i] = new Space(true, false, true, false);
        else if (i > 39) this.spaces[i] = new Space(true, false, false, false);
        else this.spaces[i] = new Space(true, true);
      } else this.spaces[i] = new Space(false, true);
      isWithinGame = !isWithinGame;

      dropLine++;
      if (dropLine === 8) {
        dropLine = 0;
        isWithinGame = !isWithinGame;
      }
    }
  }

  addToEatList(eatenPiece) {
    this.eatenDuringLastTurn[this.eatenDuringLastTurnCount] = eatenPiece;
    this.eatenDuringLastTurnCount++;
  }

  clearEatList() {
    this.eatenDuringLastTurnCount = 0;
    this.eatenDuringLastTurn = [];
  }

  hasMoved() {
    this.burnPieces();
    this.justAte = null;
  }
  hasEaten(moveTo, eatenPieceLocation) {
    this.spaces[eatenPieceLocation] = new Space(true, true);
    this.addToEatList(eatenPieceLocation);
    this.justAte = moveTo;
  }

  movePiece(moveFrom, moveTo) {
    let validMove = false;
    const movingPiece = this.spaces[moveFrom];
    const destination = this.spaces[moveTo];
    const eatenPiece = this.spaces[moveFrom - (moveFrom - moveTo) / 2];
    const eatenPieceLocation = Number(moveFrom - (moveFrom - moveTo) / 2);
    if (destination.isEmpty === true) {
      //movement to empty spaces only
      switch (moveFrom - moveTo) {
        case 7:
        case 9:
          if (!movingPiece.isWhite || movingPiece.isCrowned) {
            this.hasMoved();
            validMove = true;
          }
          break;
        case 14:
        case 18:
          if (
            (!movingPiece.isWhite && eatenPiece.isWhite && !eatenPiece.isEmpty) ||
            ((this.justAte === moveFrom || movingPiece.isCrowned) && !eatenPiece.isWhite && !eatenPiece.isEmpty)
          ) {
            this.hasEaten(moveTo, eatenPieceLocation);
            validMove = true;
          }
          break;
        case -7:
        case -9:
          if (movingPiece.isWhite || movingPiece.isCrowned) {
            this.hasMoved();
            validMove = true;
          }
          break;
        case -14:
        case -18:
          if (
            (movingPiece.isWhite && !eatenPiece.isWhite && !eatenPiece.isEmpty) ||
            ((this.justAte === moveFrom || movingPiece.isCrowned) && eatenPiece.isWhite && !eatenPiece.isEmpty)
          ) {
            this.hasEaten(moveTo, eatenPieceLocation);
            validMove = true;
          }
          break;
      }

      if (validMove) {
        if ((movingPiece.isWhite ? moveTo > 56 : moveTo < 9) && !movingPiece.isCrowned) {
          this.crownPiece(moveFrom, moveTo);
        }
        // atual movement to and cleaning from location
        this.spaces[moveTo] = this.spaces[moveFrom];
        this.spaces[moveFrom] = new Space(true, true);
        // check what pieces can eat and move!
        this.updatePieceState();
        // determine if additional move state
        if (this.justAte != null && this.spaces[moveTo].isEatingMandatory) {
          this.isAdditionalMove = true;
        } else {
          this.clearEatList();

          if (this.isAdditionalMove) {
            this.wasAdditionalMove = true;
            this.isAdditionalMove = false;
          } else {
            this.isAdditionalMove = false;
          }
        }

        if (this.isAdditionalMove) {
          this.phase = 'ADDITIONAL_MOVE_PHASE';
        } else {
          if (!this.wasAdditionalMove) {
            this.phase = 'WAS_NOT_ADDITIONAL_MOVE_PHASE';
            this.isBlackTurn = !this.isBlackTurn;
          } else {
            this.phase = 'WAS_ADDITIONAL_MOVE_PHASE';
          }
        }
      }
    }
  }

  crownPiece(moveFrom, moveTo) {
    this.spaces[moveFrom].isCrowned = true;
    this.graphics.writeMessage(`${moveTo} was crowned`);
  }

  burnPieces() {
    for (let i = 0; i < 64; i++) {
      let thisPiece = this.spaces[i];
      if (thisPiece.isEatingMandatory && thisPiece.isWhite !== this.isBlackTurn) {
        this.graphics.writeMessage(`${i} burnt`);
        this.spaces[i] = new Space(true, true);
      }
    }
  }

  updatePieceState() {
    for (let i = 0; i < 64; i++) {
      this.canPieceEat(i);
    }
    this.canPiecesMove();
  }

  canPiecesMove() {
    this.blackCanMove = false;
    this.whiteCanMove = false;

    for (let i = 0; i < 64; i++) {
      if (this.spaces[i].isWithinGame && !this.spaces[i].isEmpty && this.spaces[i].canMove) {
        if (!this.spaces[i].isWhite) {
          this.blackCanMove = true;
        } else {
          this.whiteCanMove = true;
        }
      }
    }
    if (!this.blackCanMove) {
      this.graphics.writeMessage('Black');
      this.graphics.writeMessage('cant');
      this.graphics.writeMessage('move!!!');
      this.winner = 'WHITE';
    }
    if (!this.whiteCanMove) {
      this.graphics.writeMessage('White');
      this.graphics.writeMessage('cant');
      this.graphics.writeMessage('move!!!');
      this.winner = 'BLACK';
    }
  }

  isMovingValid(location, moveDirection, isWhiteDirection) {
    let movingPiece = this.spaces[location];
    let destinationSpace = this.spaces[location + moveDirection];
    if (
      destinationSpace != null &&
      !movingPiece.isEmpty &&
      (movingPiece.isWhite === isWhiteDirection || movingPiece.isCrowned) &&
      destinationSpace.isEmpty &&
      destinationSpace.isWithinGame
    )
      return true;
    return false;
  }

  isEatingValid(location, eatDirection, isWhiteDirection) {
    let eatingPiece = this.spaces[location];
    let eatenPiece = this.spaces[location + eatDirection / 2];
    let eatMoveDestination = this.spaces[location + eatDirection];
    if (
      eatMoveDestination != null &&
      !eatingPiece.isEmpty &&
      (eatingPiece.isWhite === isWhiteDirection || eatingPiece.isCrowned) &&
      eatenPiece.isWhite !== eatingPiece.isWhite &&
      eatMoveDestination.isEmpty &&
      eatMoveDestination.isWithinGame &&
      !eatenPiece.isEmpty
    )
      return true;

    return false;
  }

  canPieceEat(location) {
    let mustThisEat = false;
    let thisCanMove = false;
    let wasThisCrowned = this.spaces[location].isCrowned;

    if (location == this.justAte) {
      this.spaces[location].isCrowned = true;
    }
    // ::: EATING :::
    if (
      this.isEatingValid(location, -14, false) ||
      this.isEatingValid(location, -18, false) ||
      this.isEatingValid(location, 14, true) ||
      this.isEatingValid(location, 18, true)
    ) {
      mustThisEat = true;
      thisCanMove = true;
    }
    // ::: MOVEMENT :::
    if (
      this.isMovingValid(location, -7, false) ||
      this.isMovingValid(location, -9, false) ||
      this.isMovingValid(location, 7, true) ||
      this.isMovingValid(location, 9, true)
    ) {
      thisCanMove = true;
    }

    this.spaces[location].isCrowned = wasThisCrowned;

    if (thisCanMove) {
      this.spaces[location].canMove = true;
    } else this.spaces[location].canMove = false;

    if (mustThisEat) {
      this.spaces[location].isEatingMandatory = true;
    } else this.spaces[location].isEatingMandatory = false;
  }
}

class Space {
  constructor(isWithinGame, isEmpty, isWhite, isCrowned) {
    this.isWithinGame = isWithinGame;
    this.isEmpty = isEmpty;
    this.isWhite = isWhite;
    this.isCrowned = isCrowned;
    this.isEatingMandatory = false;
    this.canMove;
  }
}

class Graphics {
  constructor(board) {
    this.statusMessages = [];
    for (let i = 1; i < 5; i++) {
      this.statusMessages[i] = '';
    }
    this.board = board;

    this.gameBox = document.createElement('div');
    this.appendElementSetClassesAndInnerText(gamesContainer, this.gameBox, 'game-box');

    this.menuBox = document.createElement('div');
    this.appendElementSetClassesAndInnerText(this.gameBox, this.menuBox, 'menu-box');
    this.createMenu();

    this.statusMenuBox = document.createElement('div');
    this.appendElementSetClassesAndInnerText(this.gameBox, this.statusMenuBox, 'status-menu-box');
    this.createStatus();

    this.boardBox = document.createElement('div');
    this.appendElementSetClassesAndInnerText(this.gameBox, this.boardBox, 'board-box');

    this.modalBox = document.createElement('div');
    this.appendElementSetClassesAndInnerText(this.gameBox, this.modalBox, 'modal-box');

    this.modalMessage = document.createElement('div');
    this.appendElementSetClassesAndInnerText(this.modalBox, this.modalMessage, 'modal-message', `Would you like to resign?`);
    this.createModalButtons();
    this.modalBox.classList.add('none');
  }

  appendElementSetClassesAndInnerText(parentElement, childElement, className, innerText, parentClass) {
    childElement.classList.add(`${className}`);
    parentElement.appendChild(childElement);
    if (innerText != null) childElement.innerText = innerText;
    if (parentClass != null) parentElement.classList.add(parentClass);
  }

  createModalButtons() {
    this.modalbuttons = [];
    for (let i = 0; i < 2; i++) {
      this.modalbuttons[i] = document.createElement('div');
      this.appendElementSetClassesAndInnerText(this.modalMessage, this.modalbuttons[i], 'modal-button');
    }
    this.assignElementClassAndInnerText(this.modalbuttons[0], 'modal-yes-button', 'Yes');
    this.modalbuttons[0].addEventListener('click', () => this.modalYesButton());

    this.assignElementClassAndInnerText(this.modalbuttons[1], 'modal-no-button', 'No');
    this.modalbuttons[1].addEventListener('click', () => {
      this.modalBox.classList.add('none');
    });
  }

  assignElementClassAndInnerText(element, elmClass, elmInnerText) {
    element.classList.add(elmClass);
    element.innerText = elmInnerText;
  }

  modalYesButton() {
    this.board.winner = this.board.isBlackTurn;
    if (this.board.winner == null) {
      this.modalMessage.innerText = `ITS A DRAW!!!`;
    } else this.modalMessage.innerText = `${this.board.isBlackTurn ? 'WHITE' : 'BLACK'} IS THE WINNER!!!`;
    this.createModalExitButton();
  }

  createModalExitButton() {
    this.modalbuttons[3] = document.createElement('div');
    this.modalbuttons[3].classList.add('modal-button');
    this.modalbuttons[3].classList.add('modal-yes-button');
    this.modalbuttons[3].innerText = 'Exit';
    this.modalbuttons[3].addEventListener('click', () => {
      gamesContainer.removeChild(this.gameBox);
    });
    this.modalMessage.appendChild(this.modalbuttons[3]);
  }

  createMenu() {
    this.buttonBoxes = [];
    this.buttons = [];

    for (let i = 0; i < 5; i++) {
      this.buttonBoxes[i] = document.createElement('div');
      this.appendElementSetClassesAndInnerText(this.menuBox, this.buttonBoxes[i], 'button-box');
      this.buttons[i] = document.createElement('div');
      this.appendElementSetClassesAndInnerText(this.buttonBoxes[i], this.buttons[i], 'button');
    }

    this.buttons[0].innerText = `Game: ${this.board.UniqueGameId + 1}`;
    this.createMenuButton(this.buttons[1], 'New', 'click', this.startNewGame);
    this.createMenuButton(this.buttons[2], 'Resign', 'click', () => this.modalBox.classList.remove('none'));
    this.createMenuDrawFunction();
    this.createMenuExitFunction();
  }

  createMenuButton(btnEl, btnInnerText, btnEvent, btnEventCallback) {
    btnEl.innerText = btnInnerText;
    btnEl.addEventListener(btnEvent, () => btnEventCallback());
  }

  writeMessage(message) {
    for (let i = 1; i < 5; i++) {
      if (this.statusMessages[i] === '') {
        this.statusMessages[i] = message;
        break;
      }
    }
  }

  createStatus() {
    this.statusBoxes = [];
    this.statuses = [];
    for (let i = 0; i < 5; i++) {
      this.statusBoxes[i] = document.createElement('div');
      this.appendElementSetClassesAndInnerText(this.statusMenuBox, this.statusBoxes[i], 'status-box');
      this.statuses[i] = document.createElement('div');
      this.appendElementSetClassesAndInnerText(this.statusBoxes[i], this.statuses[i], 'status');
    }
    this.statuses[0].innerText = !this.board.isBlackTurn ? 'Whites Turn' : 'Blacks Turn';
    this.statuses[1].innerText = this.statusMessages[1];
    this.statuses[2].innerText = this.statusMessages[2];
    this.statuses[3].innerText = this.statusMessages[3];

    for (let i = 1; i < 4; i++) this.statusMessages[i] = '';
  }

  convertThisStatus4ToSkipButton(justAte) {
    this.statuses[4].innerText = 'Finish Turn';
    this.statuses[4].classList.add('status-button');
    this.statuses[4].addEventListener('click', () => {
      this.board.isAdditionalMove = false;

      if (this.board.spaces[justAte].isEatingMandatory) {
        for (let i = this.board.eatenDuringLastTurnCount; i >= 0; i--) {
          this.board.spaces[this.board.eatenDuringLastTurn[i]] = new Space(true, false, this.board.isBlackTurn, false);
          this.board.spaces[this.board.justAte] = new Space(true, true);
        }
      }

      this.board.clearEatList();
      this.board.isBlackTurn = !this.board.isBlackTurn;
      this.board.updatePieceState();
      this.createVisualBoard(this.board.spaces, this.board.isAdditionalMove);

      if (this.board.winner != null) {
        this.modalBox.classList.remove('none');
        this.modalMessage.innerText = `${this.winner} IS THE WINNER!!!`;
        this.createModalExitButton();
        this.modalMessage.appendChild(this.modalbuttons[3]);
      }
    });
  }

  createVisualBoard(gameSpaces, isAdditionalMove) {
    this.gameBox.removeChild(this.menuBox);
    this.menuBox = document.createElement('div');
    this.appendElementSetClassesAndInnerText(this.gameBox, this.menuBox, 'menu-box');
    this.createMenu();

    this.gameBox.removeChild(this.statusMenuBox);
    this.statusMenuBox = document.createElement('div');
    this.appendElementSetClassesAndInnerText(this.gameBox, this.statusMenuBox, 'status-menu-box');
    this.createStatus();

    this.gameBox.removeChild(this.boardBox);
    this.boardBox = document.createElement('div');
    this.appendElementSetClassesAndInnerText(this.gameBox, this.boardBox, 'board-box');

    this.createPiecesAndSpaces();
    for (let i = 0; i < 64; i++) {
      if (!gameSpaces[i].isWithinGame) this.assignElementClassAndInnerText(this.visualSpaces[i], 'white-space', i);
      else if (gameSpaces[i].isEmpty) {
        this.assignElementClassAndInnerText(this.visualSpaces[i], 'black-space', i);
        this.addSpaceClickEvent(this.visualSpaces[i]);
      } else if (gameSpaces[i].isWhite) {
        this.appendElementSetClassesAndInnerText(this.visualSpaces[i], this.visualPieces[i], 'white-piece', i, 'black-space');
        this.CrownIfCrowned(gameSpaces[i], this.visualPieces[i]);
        if (!this.board.isBlackTurn && !isAdditionalMove) this.addPieceClickEvent(this.visualPieces[i]);
      } else if (!gameSpaces[i].isWhite) {
        this.appendElementSetClassesAndInnerText(this.visualSpaces[i], this.visualPieces[i], 'black-piece', i, 'black-space');
        this.CrownIfCrowned(gameSpaces[i], this.visualPieces[i]);
        if (this.board.isBlackTurn && !isAdditionalMove) this.addPieceClickEvent(this.visualPieces[i]);
      }
    }
  }

  createPiecesAndSpaces() {
    this.visualSpaces = [];
    this.visualPieces = [];
    for (let i = 0; i < 64; i++) {
      this.visualSpaces[i] = document.createElement('div');
      this.visualPieces[i] = document.createElement('div');
      this.visualPieces[i].classList.add('piece');
      this.appendElementSetClassesAndInnerText(this.boardBox, this.visualSpaces[i], 'space');
    }
  }

  CrownIfCrowned(gameSpace, visualPiece) {
    if (gameSpace.isCrowned) {
      visualPiece.classList.add('crowned-piece');
    }
  }

  addPieceClickEvent(visualPiece) {
    visualPiece.addEventListener('click', () => {
      for (let i = 0; i < 64; i++) {
        this.visualPieces[i].classList.remove('selected-piece');
        this.visualSpaces[i].classList.remove('selected-space');

        if (this.board.spaces[i].isEatingMandatory && this.board.spaces[i].isWhite !== this.board.isBlackTurn) {
          this.visualPieces[i].classList.add('eating-mandatory');
        } else this.visualPieces[i].classList.remove('eating-mandatory');
      }

      visualPiece.classList.add('selected-piece');
      this.board.moveFrom = visualPiece.innerText;
    });
  }

  addSpaceClickEvent(visualSpace) {
    visualSpace.addEventListener('click', () => {
      for (let i = 0; i < 64; i++) {
        this.visualPieces[i].classList.remove('selected-piece');
        this.visualSpaces[i].classList.remove('selected-space');
      }
      visualSpace.classList.add('selected-space');
      this.board.moveTo = visualSpace.innerText;
      if (this.board.isAdditionalMove) {
        this.board.moveFrom = this.board.justAte;
      }
      if (this.board.moveFrom != null) {
        this.board.movePiece(this.board.moveFrom, this.board.moveTo);
        this.sortPhases();
      }
      this.board.moveFrom = null;
      this.board.moveTo = null;
    });
  }

  sortPhases() {
    switch (this.board.phase) {
      case 'ADDITIONAL_MOVE_PHASE':
        this.createVisualBoard(this.board.spaces, this.board.isAdditionalMove);
        this.addPieceClickEvent(this.visualPieces[this.board.justAte]);
        this.convertThisStatus4ToSkipButton(this.board.justAte);
        this.visualPieces[this.board.justAte].classList.add('selected-piece');
        break;
      case 'WAS_NOT_ADDITIONAL_MOVE_PHASE':
        this.board.updatePieceState();
        this.createVisualBoard(this.board.spaces, this.board.isAdditionalMove);
        this.justAte = null;
        break;
      case 'WAS_ADDITIONAL_MOVE_PHASE':
        this.createVisualBoard(this.board.spaces, this.board.wasAdditionalMove);
        this.visualPieces[this.board.justAte].classList.add('selected-piece');
        this.convertThisStatus4ToSkipButton(this.board.justAte);
        this.board.wasAdditionalMove = false;
        this.justAte = null;
        break;
    }
    // for winner prompt
    if (this.board.winner != null) {
      this.modalBox.classList.remove('none');
      this.modalMessage.innerText = `${this.board.winner} IS THE WINNER!!!`;
      this.createModalExitButton();
      this.modalMessage.appendChild(this.modalbuttons[3]);
    }
  }

  startNewGame() {
    gameId++;
    games[gameId] = new Game(gameId);
    window.scrollTo(0, document.body.scrollHeight);
  }
  createMenuDrawFunction() {
    this.createMenuButton(this.buttons[3], 'Draw', 'click', () => {
      this.modalMessage.innerText = `Does ${this.board.isBlackTurn ? 'white' : 'black'} player agree to a draw?`;
      this.modalBox.classList.remove('none');
      this.createModalButtons();
      this.board.isBlackTurn = null;
    });
  }

  createMenuExitFunction() {
    this.createMenuButton(this.buttons[4], 'Exit', 'click', () => {
      gamesContainer.removeChild(this.gameBox);
    });
  }
}

gameId = 0;
const games = [];
games[gameId] = new Game(gameId);
