// gameLogic.js
import { createCardInstance, initializeDeck, initializeGoalCards } from './cardManager.js';
import * as ui from './uiManager.js'; 
import * as ai from './aiLogic.js';
import { shuffleDeck, hasProtector, playAnimation } from './utils.js'; 
import { getUserDeck } from './deckBuilder.js';

// --- État du Jeu ---
let playerDeck, opponentDeck, playerHand, opponentHand, playerField, opponentField;
let playerGoalCards, opponentGoalCards;
let selectedPlayerCard = null;
let isPlayerTurn = true;
let gameIsOver = false;
let turnNumber = 0;

function getGameStateForUI() {
    return {
        isPlayerTurn,
        selectedPlayerCard,
        opponentField,
        playerField,
        gameIsOver
    };
}
function getGameActionsForUI() {
    return {
        onPlayCard: (cardInstanceId) => handlePlayCardFromHand(cardInstanceId, 'Joueur'),
        onSelectCardForAttack: handleSelectPlayerCardForAttack,
        onTargetCard: (targetCardInstance) => {
            if (selectedPlayerCard && targetCardInstance) {
                executeCombat(selectedPlayerCard, targetCardInstance, 'Joueur');
            }
        },
        onShowInfo: ui.showCardInfo
    };
}

// --- Initialisation et Gestion du Jeu ---
export function setupNewGame() {
    console.log("Initialisation d'une nouvelle partie...");
    playerDeck = []; opponentDeck = []; playerHand = []; opponentHand = [];
    playerField = []; opponentField = []; playerGoalCards = []; opponentGoalCards = [];
    selectedPlayerCard = null; isPlayerTurn = true; gameIsOver = false; turnNumber = 1;

    const customDeck = getUserDeck();
    if (customDeck && customDeck.length >= 20) { // Assurez-vous que MIN_DECK_SIZE est respecté
        playerDeck = [...customDeck]; 
        shuffleDeck(playerDeck);
        console.log("Deck joueur initialisé avec le deck personnalisé.", playerDeck.length, "cartes.");
    } else {
        initializeDeck(playerDeck); 
        console.log("Deck personnalisé non valide ou non trouvé, utilisation du deck par défaut.");
        if (customDeck && customDeck.length > 0 && customDeck.length < 20) {
             ui.displayGameMessage("Votre deck personnalisé est invalide (< 20 cartes). Utilisation d'un deck par défaut.", 5000);
        }
    }

    initializeDeck(opponentDeck);
    initializeGoalCards(playerGoalCards);
    initializeGoalCards(opponentGoalCards);

    for (let i = 0; i < 5; i++) { // Pioche initiale
        actionDrawCard('Joueur');
        actionDrawCard('IA');
    }
    
    ui.updateDeckCount(playerDeck.length);
    ui.displayGameMessage("Duel Commencé ! Détruisez les 4 objectifs adverses. À vous!");
    ui.showScreen('game');
    const quitButton = document.getElementById('quit-game-button');
    if (quitButton) quitButton.style.display = 'inline-block';
    
    ui.setTurnIndicator('Joueur', gameIsOver);
    renderFullBoard();
}

export function quitGame() {
    gameIsOver = true; 
    ui.displayGameMessage("Partie quittée.");
    ui.showScreen('menu');
    const quitButton = document.getElementById('quit-game-button');
    if (quitButton) quitButton.style.display = 'none';
    ui.setTurnIndicator(null, gameIsOver); // Nettoyer l'indicateur de tour
}


function renderFullBoard() {
    const gameStateForUI = getGameStateForUI();
    const gameActionsForUI = getGameActionsForUI();

    ui.renderPlayerHand(playerHand, gameStateForUI, gameActionsForUI);
    ui.renderPlayerField(playerField, gameStateForUI, gameActionsForUI);
    ui.renderPlayerGoalCards(playerGoalCards, gameStateForUI, gameActionsForUI);
    ui.renderOpponentHand(opponentHand); 
    ui.renderOpponentField(opponentField, gameStateForUI, gameActionsForUI); 
    ui.renderOpponentGoalCards(opponentGoalCards, gameStateForUI, gameActionsForUI);
    ui.updateDeckCount(playerDeck.length);
}

