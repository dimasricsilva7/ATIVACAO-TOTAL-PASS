-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NOVO', 'CONVERSA_INICIADA', 'EM_ATENDIMENTO', 'ATIVADO', 'NAO_CONVERTIDO');

-- CreateEnum
CREATE TYPE "QuizEventType" AS ENUM ('quiz_started', 'fee_step_reached', 'lead_submitted', 'whatsapp_clicked');

-- CreateEnum
CREATE TYPE "AdminRole" AS ENUM ('EDITOR', 'ADMIN', 'OWNER');

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT,
    "nome" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "objetivo" TEXT,
    "acesso_atual" TEXT,
    "preferencia_treino" TEXT,
    "cidade" TEXT,
    "estado" TEXT,
    "resposta_taxa" TEXT,
    "origem" TEXT,
    "utm_source" TEXT,
    "utm_medium" TEXT,
    "utm_campaign" TEXT,
    "utm_content" TEXT,
    "utm_term" TEXT,
    "fbclid" TEXT,
    "marketing_consent" BOOLEAN NOT NULL DEFAULT false,
    "status" "LeadStatus" NOT NULL DEFAULT 'NOVO',
    "valor_recebido" INTEGER,
    "confirmado_em" TIMESTAMP(3),
    "obs_admin" TEXT,
    "ip_hash" TEXT,
    "data_criacao" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_atualizacao" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_events" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "type" "QuizEventType" NOT NULL,
    "utm_source" TEXT,
    "utm_campaign" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quiz_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ad_spend" (
    "id" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "campanha" TEXT,
    "valor_cents" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ad_spend_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'ADMIN',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_sessions" (
    "id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "ip_hash" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_attempts" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "leads_sessionId_key" ON "leads"("sessionId");

-- CreateIndex
CREATE INDEX "leads_status_idx" ON "leads"("status");

-- CreateIndex
CREATE INDEX "leads_data_criacao_idx" ON "leads"("data_criacao");

-- CreateIndex
CREATE INDEX "leads_utm_campaign_idx" ON "leads"("utm_campaign");

-- CreateIndex
CREATE INDEX "quiz_events_type_created_at_idx" ON "quiz_events"("type", "created_at");

-- CreateIndex
CREATE INDEX "quiz_events_utm_campaign_idx" ON "quiz_events"("utm_campaign");

-- CreateIndex
CREATE UNIQUE INDEX "quiz_events_session_id_type_key" ON "quiz_events"("session_id", "type");

-- CreateIndex
CREATE INDEX "ad_spend_data_idx" ON "ad_spend"("data");

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "admin_sessions_token_hash_key" ON "admin_sessions"("token_hash");

-- CreateIndex
CREATE INDEX "admin_sessions_admin_id_idx" ON "admin_sessions"("admin_id");

-- CreateIndex
CREATE INDEX "login_attempts_key_created_at_idx" ON "login_attempts"("key", "created_at");

-- AddForeignKey
ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

