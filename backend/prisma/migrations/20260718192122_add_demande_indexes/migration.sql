-- CreateIndex
CREATE INDEX "demandes_departement_id_idx" ON "demandes"("departement_id");

-- CreateIndex
CREATE INDEX "demandes_categorie_id_idx" ON "demandes"("categorie_id");

-- CreateIndex
CREATE INDEX "demandes_demandeur_id_idx" ON "demandes"("demandeur_id");

-- CreateIndex
CREATE INDEX "demandes_statut_idx" ON "demandes"("statut");

-- CreateIndex
CREATE INDEX "demandes_priorite_idx" ON "demandes"("priorite");