// --- Actions des Joueurs ---
function actionDrawCard(actor) { 
    if (gameIsOver) return;

    const deck = actor === 'Joueur' ? playerDeck : opponentDeck;
    const hand = actor === 'Joueur' ? playerHand : opponentHand;

    if (deck.length > 0 && hand.length < 7) {
        const cardId = deck.pop();
        const cardInstance = createCardInstance(cardId);
        if (cardInstance) hand.push(cardInstance);
        
        if (actor === 'Joueur') {
            ui.renderPlayerHand(playerHand, getGameStateForUI(), getGameActionsForUI());
            ui.updateDeckCount(playerDeck.length);
        } else {
            ui.renderOpponentHand(opponentHand);
        }
    } else if (deck.length === 0) {
        ui.displayGameMessage(`Le deck de ${actor} est vide !`);
        // Gérer la condition de défaite par deck out ici si applicable
    } else if (actor === 'Joueur' && hand.length >= 7) {
        ui.displayGameMessage("Votre main est pleine (max 7 cartes) !");
    }
}
export function handlePlayerDrawCard() { 
    if (isPlayerTurn && !gameIsOver) {
        actionDrawCard('Joueur');
    }
}

function handlePlayCardFromHand(cardInstanceId, actor) {
    if (gameIsOver || (actor === 'Joueur' && !isPlayerTurn)) return;

    const hand = actor === 'Joueur' ? playerHand : opponentHand;
    const field = actor === 'Joueur' ? playerField : opponentField;

    const cardIndex = hand.findIndex(card => card.instanceId === cardInstanceId);
    if (cardIndex > -1) {
        const cardToPlay = hand[cardIndex];
        if (cardToPlay.type === "Monstre" && field.length < 5) {
            hand.splice(cardIndex, 1);
            field.push(cardToPlay);
            ui.displayGameMessage(`${actor} joue ${cardToPlay.name}.`);
            renderFullBoard(); 
        } else if (cardToPlay.type !== "Monstre") {
            ui.displayGameMessage("Seuls les monstres peuvent être joués sur le terrain pour l'instant.");
        } else if (field.length >= 5) {
            ui.displayGameMessage(`${actor} : Terrain plein (max 5 monstres) !`);
        }
    }
    ui.hideCardInfo(); // Toujours cacher la popup après une tentative de jeu
}

function handleSelectPlayerCardForAttack(cardInstanceId) {
    if (!isPlayerTurn || gameIsOver) return;
    const card = playerField.find(c => c.instanceId === cardInstanceId);

    if (!card) return;
    if (card.hasAttackedThisTurn) { 
        ui.displayGameMessage("Ce monstre a déjà attaqué ce tour."); 
        return; 
    }
    if (!card.canAttackNextTurn) { 
        ui.displayGameMessage(`${card.name} est gelé et ne peut pas attaquer.`); 
        return; 
    }
    selectedPlayerCard = card;
    renderFullBoard(); 
    ui.displayGameMessage(`Sélectionné : ${card.name}. Cliquez sur une cible adverse.`);
}

