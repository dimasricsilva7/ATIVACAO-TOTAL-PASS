-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PAID', 'EXPIRED', 'CANCELED');

-- CreateTable
CREATE TABLE "settings" (
    "id" TEXT NOT NULL DEFAULT 'app',
    "ctaMode" TEXT NOT NULL DEFAULT 'whatsapp',
    "merchantDescriptor" TEXT NOT NULL DEFAULT 'BRASIL PAY SERVIÇOS LTDA',
    "productName" TEXT NOT NULL DEFAULT 'Ativação TotalPass',
    "productDescription" TEXT NOT NULL DEFAULT 'Inclusão de 1 CPF no programa de benefícios TotalPass, com ativação e acompanhamento da nossa equipe.',
    "priceCents" INTEGER NOT NULL DEFAULT 24990,
    "checkoutHeadline" TEXT NOT NULL DEFAULT 'Ative seu acesso ao TotalPass',
    "checkoutSubheadline" TEXT NOT NULL DEFAULT 'Pagamento único e seguro via Pix. Ativação da sua inclusão no programa.',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "session_id" TEXT,
    "lead_id" TEXT,
    "nome" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "amount_cents" INTEGER NOT NULL,
    "merchant_descriptor" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "tx_id" TEXT,
    "pix_copy_paste" TEXT,
    "pix_expires_at" TIMESTAMP(3),
    "utm_source" TEXT,
    "utm_medium" TEXT,
    "utm_campaign" TEXT,
    "utm_content" TEXT,
    "utm_term" TEXT,
    "fbclid" TEXT,
    "ip_hash" TEXT,
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "orders_numero_key" ON "orders"("numero");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "orders_created_at_idx" ON "orders"("created_at");

-- CreateIndex
CREATE INDEX "orders_utm_campaign_idx" ON "orders"("utm_campaign");

