-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('PIX', 'CREDIARIO');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "crediario_cpf_last" TEXT,
ADD COLUMN     "crediario_installments" INTEGER,
ADD COLUMN     "crediario_protocol" TEXT,
ADD COLUMN     "crediario_validity" TEXT,
ADD COLUMN     "method" "PaymentMethod" NOT NULL DEFAULT 'PIX';

-- AlterTable
ALTER TABLE "settings" ADD COLUMN     "crediarioEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "crediarioInstructions" TEXT NOT NULL DEFAULT 'Informe os dados do seu crediário. Após a análise, nossa equipe confirma a ativação do seu acesso.',
ADD COLUMN     "crediarioMaxInstallments" INTEGER NOT NULL DEFAULT 12;

