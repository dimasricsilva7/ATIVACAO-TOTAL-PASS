-- AlterTable
ALTER TABLE "settings" ADD COLUMN     "crediarioButtonLabel" TEXT NOT NULL DEFAULT 'Enviar pedido no crediário',
ADD COLUMN     "crediarioCpfLabel" TEXT NOT NULL DEFAULT '3 últimos do CPF',
ADD COLUMN     "crediarioCpfPlaceholder" TEXT NOT NULL DEFAULT '000',
ADD COLUMN     "crediarioInstallmentsLabel" TEXT NOT NULL DEFAULT 'Parcelamento',
ADD COLUMN     "crediarioMethodLabel" TEXT NOT NULL DEFAULT 'Crediário',
ADD COLUMN     "crediarioMethodSubtitle" TEXT NOT NULL DEFAULT 'Até {parcelas}x',
ADD COLUMN     "crediarioProtocolLabel" TEXT NOT NULL DEFAULT 'Número do protocolo (16 dígitos)',
ADD COLUMN     "crediarioProtocolPlaceholder" TEXT NOT NULL DEFAULT '0000 0000 0000 0000',
ADD COLUMN     "crediarioSectionTitle" TEXT NOT NULL DEFAULT 'Dados do crediário',
ADD COLUMN     "crediarioSuccessMessage" TEXT NOT NULL DEFAULT 'Recebemos seu pedido no crediário. Nossa equipe vai analisar e confirmar a ativação do seu acesso, e entrar em contato pelo WhatsApp.',
ADD COLUMN     "crediarioSuccessTitle" TEXT NOT NULL DEFAULT 'Pedido enviado!',
ADD COLUMN     "crediarioValidityLabel" TEXT NOT NULL DEFAULT 'Validade (MM/AA)',
ADD COLUMN     "crediarioValidityPlaceholder" TEXT NOT NULL DEFAULT 'MM/AA';