// --- Logique de Combat et Effets ---
async function executeCombat(attacker, target, attackerOwner) {
    if (gameIsOver || !attacker || attacker.hasAttackedThisTurn || !attacker.canAttackNextTurn) {
        if (attackerOwner === "Joueur") selectedPlayerCard = null; // Désélectionner si l'attaque est invalide
        renderFullBoard();
        return;
    }

    const defenderOwnerField = attackerOwner === "Joueur" ? opponentField : playerField;
    const targetIsGoalCard = target.type === "Magie" || target.type === "Piege";

    if (hasProtector(defenderOwnerField)) {
        if (target.type === "Monstre" && (!target.abilities || !target.abilities.includes("PROTECTOR"))) {
             ui.displayGameMessage(`Attaque bloquée ! Vous devez cibler un monstre avec "Protecteur" d'abord.`);
             await ui.uiTriggerScreenShake('light', 200);
             if (attackerOwner === "Joueur") {
                 selectedPlayerCard = null; 
                 renderFullBoard();
             }
             return;
        }
    }

    ui.displayGameMessage(`${attackerOwner}: ${attacker.name} (ATK ${attacker.atk}) attaque ${target.name || 'un Objectif'}!`);
    const attackerEl = document.querySelector(`.card[data-instance-id="${attacker.instanceId}"]`);
    const targetEl = document.querySelector(`.card[data-instance-id="${target.instanceId}"], .goal-card[data-instance-id="${target.instanceId}"]`);

    if (attackerEl) await playAnimation(attackerEl, attackerOwner === "Joueur" ? 'animate-attack' : 'animate-attack-opponent', 600);
    
    await Promise.all([ui.uiTriggerImpactFlash(500), ui.uiTriggerScreenShake('light', 300)]);

    attacker.hasAttackedThisTurn = true;
    let targetDestroyedInCombat = false; 
    let monsterWasDestroyedOnField = false; // Pour savoir si un MONSTRE a été détruit (pour le shake plus fort)

    if (target.type === "Monstre") {
        const defender = target;
        if (attacker.atk > defender.def) {
            ui.displayGameMessage(`${defender.name} est détruit.`);
            targetDestroyedInCombat = true; 
            monsterWasDestroyedOnField = true;
            if(attackerOwner === "Joueur") opponentField = opponentField.filter(c => c.instanceId !== defender.instanceId);
            else playerField = playerField.filter(c => c.instanceId !== defender.instanceId);
        } else { 
            ui.displayGameMessage(`Attaque de ${attacker.name} absorbée par la DÉF de ${defender.name} !`);
            if (targetEl) await playAnimation(targetEl, 'animate-shake', 300);
        }
    } else if (targetIsGoalCard) {
        ui.displayGameMessage(`Objectif "${target.name}" attaqué et détruit !`);
        target.isRevealed = true; 
        targetDestroyedInCombat = true;
        if(targetEl) targetEl.classList.add('revealed'); 
        
        await applyGoalCardEffect(target, attacker, attackerOwner); 
        
        // Enlever la carte objectif détruite du tableau approprié
        if(attackerOwner === "Joueur") {
            // Remplacer par null pour garder la position, puis filtrer ou marquer comme "détruit visuellement"
            const goalIndex = opponentGoalCards.findIndex(gc => gc && gc.instanceId === target.instanceId);
            if (goalIndex > -1) opponentGoalCards[goalIndex] = null;
        } else {
            const goalIndex = playerGoalCards.findIndex(gc => gc && gc.instanceId === target.instanceId);
            if (goalIndex > -1) playerGoalCards[goalIndex] = null;
        }
    }

    if(monsterWasDestroyedOnField) await ui.uiTriggerScreenShake('heavy', 400);
    if(targetDestroyedInCombat && targetEl) { 
        // Animation de destruction pour la carte cible si elle est détruite
        targetEl.classList.add('animate-destroy'); 
        await new Promise(r => setTimeout(r, 700)); // Attendre la fin de l'animation de destruction
    }
    
    if(attackerOwner === "Joueur") selectedPlayerCard = null; // Désélectionner après l'attaque
    
    renderFullBoard(); // Mettre à jour l'UI après le combat et les effets
    checkWinCondition(); // Vérifier si le jeu est terminé
}
    
