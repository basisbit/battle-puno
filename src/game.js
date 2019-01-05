class PunoGame {
  constructor(initCardNumber, initHP, scoreGoal, extraCardDisabled, gameMode) {
    this.players = [new Player("User", initHP, false),
                    new Player("CPU1", initHP),
                    new Player("CPU2", initHP),
                    new Player("CPU3", initHP)];
    this.initCardNumber = initCardNumber;
    this.scoreGoal = scoreGoal;
    this.extraCardDisabled = extraCardDisabled;
    this.clockwise = true;
    this.currentPlayerIndex = undefined;
    this.currentColor = undefined;
    this.currentValue = undefined;
    this.deck = null;
    this.discardPile = [];
    this.penaltyCard = undefined;
    this.gameMode = gameMode;
    this.damagePool = 0;
  }

  chooseDealer() {
    let highest = 0;
    let deadlock = true;
    let firstDraw = undefined;
    while (deadlock) {
      firstDraw = this.deck.drawNumbered(4);
      deadlock = false;
      for (let i = 1; i < 4; ++i) {
        if (firstDraw[i].value > firstDraw[highest].value) {
          highest = i;
          deadlock = false;
        } else if (firstDraw[i].value === firstDraw[highest].value) {
          deadlock = true;
        }
      }
      this.deck.putback(firstDraw);
      if (deadlock) {
        debug_log("deadlock => redraw");
      }
    }
    for (let i in this.players) {
      GameManager.onCardDraw(i, [firstDraw[i]], true);
      debug_log(this.players[i].name, firstDraw[i]);
    }
    return highest & 0;
  }

  currentPlayer() {
    return this.players[this.currentPlayerIndex];
  }

  lastCard() {
    if (this.discardPile.length === 0) {
      return null;
    }
    return this.discardPile.slice(-1)[0];
  }

  drawCard(numCards) {
    if (this.gameMode === Mode.DEATH_MATCH) {
      return this.deck.draw(numCards, this.discardPile);
    } else {
      return this.deck.draw(numCards);
    }
  }

  isCardPlayable(card) {
    if (this.penaltyCard != undefined) {
      if (this.penaltyCard.value === Value.SKIP)  return false;
      return (card.isEqual(new Card(this.currentColor, Value.SKIP)) ||
              card.isEqual(new Card(this.currentColor, Value.REVERSE)));
    }
    return card.isMatched(this.currentColor, this.currentValue);
  }

  initDeck() {
    this.deck = new Deck(this.extraCardDisabled);
  }

  initPlayer() {
    for (let i in this.players) {
      this.players[i].reset();
    }
  }

  processFirstDraw() {
    this.currentPlayerIndex = this.chooseDealer();
  }

  processFirstDeal() {
    for (let i in this.players) {
      let cards = this.drawCard(this.initCardNumber);
      this.players.deal(cards);
      GameManager.onCardDraw(i, cards);
    }
  }

  drawFirstCard() {
    const firstCard = this.deck.drawColored(1)[0];
    this.discardPile.push(firstCard);
    this.setNextColorAndValue(firstCard);
    if (firstCard.value === Value.SKIP) {
      this.penaltyCard = firstCard;
    } else if (firstCard.value === Value.REVERSE) {
      this.reverse();
    }
    GameManager.onCardPlay(-1, firstCard);
    debug_log("first card", firstCard);
  }

  initialize() {
    debug_log("--------------INITIALIZE--------------");
    this.initDeck();
    this.initPlayer();
    this.processFirstDraw();
    this.processFirstDeal();
    this.drawFirstCard();
    debug_log("--------------------------------------");
  }

  isGameOver() {
    return Math.max(...this.scoreBoard) < this.scoreGoal;
  }

  isRoundOver() {
    let knockOutCount = 0;
    for (let i in this.players) {
      if (this.players[i].isGoingOut()) {
        return true;
      }
      if (this.players[i].knockOut)  ++knockOutCount;
    }
    return knockOutCount === 3;
  }

  reverse() {
    debug_log("REVERSE");
    this.clockwise = !this.clockwise;
  }

  findTarget() {
    let target = undefined;
    for (let i in this.players) {
      if (i != this.currentPlayerIndex && !this.players[i].knockOut) {
        if (target === undefined ||
           this.players[i].hand.length < this.players[target].hand.length) {
          target = i;
        }
      }
    }
    return target;
  }

  trade(player1, player2) {
    debug_log("TRADE");
    const temp = this.players[player1].hand.slice();
    this.players[player1].hand = this.players[player2].hand.slice();
    this.players[player2].hand = temp;
  }

  wildHitAll(currentPlayerIndex) {
    debug_log("WILD HIT ALL");
    for (let i in this.players) {
      if (i != currentPlayerIndex) {
        let cards = this.drawCard(2);
        this.players[i].deal(cards);
        GameManager.onCardDraw(i, cards);
      }
    }
  }

  gameResult() {
    for (let i in this.players) {
      if (this.gameMode === Mode.TRADITIONAL) {
        this.players[i].score += this.players[i].cardsPointSum();
      } else if (this.gameMode === Mode.BATTLE_PUNO ||
                 this.gameMode === Mode.DEATH_MATCH) {
        this.players[i].hp -= this.players[i].cardsPointSum();
        this.players[i].score += Math.max(this.players[i].hp, 0);
      }
    }
  }

  setNextColorAndValue(card, ext) {
    if (card.color === Color.WILD) {
      this.currentColor = getRandom(Color.RED, Color.BLUE, this.currentColor);
      debug_log("WILD CHOOSE NEXT COLOR", this.currentColor);
      if (card.value === Value.WILD_CHAOS) {
        this.currentValue = getRandom(Value.ZERO, Value.NINE);
        debug_log("WILD CHAOS, NEXT VALUE", this.currentValue);
        ext = [this.currentColor, this.currentValue];
      } else if (card.value === Value.TRADE) {
        ext[0] = this.currentColor;
        this.currentValue = undefined;
      } else {
        ext = this.currentColor;
      }
    } else {
      this.currentColor = card.color;
      this.currentValue = card.value;
    }
  }

  takeCardAction(card, ext) {
    if (card.value === Value.REVERSE) {
      this.reverse();
      ext = this.penaltyCard === undefined ? 0 : 1;
    } else if (card.value === Value.TRADE) {
      const target = this.findTarget();
      this.trade(this.currentPlayerIndex, target);
      ext = [undefined, target];
    } else if (card.value === Value.DISCARD_ALL) {
      this.currentPlayer().discardAllByColor(this.currentColor);
    } else if (card.value === Value.WILD_HIT_ALL) {
      this.wildHitAll(this.currentPlayerIndex);
    }
  }

  setDamagePool(card, ext) {
    if (this.gameMode === Mode.TRADITIONAL)  return;
    if (card.value === Value.ZERO) {
      if (this.damagePool < 30 || !!getRandom(0, 1)) {
        debug_log("+10 damage");
        this.damagePool += 10;
        ext = 1;
      } else {
        debug_log("clear damage");
        this.damagePool = 0;
        ext = 0;
      }
    } else if (Value.ONE <= card.value && card.value <= Value.NINE) {
      this.damagePool += card.value;
    }
    debug_log("damage pool", this.damagePool);
  }

  discard(card, ext=null) {
    debug_log("discard: ", card);
    this.discardPile.push(card);
    if (this.currentPlayer().hand.length != 0) {
      if (card.numbered) {
        this.setDamagePool(card, ext);
      } else {
        this.takeCardAction(card, ext);
      }
      this.setNextColorAndValue(card, ext);
      if (this.penaltyCard === undefined && card.penalty) {
        this.penaltyCard = card;
      } else {
        this.penaltyCard = undefined;
      }
    }
    if (this.currentPlayer().hand.length === 1) {
      this.currentPlayer().uno();
    }
    GameManager.onCardPlay(this.currentPlayerIndex, card, ext);
  }

  getPenalty() {
    debug_log("PENALTY");
    if (this.penaltyCard.value === Value.SKIP) {
      debug_log("SKIP");
      this.penaltyCard = undefined;
    } else {
      const avoidCard = this.currentPlayer().receivePenalty(this.penaltyCard);
      if (avoidCard != null) {
        discard(avoidCard, 1);
      } else {
        let cards = undefined;
        if (this.penaltyCard.value === Value.DRAW_TWO) {
          debug_log("DRAW TWO");
          cards = this.drawCard(2);
        } else if (this.penaltyCard.value === Value.WILD_DRAW_FOUR) {
          debug_log("DRAW FOUR");
          cards = this.drawCard(4);
        }
        this.currentPlayer().deal(cards);
        GameManager.onCardDraw(this.currentPlayerIndex, cards);
        this.penaltyCard = undefined;
      }
    }
  }

  beginTurn() {
    debug_log(this.currentPlayer().name, "round");
    if (this.gameMode != Mode.TRADITIONAL) {
      debug_log("hp:", this.currentPlayer().hp);
    }
    debug_log("hand", this.currentPlayer().hand.slice());
    debug_log("last card:", this.lastCard());
    debug_log("CURRENT COLOR:", this.currentColor);
    debug_log("CURRENT VALUE:", this.currentValue);
    /**************************************************************************/
    // death match
    if (this.gameMode === Mode.DEATH_MATCH) {
      let numCardsDiff = this.initCardNumber - this.currentPlayer().hand.length;
      if (numCardsDiff > 0) {
        debug_log("DEATH MATCH DRAW");
        let cards = this.drawCard(diff);
        this.currentPlayer().deal(cards);
        debug_log("hand", this.currentPlayer().hand.slice());
        GameManager.onCardDraw(this.currentPlayerIndex, cards);
      }
    }
    /**************************************************************************/
    // penalty
    if (this.penaltyCard != undefined) {
      this.getPenalty();
      return;
    }
    /**************************************************************************/
    let matchedCard = this.currentPlayer().matching(this.currentColor,
                                                    this.currentValue);
    if (matchedCard == null) {
      if (this.gameMode === Mode.BATTLE_PUNO ||
          this.gameMode === Mode.DEATH_MATCH) {
        debug_log("RECIEVE DAMAGE");
        debug_log("hp", this.currentPlayer().hp,
                    "=>", this.currentPlayer().hp - this.damagePool);
        this.currentPlayer().hp -= this.damagePool;
        this.currentPlayer().knockOut = this.currentPlayer().hp <= 0;
        this.damagePool = 0;
        debug_log("reset damage pool");
      }
      const card = this.drawCard(1);
      if (card[0] === undefined) {
        debug_log("deck empty => player knocked out");
        this.currentPlayer().knockOut = true;
      } else {
        debug_log("no matched card => draw");
        this.currentPlayer().deal(card);
        GameManager.onCardDraw(this.currentPlayerIndex, card);
      }
    } else {
      this.discard(matchedCard);
    }
  }

  endTurn() {
    GameManager.onTuenEnd(this.currentPlayerIndex);
    this.currentPlayerIndex =
        this.clockwise ? mod(this.currentPlayerIndex + 1, 4)
                       : mod(this.currentPlayerIndex - 1, 4);
  }

  scoreBoard() {
    return [this.players[0].score, this.players[1].score,
            this.players[2].score, this.players[3].score];
  }

  gameStart() {
    GameManager.onGameStart()
    console.log("SCORE GOAL", this.scoreGoal);
    this.roundStart();
  }

  roundStart() {
    this.initialize();
    GameManager.onRoundStart();
  }

  update() {
    if (GameManager.isSceneBusy())  return;
    if (this.isRoundOver())  return this.processResult();
    if (GameManager.isInTurn()) {
      this.endTurn();
    } else {
      if (!this.currentPlayer().knockOut) {
        if (this.currentPlayer().ai) {
          GameManager.onNPCTurnBegin(this.currentPlayerIndex);
          this.beginTurn();
        } else {
          GameManager.onUserTurnBegin(this.currentPlayerIndex);
        }
      } else {
        debug_log(this.currentPlayer().name, "knocked out - SKIP");
      }
    }
  }

  processResult(){
    this.gameResult();
    debug_log(this.scoreBoard());
    GameManager.processGameOver();
  }
}

/************************** helper function **************************/
function getRandom(a, b, filter=undefined) {
  const random = Math.floor(Math.random() * (b - a + 1) + a);
  return random != filter ? random : getRandom(a, b, filter);
}

function mod(n, m) {
  return ((n % m) + m) % m;
}
/*********************************************************************/
