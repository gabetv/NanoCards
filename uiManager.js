// uiManager.js
import { playAnimation, triggerScreenShake, triggerImpactFlash, displayGameMessage as utilDisplayGameMessage, hasProtector } from './utils.js';

// --- Références aux Éléments du DOM ---
const mainMenuScreen = document.getElementById('main-menu-screen');
const boosterOpeningScreen = document.getElementById('booster-opening-screen');
const gameBoardElement = document.getElementById('game-board');
const deckBuilderScreenElement = document.getElementById('deck-builder-screen'); 

const deckCountElement = document.getElementById('deck-count');
const playerHandArea = document.getElementById('player-hand-area');
const playerFieldArea = document.getElementById('player-field-area');
const playerGoalCardArea = document.getElementById('player-goal-card-area');
const opponentHandArea = document.getElementById('opponent-hand-area');
const opponentFieldArea = document.getElementById('opponent-field-area');
const opponentGoalCardArea = document.getElementById('opponent-goal-card-area');

const boosterCardsArea = document.getElementById('booster-cards-area');

const gameMessageElement = document.getElementById('game-message');
const impactFlashOverlayElement = document.getElementById('impact-flash-overlay');

const cardInfoPopupElement = document.getElementById('card-info-popup');
const popupCardNameElement = document.getElementById('popup-card-name');
const popupCardTypeElement = document.getElementById('popup-card-type-cost');
const popupCardStatsElement = document.getElementById('popup-card-stats');
const popupCardAbilitiesElement = document.getElementById('popup-card-abilities');
const popupCardDescriptionElement = document.getElementById('popup-card-description');
const closePopupButtonElement = document.getElementById('close-popup-button');


// --- Gestion de l'Affichage des Écrans ---
export function showScreen(screenName) {
    if (mainMenuScreen) mainMenuScreen.classList.remove('active-screen');
    if (boosterOpeningScreen) boosterOpeningScreen.classList.remove('active-screen');
    if (gameBoardElement) gameBoardElement.classList.remove('active-screen');
    if (deckBuilderScreenElement) deckBuilderScreenElement.classList.remove('active-screen'); 
    if (cardInfoPopupElement) cardInfoPopupElement.style.display = 'none';

    if (screenName === 'menu' && mainMenuScreen) mainMenuScreen.classList.add('active-screen');
    else if (screenName === 'booster' && boosterOpeningScreen) boosterOpeningScreen.classList.add('active-screen');
    else if (screenName === 'game' && gameBoardElement) gameBoardElement.classList.add('active-screen');
    else if (screenName === 'deck-builder' && deckBuilderScreenElement) deckBuilderScreenElement.classList.add('active-screen'); 
    else console.warn(`showScreen: Nom d'écran inconnu "${screenName}" ou élément DOM non trouvé.`); 
}


// --- Affichage des Messages ---
export function displayGameMessage(message, duration = 4000) {
    utilDisplayGameMessage(message, gameMessageElement, duration);
}

// --- Gestion de la Popup d'Info Carte ---
export function showCardInfo(cardInstance, canPlayFromPopup = false, playActionCallback = null) {
    if (!cardInstance || !cardInfoPopupElement) return;

    popupCardNameElement.textContent = cardInstance.name;
    
    const typeSpan = popupCardTypeElement.querySelector('#popup-card-type');
    const costSpan = popupCardTypeElement.querySelector('#popup-card-cost');
    if (typeSpan) typeSpan.textContent = `Type: ${cardInstance.type}`;
    if (costSpan) {
        costSpan.style.display = cardInstance.cost !== undefined ? 'inline' : 'none';
        if (cardInstance.cost !== undefined) costSpan.textContent = `Coût: ${cardInstance.cost}`;
    }

    if (cardInstance.type === "Monstre") {
        popupCardStatsElement.textContent = `ATK: ${cardInstance.atk} / DEF: ${cardInstance.def}`;
        popupCardStatsElement.style.display = 'block';
    } else {
        popupCardStatsElement.style.display = 'none';
    }

    // Affichage de la rareté dans la popup
    const rarityText = cardInstance.rarity ? `Rareté: ${cardInstance.rarity}` : "Rareté: Commun";
    let abilitiesText = "";
    if (cardInstance.abilities && cardInstance.abilities.length > 0) {
        abilitiesText = `Capacités: ${cardInstance.abilities.join(', ')} `;
    }
    
    popupCardAbilitiesElement.textContent = `${abilitiesText}(${rarityText})`;
    popupCardAbilitiesElement.style.display = 'block'; // Toujours afficher la rareté

    popupCardDescriptionElement.textContent = cardInstance.description || "Pas de description.";

    const popupActionsDiv = cardInfoPopupElement.querySelector('.popup-actions');
    if (!popupActionsDiv) return;
    popupActionsDiv.innerHTML = ''; 

    if (canPlayFromPopup) {
        const playButton = document.createElement('button');
        playButton.id = 'play-card-from-popup-button';
        playButton.classList.add('menu-button', 'primary-action');
        playButton.textContent = 'Jouer Carte';
        playButton.onclick = () => {
            if (playActionCallback) playActionCallback(cardInstance.instanceId);
            hideCardInfo();
        };
        popupActionsDiv.appendChild(playButton);
    }

    cardInfoPopupElement.style.display = 'flex';
}