async function applyGoalCardEffect(goalCard, attacker, attackerOwner) {
    ui.displayGameMessage(`Effet de l'objectif: "${goalCard.name}" - ${goalCard.description}`);
    await new Promise(r => setTimeout(r, 500)); // Petite pause pour lire l'effet

    const effectKey = goalCard.effectOnDestroy;
    
    let attackerPlayerField = attackerOwner === "Joueur" ? playerField : opponentField;
    let attackerPlayerHand = attackerOwner === "Joueur" ? playerHand : opponentHand;
    let goalCardOwnerField = attackerOwner === "Joueur" ? opponentField : playerField;
    let goalCardOwnerHand = attackerOwner === "Joueur" ? opponentHand : playerHand;
    const goalCardOwnerActor = attackerOwner === "Joueur" ? "IA" : "Joueur";

    switch (effectKey) {
        case "DESTROY_ATTACKER":
            const attackerCardInField = attackerPlayerField.find(m => m.instanceId === attacker.instanceId);
            if (attackerCardInField) {
                await ui.uiTriggerScreenShake('heavy', 400);
                const el = document.querySelector(`.card[data-instance-id="${attacker.instanceId}"]`);
                ui.displayGameMessage(`${attacker.name} est détruit par l'effet de l'objectif !`);
                if (el) { el.classList.add('animate-destroy'); await new Promise(r => setTimeout(r, 700)); }
                if (attackerOwner === "Joueur") playerField = playerField.filter(m => m.instanceId !== attacker.instanceId);
                else opponentField = opponentField.filter(m => m.instanceId !== attacker.instanceId);
            } else ui.displayGameMessage(`${attacker.name} n'est plus sur le terrain pour être détruit par l'effet.`);
            break;
        case "OPPONENT_DISCARD_RANDOM": 
            if (attackerPlayerHand.length > 0) {
                const discardedCardIndex = Math.floor(Math.random() * attackerPlayerHand.length);
                const discardedCard = attackerPlayerHand.splice(discardedCardIndex, 1)[0];
                ui.displayGameMessage(`${attackerOwner} défausse ${discardedCard.name} de sa main.`);
            } else ui.displayGameMessage(`${attackerOwner} n'a pas de cartes en main à défausser.`);
            break;
        case "OWNER_DRAW_CARD": 
            ui.displayGameMessage(`${goalCardOwnerActor} pioche une carte grâce à ${goalCard.name}.`);
            actionDrawCard(goalCardOwnerActor); 
            break;
        case "REDUCE_ATTACKER_MONSTER_ATK_5":
            const attackerToDebuff = attackerPlayerField.find(m => m.instanceId === attacker.instanceId);
            if (attackerToDebuff) {
                attackerToDebuff.atk = Math.max(0, attackerToDebuff.atk - 5);
                ui.displayGameMessage(`${attackerToDebuff.name} de ${attackerOwner} perd 5 ATK (maintenant ${attackerToDebuff.atk} ATK).`);
                const elDebuff = document.querySelector(`.card[data-instance-id="${attackerToDebuff.instanceId}"]`);
                if (elDebuff) await playAnimation(elDebuff, 'animate-shake', 300);
            } else ui.displayGameMessage(`${attacker.name} n'est plus sur le terrain.`);
            break;
        case "BUFF_OWN_MONSTER_ATK_5": 
            if (goalCardOwnerField.filter(c => c.type === "Monstre").length > 0) { // S'assurer qu'il y a des monstres
                const monstersToBuff = goalCardOwnerField.filter(c => c.type === "Monstre");
                const monsterToBuff = monstersToBuff[Math.floor(Math.random() * monstersToBuff.length)];
                monsterToBuff.atk += 5;
                ui.displayGameMessage(`${monsterToBuff.name} de ${goalCardOwnerActor} gagne 5 ATK (maintenant ${monsterToBuff.atk} ATK).`);
                const elBuff = document.querySelector(`.card[data-instance-id="${monsterToBuff.instanceId}"]`);
                if (elBuff) await playAnimation(elBuff, 'animate-shake', 300);
            } else ui.displayGameMessage(`${goalCardOwnerActor} n'a pas de monstres sur le terrain à buffer.`);
            break;
        case "RETURN_ATTACKER_TO_HAND":
            const attackerToReturn = attackerPlayerField.find(m => m.instanceId === attacker.instanceId);
            if (attackerToReturn) {
                const el = document.querySelector(`.card[data-instance-id="${attackerToReturn.instanceId}"]`);
                if (el) { el.classList.add('animate-destroy'); await new Promise(r => setTimeout(r, 400)); } // Animation avant de retirer

                if (attackerOwner === "Joueur") {
                    playerField = playerField.filter(m => m.instanceId !== attackerToReturn.instanceId);
                    if (playerHand.length < 7) {
                        playerHand.push(attackerToReturn); 
                        ui.displayGameMessage(`${attackerToReturn.name} est renvoyé dans la main de ${attackerOwner} !`);
                    } else {
                        ui.displayGameMessage(`Main du joueur pleine, ${attackerToReturn.name} est défaussé.`);
                        // Optionnel: défausser au lieu de juste ne pas ajouter.
                    }
                } else { // IA
                    opponentField = opponentField.filter(m => m.instanceId !== attackerToReturn.instanceId);
                    if (opponentHand.length < 7) {
                        opponentHand.push(attackerToReturn);
                        ui.displayGameMessage(`${attackerToReturn.name} est renvoyé dans la main de ${attackerOwner} !`);
                    } else {
                         ui.displayGameMessage(`Main de l'IA pleine, ${attackerToReturn.name} est défaussé.`);
                    }
                }
            } else ui.displayGameMessage(`${attacker.name} n'est plus sur le terrain.`);
            break;
        case "FREEZE_ATTACKER_NEXT_TURN":
            const attackerToFreeze = attackerPlayerField.find(m => m.instanceId === attacker.instanceId);
            if (attackerToFreeze) {
                attackerToFreeze.canAttackNextTurn = false;
                ui.displayGameMessage(`${attackerToFreeze.name} de ${attackerOwner} est gelé et ne pourra pas attaquer au prochain tour !`);
            } else ui.displayGameMessage(`${attacker.name} n'est plus sur le terrain.`);
            break;
        case "SPECIAL_SUMMON_FROM_HAND_ATK_10": 
            const summonableMonsters = goalCardOwnerHand.filter(c => c.type === "Monstre" && c.atk <= 10);
            if (summonableMonsters.length > 0 && goalCardOwnerField.length < 5) {
                const monsterToSummon = summonableMonsters[Math.floor(Math.random() * summonableMonsters.length)];
                if (goalCardOwnerActor === "IA") {
                    opponentHand = opponentHand.filter(c => c.instanceId !== monsterToSummon.instanceId);
                    opponentField.push(monsterToSummon);
                } else { 
                    playerHand = playerHand.filter(c => c.instanceId !== monsterToSummon.instanceId);
                    playerField.push(monsterToSummon);
                }
                ui.displayGameMessage(`${goalCardOwnerActor} invoque spécialement ${monsterToSummon.name} depuis sa main !`);
            } else ui.displayGameMessage(`${goalCardOwnerActor} ne peut pas invoquer spécialement (pas de monstre éligible, main vide ou terrain plein).`);
            break;
        default: ui.displayGameMessage(`Effet d'objectif "${effectKey}" non implémenté.`);
    }
}

