-- Atualizacao do banco para a funcionalidade "Anotacoes Tecnicas"
-- Execute este script no banco helpdesk_urbes da VM.
--
-- Recomendacao de ambiente:
-- Configure ANOTACOES_SECRET no .env do backend antes de usar a funcionalidade.
-- Se ANOTACOES_SECRET nao existir, o backend usa JWT_SECRET como fallback.

CREATE TABLE IF NOT EXISTS anotacoes_tecnicas (
  id int NOT NULL AUTO_INCREMENT,
  titulo varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  conteudo longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  criado_por_id int NOT NULL,
  atualizado_por_id int DEFAULT NULL,
  criado_em datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  atualizado_em datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_anotacoes_tecnicas_criado_por_id (criado_por_id),
  KEY idx_anotacoes_tecnicas_atualizado_por_id (atualizado_por_id),
  KEY idx_anotacoes_tecnicas_atualizado_em (atualizado_em),
  CONSTRAINT fk_anotacoes_tecnicas_criado_por
    FOREIGN KEY (criado_por_id) REFERENCES perfis (id) ON DELETE RESTRICT,
  CONSTRAINT fk_anotacoes_tecnicas_atualizado_por
    FOREIGN KEY (atualizado_por_id) REFERENCES perfis (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS anotacoes_tecnicas_auditoria (
  id int NOT NULL AUTO_INCREMENT,
  anotacao_id int DEFAULT NULL,
  usuario_id int DEFAULT NULL,
  acao enum('criou','editou','excluiu') COLLATE utf8mb4_unicode_ci NOT NULL,
  criado_em datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_anotacoes_tecnicas_auditoria_anotacao_id (anotacao_id),
  KEY idx_anotacoes_tecnicas_auditoria_usuario_id (usuario_id),
  KEY idx_anotacoes_tecnicas_auditoria_criado_em (criado_em),
  CONSTRAINT fk_anotacoes_tecnicas_auditoria_anotacao
    FOREIGN KEY (anotacao_id) REFERENCES anotacoes_tecnicas (id) ON DELETE SET NULL,
  CONSTRAINT fk_anotacoes_tecnicas_auditoria_usuario
    FOREIGN KEY (usuario_id) REFERENCES perfis (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
