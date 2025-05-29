// aiLogic.js
import { hasProtector } from './utils.js';

/**
 * Contient la logique de décision pour l'IA.
 */

/**
 * L'IA pioche une carte.
 * @param {Object} gameState - L'état actuel du jeu.
 * @param {Object} actions - Contenant la fonction pour piocher une carte.
 */
export function aiDrawCard(gameState, actions) {
    if (gameState.opponentDeck.length > 0 && gameState.opponentHand.length < 7) {
        actions.drawCard('IA'); // 'IA' identifie le joueur qui pioche
    } else if (gameState.opponentDeck.length === 0) {
        // L'IA a perdu par deck out (si cette règle est appliquée)
        // uiManager.displayGameMessage("Le deck de l'IA est vide !");
    }
}

/**
 * L'IA joue une carte de sa main.
 * Stratégie simple : joue un Protecteur si elle n'en a pas et qu'elle en a un en main,
 * sinon joue le monstre avec la plus haute ATK.
 * @param {Object} gameState - L'état actuel du jeu.
 * @param {Object} actions - Contenant la fonction pour jouer une carte.
 */
export function aiPlayCard(gameState, actions) {
    if (gameState.opponentHand.length > 0 && gameState.opponentField.length < 5) {
        let cardToPlayInstance = null;

        // Priorité 1: Jouer un Protecteur si l'IA n'en a pas sur le terrain
        if (!hasProtector(gameState.opponentField)) {
            cardToPlayInstance = gameState.opponentHand.find(
                card => card.type === "Monstre" && card.abilities && card.abilities.includes("PROTECTOR")
            );
        }

        // Priorité 2: Si pas de Protecteur à jouer (ou déjà un), jouer le monstre avec la plus haute ATK
        if (!cardToPlayInstance) {
            const monstersInHand = gameState.opponentHand.filter(card => card.type === "Monstre");
            if (monstersInHand.length > 0) {
                monstersInHand.sort((a, b) => b.atk - a.atk); // Trier par ATK décroissante
                cardToPlayInstance = monstersInHand[0];
            }
        }
        
        // Si une carte a été choisie, la jouer
        if (cardToPlayInstance) {
            actions.playCard(cardToPlayInstance.instanceId, 'IA');
        }
    }
}


/**
 * L'IA effectue sa phase d'attaque.
 * @param {Object} gameState - L'état actuel du jeu.
 * @param {Object} actions - Contenant la fonction pour exécuter une attaque.
 * @returns {Promise<void>}
 */
export async function aiPerformAttacks(gameState, actions) {
    if (gameState.gameIsOver) return;

    const attackers = gameState.opponentField.filter(
        card => card.type === "Monstre" && !card.hasAttackedThisTurn && card.canAttackNextTurn
    );

    for (const attacker of attackers) {
        if (gameState.gameIsOver) break; // Arrêter si une attaque précédente a terminé le jeu

        let target = null;

        // Stratégie de ciblage de l'IA :
        // 1. Si le joueur a des Protecteurs, cibler le Protecteur avec la plus basse DEF.
        if (hasProtector(gameState.playerField)) {
            const playerProtectors = gameState.playerField.filter(
                m => m.type === "Monstre" && m.abilities && m.abilities.includes("PROTECTOR")
            );
            if (playerProtectors.length > 0) {
                playerProtectors.sort((a, b) => (a.def || 0) - (b.def || 0));
                target = playerProtectors[0];
            }
        } else {
            // 2. Si le joueur n'a pas de Protecteurs, cibler un objectif non révélé au hasard.
            const availableGoals = gameState.playerGoalCards.filter(gc => gc && !gc.isRevealed);
            if (availableGoals.length > 0) {
                target = availableGoals[Math.floor(Math.random() * availableGoals.length)];
            } else if (gameState.playerField.length > 0) {
                // 3. Si pas d'objectifs disponibles, cibler le monstre joueur avec la plus basse DEF.
                const playerMonsters = gameState.playerField.filter(m => m.type === "Monstre");
                if (playerMonsters.length > 0) {
                    playerMonsters.sort((a, b) => (a.def || 0) - (b.def || 0));
                    target = playerMonsters[0];
                }
            }
        }

        if (target) {
            // L'action d'attaque est maintenant gérée par gameLogic, qui appellera uiManager pour les animations
            await actions.executeAttack(attacker, target, 'IA'); 
        } else {
            // console.log("IA: Aucune cible valide trouvée pour l'attaque de", attacker.name);
        }

        // Petite pause entre les attaques de l'IA pour que ce soit lisible par le joueur
        if (!gameState.gameIsOver && attackers.indexOf(attacker) < attackers.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000)); 
        }
        if (gameState.gameIsOver) break; 
    }
}