-- AlterTable
ALTER TABLE "demandes" ADD COLUMN     "alerteDepasseEnvoyee" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "alerteRisqueEnvoyee" BOOLEAN NOT NULL DEFAULT false;
