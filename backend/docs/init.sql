-- ============================================================================
-- EFVM360 — Inicialização do MySQL
-- Executado automaticamente pelo Docker na primeira execução
-- ============================================================================

-- Garante charset correto
ALTER DATABASE efvm360_railway CHARACTER SET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Permissões completas para o app
GRANT ALL PRIVILEGES ON efvm360_railway.* TO 'efvm360_app'@'%';
FLUSH PRIVILEGES;

-- Variáveis de sessão para timezone Brasil
SET GLOBAL time_zone = '-03:00';
SET time_zone = '-03:00';