// --- Gestion des Tours ---
export async function endPlayerTurn() {
    if (!isPlayerTurn || gameIsOver) return;
    ui.displayGameMessage("Joueur termine son tour."); 
    isPlayerTurn = false;
    selectedPlayerCard = null; // Désélectionner carte du joueur
    ui.setTurnIndicator('IA', gameIsOver);
    renderFullBoard(); // Mettre à jour l'UI pour refléter le changement de tour et la désélection
    
    await new Promise(resolve => setTimeout(resolve, 1000)); // Pause avant le tour de l'IA
    if (!gameIsOver) executeOpponentTurnLogic();
}

async function executeOpponentTurnLogic() {
    if (gameIsOver) { 
        if (!isPlayerTurn) startPlayerTurnLogic(); // Si le jeu s'est terminé pendant le tour de l'IA, redonner la main (pour affichage fin de partie)
        return; 
    }
    ui.displayGameMessage("--- Tour de l'IA ---"); 

    opponentField.forEach(card => {
        card.hasAttackedThisTurn = false;
        if (card.canAttackNextTurn === false) { // Dégeler les cartes de l'IA
            card.canAttackNextTurn = true; 
             // ui.displayGameMessage(`${card.name} de l'IA n'est plus gelé.`); // Optionnel
        }
    });
    renderFullBoard(); 

    await new Promise(r => setTimeout(r, 700)); 
    if(gameIsOver){ if (!isPlayerTurn) startPlayerTurnLogic(); return; }
    
    ai.aiDrawCard( { opponentDeck, opponentHand }, { drawCard: actionDrawCard } );
    renderFullBoard(); // Mettre à jour après pioche IA

    await new Promise(r => setTimeout(r, 1200)); 
    if(gameIsOver){ if (!isPlayerTurn) startPlayerTurnLogic(); return; }
    
    ai.aiPlayCard(
        { opponentHand, opponentField, playerField, playerGoalCards }, 
        { playCard: (cardInstId, actor) => handlePlayCardFromHand(cardInstId, actor) } // Passer l'acteur
    );
    // renderFullBoard est appelé dans handlePlayCardFromHand

    await new Promise(r => setTimeout(r, 1700)); 
    if(gameIsOver){ if (!isPlayerTurn) startPlayerTurnLogic(); return; }
    
    const gameStateForAIAttacks = {
        gameIsOver, // Passer la variable locale, pas celle du module
        opponentField,
        playerField,
        playerGoalCards
    };
    await ai.aiPerformAttacks(
        gameStateForAIAttacks,
        { executeAttack: (attacker, target, attackerOwner) => executeCombat(attacker, target, attackerOwner) }  // Passer l'acteur
    );
    // renderFullBoard est appelé dans executeCombat

    // Mettre à jour gameIsOver localement si l'IA a gagné/perdu pendant ses attaques
    if (gameStateForAIAttacks.gameIsOver) {
        gameIsOver = true;
    }
    
    if (!gameIsOver) {
        ui.displayGameMessage("--- Fin du Tour de l'IA ---"); 
        startPlayerTurnLogic();
    } else {
        renderFullBoard(); // Assurer que l'UI est à jour si le jeu s'est terminé
        ui.setTurnIndicator(null, gameIsOver);
    }
}

