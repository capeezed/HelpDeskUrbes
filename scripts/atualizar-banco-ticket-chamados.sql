-- Atualizacao do banco para identificador publico dos chamados.
-- Execute este script no banco helpdesk_urbes.

ALTER TABLE chamados
  ADD COLUMN ticket_codigo varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER id;

UPDATE chamados
SET ticket_codigo = CONCAT('TI', LPAD(id, 6, '0'))
WHERE ticket_codigo IS NULL;

CREATE UNIQUE INDEX idx_chamados_ticket_codigo ON chamados (ticket_codigo);
