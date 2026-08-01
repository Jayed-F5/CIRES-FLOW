-- CreateIndex
CREATE INDEX "approbations_demande_id_idx" ON "approbations"("demande_id");

-- CreateIndex
CREATE INDEX "approbations_etape_id_idx" ON "approbations"("etape_id");

-- CreateIndex
CREATE INDEX "commentaires_demande_id_idx" ON "commentaires"("demande_id");

-- CreateIndex
CREATE INDEX "historique_actions_demande_id_idx" ON "historique_actions"("demande_id");

-- CreateIndex
CREATE INDEX "notifications_utilisateur_id_idx" ON "notifications"("utilisateur_id");

-- CreateIndex
CREATE INDEX "pieces_jointes_demande_id_idx" ON "pieces_jointes"("demande_id");