function startPlayerTurnLogic() {
    if (gameIsOver) { 
        ui.setTurnIndicator(null, gameIsOver); 
        renderFullBoard(); 
        return; 
    }
    turnNumber++;
    ui.displayGameMessage(`--- Tour ${turnNumber} (Joueur) ---`); 
    isPlayerTurn = true; 
    ui.setTurnIndicator('Joueur', gameIsOver);

    playerField.forEach(card => {
        card.hasAttackedThisTurn = false;
        if (card.canAttackNextTurn === false) { // Dégeler les cartes du joueur
            ui.displayGameMessage(`${card.name} peut de nouveau attaquer.`);
            card.canAttackNextTurn = true; 
        }
    });
    actionDrawCard("Joueur"); 
    renderFullBoard(); 
}

// --- Conditions de Victoire ---
function checkWinCondition() {
    if (gameIsOver) return true; 

    const playerGoalsRemaining = playerGoalCards.filter(gc => gc !== null).length;
    const opponentGoalsRemaining = opponentGoalCards.filter(gc => gc !== null).length;

    if (opponentGoalsRemaining === 0) {
        ui.displayGameMessage("GAGNÉ! Tous les objectifs de l'IA ont été détruits!"); 
        gameIsOver = true;
    } else if (playerGoalsRemaining === 0) {
        ui.displayGameMessage("PERDU! Tous vos objectifs ont été détruits!"); 
        gameIsOver = true;
    }
    // Ajouter d'autres conditions de victoire/défaite (ex: deck vide)

    if (gameIsOver) {
        ui.setTurnIndicator(null, gameIsOver); 
        renderFullBoard(); 
        // Peut-être afficher un écran de fin de partie ici
    }
    return gameIsOver;
}