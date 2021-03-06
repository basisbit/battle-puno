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
    this.penaltyPool = 0;
    this.gameMode = gameMode;
    this.damagePool = 0;
    this.damageTypes = [false, false, false, false, false];
    this.maxHandThreshold = this.initCardNumber + 1;
  }

  numAlivePlayers() {
    let alivePlayersCount = 0;
    for (let i in this.players) {
      if (!this.players[i].knockOut) {
        ++alivePlayersCount;
      }
    }
    return alivePlayersCount;
  }

  getAlivePlayers() {
    let alivePlayers = [];
    for (let i in this.players) {
      if (!this.players[i].knockOut) {
        alivePlayers.push(this.players[i]);
      }
    }
    return alivePlayers;
  }

  chooseDealer() {
    let highest = 0;
    let deadlock = true;
    let firstDraw = undefined;
    while(deadlock){
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
    return highest;
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

  isCurrentPlayerSkipped() {
    return this.penaltyCard != undefined && this.penaltyCard.value === Value.SKIP;
  }

  isCardAbilitySelectionNeeded(card) {
    if ((this.gameMode === Mode.BATTLE_PUNO ||
        this.gameMode === Mode.DEATH_MATCH) &&
        card.value === Value.ZERO) {
      return true;
    }
    if (card.value === Value.WILD_CHAOS) {
      return false;
    }
    return card.color === Color.WILD;
  }

  isCardPlayable(card) {
    if (this.penaltyCard != undefined) {
      if (this.penaltyCard.value === Value.SKIP)  return false;
      let base = (card.isEqual(new Card(this.currentColor, Value.SKIP)) ||
                  card.isEqual(new Card(this.currentColor, Value.REVERSE)));
      if(this.gameMode === Mode.DEATH_MATCH){
        base |= (card.value === Value.DRAW_TWO);
        base |= (card.value === Value.WILD_DRAW_FOUR);
      }
      return !!base;
    }
    return card.isMatched(this.currentColor, this.currentValue);
  }

  initGame() {
    this.clockwise = true;
    this.currentPlayerIndex = undefined;
    this.currentColor = undefined;
    this.currentValue = undefined;
    this.damageTypes.fill(false);
  }

  initDeck() {
    this.deck = new Deck(this.extraCardDisabled);
    this.penaltyCard = undefined;
    this.penaltyPool = 0;
    this.discardPile.length = 0;
    this.damagePool = 0;
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
      this.players[i].deal(cards);
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
  }

  initialize() {
    debug_log("--------------INITIALIZE--------------");
    this.initGame();
    this.initDeck();
    this.initPlayer();
    this.processFirstDraw();
    this.processFirstDeal();
    this.drawFirstCard();
    debug_log("--------------------------------------");
  }

  isGameOver() {
    if (this.gameMode === Mode.TRADITIONAL)  return true;
    if (this.gameMode === Mode.DEATH_MATCH && this.players[0].knockOut){
      return true;
    }
    return Math.max(...this.scoreBoard()) >= this.scoreGoal;
  }

  isRoundOver() {
    if(this.gameMode === Mode.DEATH_MATCH && this.players[0].knockOut){
      return true;
    }
    for (let i in this.players) {
      if (this.players[i].isGoingOut()) {
        return true;
      }
    }
    return this.numAlivePlayers() === 1;
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

  discardAll(color) {
    debug_log("DISCARD ALL", color);
    let colorCardsIndex = this.currentPlayer().findAllCardsByColor(color);
    for (let i in colorCardsIndex) {
      const cardIndex = colorCardsIndex[i];
      const card = this.currentPlayer().hand[cardIndex];
      EventManager.setTimeout(() => {
        this.discardPile.push(card);
        this.currentPlayer().discard(cardIndex);
        GameManager.onCardPlay(this.currentPlayerIndex, card, -1);
      }, 10 * i);
    }
  }

  trade(player1, player2) {
    if (this.players[player1].knockOut ||
        this.players[player2].knockOut) {
      debug_log("TRADE DENIED: someone knocked out");
      return;
    }
    debug_log("TRADE");
    debug_log("before trade");
    debug_log(player1, this.players[player1].hand.slice());
    debug_log(player2, this.players[player2].hand.slice());
    const temp = this.players[player1].hand.slice();
    this.players[player1].hand = this.players[player2].hand.slice();
    this.players[player2].hand = temp;
    debug_log("after trade");
    debug_log(player1, this.players[player1].hand.slice());
    debug_log(player2, this.players[player2].hand.slice());
  }

  wildHitAll(currentPlayerIndex) {
    debug_log("WILD HIT ALL");
    for (let i in this.players) {
      if (i != currentPlayerIndex && !this.players[i].knockOut) {
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
      } else if (this.gameMode === Mode.BATTLE_PUNO) {
        this.players[i].hp -= this.players[i].cardsPointSum();
        this.players[i].hp = Math.max(0, this.players[i].hp);
        this.players[i].score += this.players[i].hp;
      }
    }
  }

  setNextColorAndValue(card, ext) {
    if (card.color === Color.WILD) {
      this.currentValue = undefined;
      if (this.currentPlayer().ai ||
          card.value === Value.WILD_CHAOS ||
          card.value === Value.TRADE) {
        this.currentColor = getRandom(Color.RED, Color.BLUE, this.currentColor);
      } else {
        this.currentColor = ext;
      }
      debug_log("WILD CHOOSE NEXT COLOR", this.currentColor);
      if (card.value === Value.WILD_CHAOS) {
        this.currentValue = getRandom(Value.ZERO, Value.NINE);
        debug_log("WILD CHAOS, NEXT VALUE", this.currentValue);
        ext = [this.currentColor, this.currentValue];
      } else if (card.value === Value.TRADE) {
        ext[0] = this.currentColor;
      } else {
        ext = this.currentColor;
      }
    } else {
      this.currentColor = card.color;
      this.currentValue = card.value;
    }
    return ext;
  }

  takeCardAction(card, ext) {
    if (card.value === Value.REVERSE) {
      this.reverse();
      ext = this.penaltyCard === undefined ? 0 : 1;
    } else if (card.value === Value.TRADE) {
      const target = this.currentPlayer().ai ? this.findTarget() : ext;
      this.trade(this.currentPlayerIndex, target);
      ext = [undefined, target];
    } else if (card.value === Value.DISCARD_ALL) {
      this.discardAll(this.currentColor);
    } else if (card.value === Value.WILD_HIT_ALL) {
      this.wildHitAll(this.currentPlayerIndex);
    }
    return ext;
  }

  setDamagePool(card, ext) {
    if (this.gameMode === Mode.TRADITIONAL)  return;
    this.damageTypes[card.color] = true;
    if (card.value === Value.ZERO) {
      if (this.currentPlayer().ai) {
        if (this.gameMode === Mode.DEATH_MATCH || this.damagePool < 30 || !!getRandom(0, 1)) {
          ext = 0;
        } else {
          ext = 1;
        }
      }
      if (ext === 1) {
        this.resetDamagePool();
      } else {
        debug_log("+10 damage");
        this.addDamagePool(10, card.color);
      }
    } else if (Value.ONE <= card.value && card.value <= Value.NINE) {
      this.addDamagePool(card.value, card.color);
    }
    debug_log("damage pool", this.damagePool);
    return ext;
  }

  addDamagePool(v, c=null) {
    debug_log("Damage add: " + v);
    this.damagePool += (v || 0);
    if (c)  this.damageTypes[c] = true;
    GameManager.onDamageChange();
  }

  resetDamagePool() {
    debug_log("clear damage");
    this.damagePool = 0;
    this.damageTypes.fill(false);
    GameManager.onDamageChange();
  }

  discard(cardIndex, ext=null) {
    const card = this.currentPlayer().hand[cardIndex];
    debug_log("discard: ", card);
    this.currentPlayer().discard(cardIndex);
    if (this.currentPlayer().hand.length != 0) {
      if (card.numbered) {
        ext = this.setDamagePool(card, ext);
      } else {
        ext = this.takeCardAction(card, ext);
      }
      ext = this.setNextColorAndValue(card, ext);

      if(card.value === Value.DRAW_TWO){this.penaltyPool += 2;}
      else if(card.value === Value.WILD_DRAW_FOUR){this.penaltyPool += 4;}

      if (this.penaltyCard === undefined) {
        if (card.penalty) {
          this.penaltyCard = card;
        }
      } else {
        ext = 1;
      }
    } else {
      ext = -1;
    }
    if (this.currentPlayer().hand.length === 1) {
      this.currentPlayer().uno();
    }
    debug_log("ext", ext);
    this.discardPile.push(card);
    GameManager.onCardPlay(this.currentPlayerIndex, card, ext);
  }

  getPenalty() {
    debug_log("PENALTY");
    if (this.penaltyCard.value === Value.SKIP) {
      debug_log("SKIP");
      this.penaltyCard = undefined;
    } else {
      const avoidCardIndex =
          this.currentPlayer().receivePenalty(this.penaltyCard);
      if (avoidCardIndex != -1) {
        this.discard(avoidCardIndex, 1);
      } else {
        let cards = undefined;
        if (this.penaltyPool > 0) {
          debug_log("DRAW " + this.penaltyPool);
          cards = this.drawCard(this.penaltyPool);
        }
        this.currentPlayer().deal(cards);
        GameManager.onCardDraw(this.currentPlayerIndex, cards);
        this.penaltyCard = undefined;
        this.penaltyPool = 0;
      }
    }
  }

  replenish() {
    if (this.gameMode != Mode.DEATH_MATCH)  return;
    let numCardsDiff = this.initCardNumber - this.currentPlayer().hand.length;
    if (numCardsDiff > 0) {
      debug_log("DEATH MATCH DRAW");
      let cards = this.drawCard(numCardsDiff);
      this.currentPlayer().deal(cards);
      GameManager.onCardDraw(this.currentPlayerIndex, cards);
    }
  }

  beginTurn() {
    debug_log("hand", this.currentPlayer().hand.slice());
    debug_log("CURRENT COLOR:", this.currentColor);
    debug_log("CURRENT VALUE:", this.currentValue);
    if (this.penaltyCard != undefined) {
      this.getPenalty();
      return;
    }
    let matchedCardIndex = this.currentPlayer().matching(this.currentColor,
                                                         this.currentValue);
    if (matchedCardIndex === -1) {
      if (this.gameMode === Mode.BATTLE_PUNO ||
          this.gameMode === Mode.DEATH_MATCH) {
        this.processDeckDamage(this.currentPlayerIndex);
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
      this.discard(matchedCardIndex);
    }
  }

  processDeckDamage(player_id){
    if (this.gameMode === Mode.TRADITIONAL)  return;
    this.processPlayerDamage(player_id, this.damagePool, this.damageTypes)
    this.resetDamagePool();
    debug_log("reset damage pool");
  }

  processPlayerDamage(player_id, value, dmg_types) {
    value = (value || 0);
    debug_log("RECEIVE DAMAGE");
    debug_log("HP:", this.players[player_id].hp + " => " + this.players[player_id].hp - value);
    this.players[player_id].hp = Math.max(this.players[player_id].hp - value, 0);
    this.players[player_id].knockOut = this.players[player_id].hp <= 0;
    if(this.players[player_id].knockOut){this.players[player_id].damageStack = 0;}
    GameManager.onHPChange(player_id, dmg_types);
    if(this.gameMode === Mode.DEATH_MATCH){
      for(let i in this.players){
        if(i == player_id || this.players[i].knockOut){continue;}
        this.players[i].score += value;
      }
    }
  }

  processPlayerExtraDamage(player_id){
    let pl = this.players[player_id];
    let ar = [];
    let types = [false, false, false, false, false];
    for(let i in pl.hand){ar.push(parseInt(pl.hand[i].color));}
    ar = shuffleArray(ar);
    types[ar[0]] = true;
    let value = Math.max(1, parseInt(GameManager.initHP * pl.damageStack / 100.0))
    if(pl.damageStack > 0){this.processPlayerDamage(player_id, value, types);}
    pl.damageStack += 1;
  }

  endTurn() {
    GameManager.onTurnEnd(this.currentPlayerIndex);
    this.currentPlayerIndex = this.getNextPlayerIndex();
  }

  getNextPlayerIndex() {
    return this.clockwise ? mod(this.currentPlayerIndex + 1, 4)
                          : mod(this.currentPlayerIndex - 1, 4);
  }

  getNextAlivePlayerIndex() {
    let nextAlivePlayerIndex = this.getNextPlayerIndex();
    while (this.players[nextAlivePlayerIndex].knockOut) {
      nextAlivePlayerIndex =
          this.clockwise ? mod(nextAlivePlayerIndex + 1, 4)
                         : mod(nextAlivePlayerIndex - 1, 4);
    }
    return nextAlivePlayerIndex;
  }

  scoreBoard() {
    return [this.players[0].score, this.players[1].score,
            this.players[2].score, this.players[3].score];
  }

  gameStart() {
    GameManager.onGameStart()
    debug_log("SCORE GOAL", this.scoreGoal);
    this.roundStart();
  }

  roundStart() {
    this.initialize();
    GameManager.onRoundStart();
  }

  update() {
    if (GameManager.isSceneBusy() || this.flagAIThinking)  return;
    if (this.isRoundOver())  return this.processResult();
    if (GameManager.isInTurn()) {
      if (this.gameMode === Mode.DEATH_MATCH) {
        this.replenish();
      }
      this.endTurn();
    } else {
      debug_log(this.currentPlayer());
      this.processDeathMatchDamage();
      if (!this.currentPlayer().knockOut) {
        this.processTurnAction();
      } else {
        debug_log(this.currentPlayer().name, "knocked out - SKIP");
        this.endTurn();
      }
    }
  }

  processDeathMatchDamage(){
    if(this.currentPlayer().knockOut){return this.currentPlayer().damageStack = 0;}
    if(this.gameMode === Mode.DEATH_MATCH){
      if(this.currentPlayer().hand.length > this.maxHandThreshold){
        this.processPlayerExtraDamage(this.currentPlayerIndex);
      }
      else{this.currentPlayer().damageStack = 0;}
    }
  }

  processTurnAction() {
    
    if (this.currentPlayer().ai) {
      GameManager.onNPCTurnBegin(this.currentPlayerIndex);
    } else {
      GameManager.onUserTurnBegin(this.currentPlayerIndex);
    }
    if (this.isCurrentPlayerSkipped()) {
      this.penaltyCard = undefined;
      this.endTurn();
    } else if (this.currentPlayer().ai) {
      this.flagAIThinking = true;
      EventManager.setTimeout(()=>{
        this.flagAIThinking = false;
        this.beginTurn();
      }, 30);
    }
  }

  processResult() {
    this.gameResult();
    debug_log(this.scoreBoard());
    if (this.isGameOver()) {
      GameManager.processGameOver();
    } else {
      GameManager.processRoundOver();
    }
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
