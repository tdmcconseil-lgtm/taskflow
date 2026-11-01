-- Nouvel événement d'activité : ajout d'un utilisateur comme suiveur d'une tâche.
-- Isolé dans sa propre migration pour que la valeur d'enum soit validée (commit)
-- avant toute migration susceptible de l'utiliser.
ALTER TYPE "TaskActivityType" ADD VALUE 'FOLLOWER_ADDED';