export function hideCardInfo() {
    if (cardInfoPopupElement) cardInfoPopupElement.style.display = 'none';
    const popupActionsDiv = cardInfoPopupElement.querySelector('.popup-actions');
    if (popupActionsDiv) popupActionsDiv.innerHTML = '';
}

if (closePopupButtonElement) {
    closePopupButtonElement.addEventListener('click', hideCardInfo);
}


// --- Création des Éléments DOM pour les Cartes ---
export function createCardDOMElement({ cardInstance, owner, location, gameState, actions }) {
    const cardDiv = document.createElement('div');
    cardDiv.dataset.instanceId = cardInstance.instanceId;

    if (cardInstance.rarity) {
        const rarityClass = `rarity-${cardInstance.rarity.toLowerCase().replace(/\s+/g, '-')}`;
        cardDiv.classList.add(rarityClass);
    } else {
        cardDiv.classList.add('rarity-commun'); 
    }

    let isProtector = cardInstance.abilities && cardInstance.abilities.includes("PROTECTOR");
    let isFrozen = !cardInstance.canAttackNextTurn && location === 'field';

    if (location === 'field') {
        if (isProtector) cardDiv.classList.add('is-protector');
        if (isFrozen) cardDiv.classList.add('is-frozen');
    }
    
    let iconClass = "icon-monster"; 
    if (isProtector) {
        iconClass = "icon-protector";
    } else if (cardInstance.type === "Magie") {
        iconClass = "icon-spell";
    } else if (cardInstance.type === "Piege") {
        iconClass = "icon-trap";
    }
    cardDiv.classList.add(iconClass);

    let statsHTML = '<div class="card-stats-area">&nbsp;</div>';
    if (cardInstance.type === "Monstre") {
        statsHTML = `
            <div class="card-stats-area">
                <span class="stat-box atk-box">ATK: ${cardInstance.atk}</span>
                <span class="stat-box def-box">DEF: ${cardInstance.def}</span>
            </div>`;
    }

    if (location === 'booster' || location === 'collection' || location === 'deck') {
        cardDiv.classList.add('card'); 
        let abilitiesDisplay = '&nbsp;';
        if (cardInstance.abilities && cardInstance.abilities.length > 0) {
            abilitiesDisplay = cardInstance.abilities.join(', ');
        } else if (cardInstance.type !== "Monstre") {
            abilitiesDisplay = cardInstance.type;
        }

        cardDiv.innerHTML = `
            <div class="card-header">
                <span class="card-type-icon ${iconClass}"></span>
                <span class="card-name-text">${cardInstance.name}</span>
            </div>
            <div class="card-image-container">
                <div class="card-image-area"></div>
            </div>
            ${statsHTML}
            <div class="card-ability-text">${abilitiesDisplay}</div>
            <div class="card-description-area custom-scrollbar">${cardInstance.description || 'Aucune.'}</div>`;
        
        cardDiv.style.cursor = 'pointer';
        
        if (actions && actions.onShowInfo) {
             cardDiv.addEventListener('click', (e) => { 
                e.stopPropagation(); 
                actions.onShowInfo(cardInstance, false); 
            });
        }
    } else if (location === 'goal') {
        cardDiv.classList.add('goal-card');
        let goalContent = '';
        if (cardInstance.isRevealed) {
            cardDiv.classList.add('revealed');
            goalContent = `
                <div class="card-header goal-header">
                    <span class="card-type-icon ${iconClass}"></span>
                    <span class="card-name-text">${cardInstance.name}</span>
                </div>
                <div class="card-desc-goal custom-scrollbar">${cardInstance.description}</div>`;
        } else if (owner === "Joueur") {
            goalContent = `
                <div class="card-header goal-header">
                    <span class="card-type-icon ${iconClass}"></span>
                    <span class="card-name-text">${cardInstance.name}</span>
                </div>
                <div class="card-desc-goal-hidden">(Caché)</div>`;
        } else { 
            goalContent = `<div class="card-image-area goal-image"><span class="card-type-icon ${iconClass} hidden-goal-icon"></span></div>`;
        }
        cardDiv.innerHTML = goalContent;

        if (actions && actions.onShowInfo && (cardInstance.isRevealed || owner === "Joueur")) {
            cardDiv.addEventListener('click', () => actions.onShowInfo(cardInstance));
        }

        if (owner === "IA" && gameState.isPlayerTurn && gameState.selectedPlayerCard && 
            !gameState.gameIsOver && !cardInstance.isRevealed && 
            !hasProtector(gameState.opponentField) && gameState.selectedPlayerCard.canAttackNextTurn) {
            cardDiv.classList.add('targetable');
            if (actions && actions.onTargetCard) cardDiv.addEventListener('click', (e) => { e.stopPropagation(); actions.onTargetCard(cardInstance); });
        }
    } else { 
        cardDiv.classList.add('card');
        if (owner === "Joueur") cardDiv.classList.add('player-card'); else cardDiv.classList.add('opponent-card');

        if (owner === "Joueur" && location === 'hand' && (cardInstance.type === "Monstre")) {
            cardDiv.classList.add('playable');
        }

        if (location === 'field' && cardInstance.hasAttackedThisTurn && !isFrozen) cardDiv.style.opacity = "0.65";
        else if (!isFrozen) cardDiv.style.opacity = "1";

        let abTxt = "";
        if (location === 'field') { 
            if(isProtector) abTxt = `<div class="card-ability-text is-protector-text">Protecteur</div>`;
            else if(isFrozen) abTxt = `<div class="card-ability-text is-frozen-text">Gelé!</div>`;
            else if (cardInstance.type !== "Monstre") abTxt = `<div class="card-ability-text">${cardInstance.type}</div>`; 
            else abTxt = `<div class="card-ability-text">&nbsp;</div>`; 
        } else if (location === 'hand') { 
             if (cardInstance.type !== "Monstre") abTxt = `<div class="card-ability-text">${cardInstance.type}</div>`;
             else abTxt = `<div class="card-ability-text">&nbsp;</div>`;
        } else {
            abTxt = `<div class="card-ability-text">&nbsp;</div>`;
        }
        
        cardDiv.innerHTML = `
            <div class="card-header">
                <span class="card-type-icon ${iconClass}"></span>
                <span class="card-name-text">${cardInstance.name}</span>
            </div>
            <div class="card-image-container">
                <div class="card-image-area"></div>
            </div>
            ${statsHTML}
            ${abTxt}
            <div class="card-description-area"></div>`;

        if (!gameState.gameIsOver) {
            if (owner === "Joueur") {
                if (location === 'hand') { 
                    if (actions && actions.onShowInfo) cardDiv.addEventListener('click', () => { actions.onShowInfo(cardInstance, true, actions.onPlayCard); });
                } else if (location === 'field' && cardInstance.type === "Monstre") {
                    if (!cardInstance.hasAttackedThisTurn && cardInstance.canAttackNextTurn) { 
                        if (actions && actions.onSelectCardForAttack) cardDiv.addEventListener('click', () => { actions.onSelectCardForAttack(cardInstance.instanceId); if (actions.onShowInfo) actions.onShowInfo(cardInstance); });
                    } else { 
                        if (actions && actions.onShowInfo) cardDiv.addEventListener('click', () => actions.onShowInfo(cardInstance)); 
                    }
                } else if (location === 'field') { 
                    if (actions && actions.onShowInfo) cardDiv.addEventListener('click', () => actions.onShowInfo(cardInstance));
                }
            } else if (owner === "IA" && location === 'field' && cardInstance.type === "Monstre") {
                const canBeTargeted = gameState.isPlayerTurn && gameState.selectedPlayerCard && gameState.selectedPlayerCard.canAttackNextTurn &&
                                      (!hasProtector(gameState.opponentField) || (isProtector)); 
                if (canBeTargeted) {
                    cardDiv.classList.add('targetable');
                    if (actions && actions.onTargetCard) cardDiv.addEventListener('click', (e) => { e.stopPropagation(); actions.onTargetCard(cardInstance); });
                } else { 
                    if (actions && actions.onShowInfo) cardDiv.addEventListener('click', () => actions.onShowInfo(cardInstance));
                }
            } else { 
                if (actions && actions.onShowInfo && location !== 'hand') cardDiv.addEventListener('click', () => actions.onShowInfo(cardInstance));
            }
        } else { 
            if (actions && actions.onShowInfo) cardDiv.addEventListener('click', () => actions.onShowInfo(cardInstance));
        }
    }
    return cardDiv;
}


