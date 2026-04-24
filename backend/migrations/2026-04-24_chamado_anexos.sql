CREATE TABLE chamado_anexos (
  id INT NOT NULL AUTO_INCREMENT,
  chamado_id INT NOT NULL,
  arquivo_url VARCHAR(500) NOT NULL,
  nome_original VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_chamado_anexos_chamado_id (chamado_id),
  CONSTRAINT fk_chamado_anexos_chamado
    FOREIGN KEY (chamado_id) REFERENCES chamados(id)
    ON DELETE CASCADE
);
