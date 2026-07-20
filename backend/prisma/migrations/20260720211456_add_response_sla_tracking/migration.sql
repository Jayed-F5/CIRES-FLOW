-- AlterTable
ALTER TABLE "demandes" ADD COLUMN     "alerteReponseDepasseEnvoyee" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "alerteReponseRisqueEnvoyee" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "dateLimiteReponse" TIMESTAMP(3),
ADD COLUMN     "dateReponse" TIMESTAMP(3);