// --- Fonctions de Rendu des Zones ---
function renderZone(areaElement, title, cards, owner, location, gameState, actions, isGoalZone = false) {
    if (!areaElement) return;
    areaElement.innerHTML = `<h2>${title}</h2>`;
    
    if (isGoalZone) {
        for (let i = 0; i < 4; i++) {
            if (cards[i]) {
                areaElement.appendChild(createCardDOMElement({ cardInstance: cards[i], owner, location, gameState, actions }));
            } else {
                const p = document.createElement('div');
                p.classList.add('goal-card', 'destroyed');
                p.style.cursor = "default";
                p.innerHTML = `<div class="goal-destroyed-text">(Détruit)</div>`;
                areaElement.appendChild(p);
            }
        }
    } else if (location === 'hand' && owner === 'IA') {
        if (cards.length === 0) {
            areaElement.innerHTML += '<p class="empty-zone-text">(Vide)</p>';
        } else {
            cards.forEach(() => {
                const p = document.createElement('div');
                p.classList.add('card-placeholder');
                areaElement.appendChild(p);
            });
        }
    } else {
        if (cards.length === 0 && location !== 'hand') {
             areaElement.innerHTML += '<p class="empty-zone-text">(Vide)</p>';
        } else {
            cards.forEach(c => areaElement.appendChild(createCardDOMElement({ cardInstance: c, owner, location, gameState, actions })));
        }
    }

    if (location === 'field' && owner === 'Joueur' && gameState.selectedPlayerCard && cards.find(c => c.instanceId === gameState.selectedPlayerCard.instanceId)) {
        const el = areaElement.querySelector(`.card[data-instance-id="${gameState.selectedPlayerCard.instanceId}"]`);
        if (el) el.classList.add('selected');
    }
}

