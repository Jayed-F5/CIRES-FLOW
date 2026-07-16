-- CreateEnum
CREATE TYPE "Role" AS ENUM ('EMPLOYE', 'AGENT', 'MANAGER', 'ADMIN');

-- CreateEnum
CREATE TYPE "Priorite" AS ENUM ('BASSE', 'NORMALE', 'HAUTE', 'URGENTE');

-- CreateEnum
CREATE TYPE "StatutDemande" AS ENUM ('NOUVEAU', 'EN_ATTENTE_APPROBATION', 'EN_COURS', 'RESOLU', 'CLOTURE', 'REJETE', 'ANNULE');

-- CreateEnum
CREATE TYPE "VisibiliteCommentaire" AS ENUM ('INTERNE', 'PUBLIC');

-- CreateEnum
CREATE TYPE "StatutApprobation" AS ENUM ('EN_ATTENTE', 'APPROUVE', 'REJETE');

-- CreateTable
CREATE TABLE "utilisateurs" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "prenom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "motDePasse" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "departement_id" INTEGER,

    CONSTRAINT "utilisateurs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departements" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,

    CONSTRAINT "departements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "departement_id" INTEGER NOT NULL,
    "delaiReponse" INTEGER NOT NULL,
    "delaiResolution" INTEGER NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "demandes" (
    "id" SERIAL NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priorite" "Priorite" NOT NULL,
    "statut" "StatutDemande" NOT NULL DEFAULT 'NOUVEAU',
    "departement_id" INTEGER NOT NULL,
    "categorie_id" INTEGER NOT NULL,
    "demandeur_id" INTEGER NOT NULL,
    "agent_id" INTEGER,
    "dateCreation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dateCloture" TIMESTAMP(3),
    "dateLimiteSLA" TIMESTAMP(3),
    "metadata" JSONB,

    CONSTRAINT "demandes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commentaires" (
    "id" SERIAL NOT NULL,
    "demande_id" INTEGER NOT NULL,
    "auteur_id" INTEGER NOT NULL,
    "contenu" TEXT NOT NULL,
    "visibilite" "VisibiliteCommentaire" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commentaires_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pieces_jointes" (
    "id" SERIAL NOT NULL,
    "demande_id" INTEGER NOT NULL,
    "nomFichier" TEXT NOT NULL,
    "cheminFichier" TEXT NOT NULL,
    "dateUpload" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pieces_jointes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historique_actions" (
    "id" SERIAL NOT NULL,
    "demande_id" INTEGER NOT NULL,
    "auteur_id" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historique_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_etapes" (
    "id" SERIAL NOT NULL,
    "categorie_id" INTEGER NOT NULL,
    "ordre" INTEGER NOT NULL,
    "roleApprobateur" "Role" NOT NULL,

    CONSTRAINT "workflow_etapes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "approbations" (
    "id" SERIAL NOT NULL,
    "demande_id" INTEGER NOT NULL,
    "etape_id" INTEGER NOT NULL,
    "approbateur_id" INTEGER,
    "statut" "StatutApprobation" NOT NULL DEFAULT 'EN_ATTENTE',
    "date" TIMESTAMP(3),
    "commentaire" TEXT,

    CONSTRAINT "approbations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" SERIAL NOT NULL,
    "utilisateur_id" INTEGER NOT NULL,
    "message" TEXT NOT NULL,
    "lien" TEXT,
    "lu" BOOLEAN NOT NULL DEFAULT false,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "utilisateurs_email_key" ON "utilisateurs"("email");

-- CreateIndex
CREATE UNIQUE INDEX "departements_nom_key" ON "departements"("nom");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_etapes_categorie_id_ordre_key" ON "workflow_etapes"("categorie_id", "ordre");

-- AddForeignKey
ALTER TABLE "utilisateurs" ADD CONSTRAINT "utilisateurs_departement_id_fkey" FOREIGN KEY ("departement_id") REFERENCES "departements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_departement_id_fkey" FOREIGN KEY ("departement_id") REFERENCES "departements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demandes" ADD CONSTRAINT "demandes_departement_id_fkey" FOREIGN KEY ("departement_id") REFERENCES "departements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demandes" ADD CONSTRAINT "demandes_categorie_id_fkey" FOREIGN KEY ("categorie_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demandes" ADD CONSTRAINT "demandes_demandeur_id_fkey" FOREIGN KEY ("demandeur_id") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "demandes" ADD CONSTRAINT "demandes_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "utilisateurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commentaires" ADD CONSTRAINT "commentaires_demande_id_fkey" FOREIGN KEY ("demande_id") REFERENCES "demandes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commentaires" ADD CONSTRAINT "commentaires_auteur_id_fkey" FOREIGN KEY ("auteur_id") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pieces_jointes" ADD CONSTRAINT "pieces_jointes_demande_id_fkey" FOREIGN KEY ("demande_id") REFERENCES "demandes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historique_actions" ADD CONSTRAINT "historique_actions_demande_id_fkey" FOREIGN KEY ("demande_id") REFERENCES "demandes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historique_actions" ADD CONSTRAINT "historique_actions_auteur_id_fkey" FOREIGN KEY ("auteur_id") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_etapes" ADD CONSTRAINT "workflow_etapes_categorie_id_fkey" FOREIGN KEY ("categorie_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approbations" ADD CONSTRAINT "approbations_demande_id_fkey" FOREIGN KEY ("demande_id") REFERENCES "demandes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approbations" ADD CONSTRAINT "approbations_etape_id_fkey" FOREIGN KEY ("etape_id") REFERENCES "workflow_etapes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "approbations" ADD CONSTRAINT "approbations_approbateur_id_fkey" FOREIGN KEY ("approbateur_id") REFERENCES "utilisateurs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_utilisateur_id_fkey" FOREIGN KEY ("utilisateur_id") REFERENCES "utilisateurs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
