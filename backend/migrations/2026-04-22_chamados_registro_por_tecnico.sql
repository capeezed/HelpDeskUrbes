-- Campos para permitir que técnico/admin registre chamado em nome de usuário cadastrado
-- ou de solicitante sem cadastro.

ALTER TABLE chamados
  MODIFY criado_por_id INT NULL,
  ADD COLUMN registrado_por_id INT NULL AFTER atribuido_para_id,
  ADD COLUMN solicitante_nome_manual VARCHAR(255) NULL AFTER registrado_por_id,
  ADD COLUMN solicitante_contato_manual VARCHAR(255) NULL AFTER solicitante_nome_manual,
  ADD COLUMN solicitante_setor_manual VARCHAR(255) NULL AFTER solicitante_contato_manual,
  ADD COLUMN origem_solicitacao VARCHAR(30) NULL AFTER solicitante_setor_manual,
  ADD COLUMN observacao_interna TEXT NULL AFTER origem_solicitacao;

CREATE INDEX idx_chamados_registrado_por_id ON chamados (registrado_por_id);
CREATE INDEX idx_chamados_origem_solicitacao ON chamados (origem_solicitacao);