export function renderPlayerHand(playerHand, gameState, actions) { renderZone(playerHandArea, 'Ma Main', playerHand, "Joueur", "hand", gameState, actions); }
export function renderPlayerField(playerField, gameState, actions) { renderZone(playerFieldArea, 'Mon Terrain', playerField, "Joueur", "field", gameState, actions); }
export function renderPlayerGoalCards(playerGoalCards, gameState, actions) { renderZone(playerGoalCardArea, 'Mes Objectifs', playerGoalCards, "Joueur", "goal", gameState, actions, true); }
export function renderOpponentHand(opponentHand) { renderZone(opponentHandArea, 'Main IA', opponentHand, "IA", "hand", {}, {}); }
export function renderOpponentField(opponentField, gameState, actions) { renderZone(opponentFieldArea, 'Terrain IA', opponentField, "IA", "field", gameState, actions); }
export function renderOpponentGoalCards(opponentGoalCards, gameState, actions) { renderZone(opponentGoalCardArea, 'Objectifs IA', opponentGoalCards, "IA", "goal", gameState, actions, true); }

export function renderBoosterOpening(boosterPack, gameState, actions) {
    if (!boosterCardsArea) {
        console.error("renderBoosterOpening: boosterCardsArea non trouvé.");
        return;
    }
    boosterCardsArea.innerHTML = '<h2>Contenu du Booster</h2>'; 
    if (boosterPack.length === 0) {
        boosterCardsArea.innerHTML += '<p class="empty-zone-text">Quelque chose s\'est mal passé, booster vide !</p>';
    } else {
        boosterPack.forEach(cardInstance => {
            boosterCardsArea.appendChild(createCardDOMElement({ cardInstance, owner: "booster", location: "booster", gameState, actions }));
        });
    }
}

export function updateDeckCount(count) { if (deckCountElement) deckCountElement.textContent = count; }

export function getGameMessageElement() { return gameMessageElement; }
export function getImpactFlashOverlayElement() { return impactFlashOverlayElement; }

export async function uiTriggerScreenShake(intensity, duration) {
    await triggerScreenShake(intensity, duration, document.body);
}
export async function uiTriggerImpactFlash(duration) {
    await triggerImpactFlash(duration, impactFlashOverlayElement);
}

export function setTurnIndicator(actor, gameIsOver = false) { 
    const drawButton = document.getElementById('draw-card-button');
    const endTurnButton = document.getElementById('end-turn-button');

    if (gameIsOver) { 
        if (drawButton) drawButton.disabled = true;
        if (endTurnButton) endTurnButton.disabled = true;
    } else if (actor === 'Joueur') {
        if (drawButton) drawButton.disabled = false;
        if (endTurnButton) endTurnButton.disabled = false;
    } else { 
        if (drawButton) drawButton.disabled = true;
        if (endTurnButton) endTurnButton.disabled = true;
    }
}