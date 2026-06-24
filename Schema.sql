-- MySQL dump 10.13  Distrib 8.0.44, for Win64 (x86_64)
--
-- Host: localhost    Database: helpdesk_urbes
-- ------------------------------------------------------
-- Server version	9.5.0

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;
SET @MYSQLDUMP_TEMP_LOG_BIN = @@SESSION.SQL_LOG_BIN;
SET @@SESSION.SQL_LOG_BIN= 0;

--
-- GTID state at the beginning of the backup 
--

SET @@GLOBAL.GTID_PURGED=/*!80000 '+'*/ 'c83d680f-bb1b-11f0-9545-42afe947779d:1-1909';

--
-- Table structure for table `anotacoes_tecnicas`
--

DROP TABLE IF EXISTS `anotacoes_tecnicas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `anotacoes_tecnicas` (
  `id` int NOT NULL AUTO_INCREMENT,
  `titulo` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `conteudo` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `criado_por_id` int NOT NULL,
  `atualizado_por_id` int DEFAULT NULL,
  `criado_em` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `atualizado_em` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_anotacoes_tecnicas_criado_por_id` (`criado_por_id`),
  KEY `idx_anotacoes_tecnicas_atualizado_por_id` (`atualizado_por_id`),
  KEY `idx_anotacoes_tecnicas_atualizado_em` (`atualizado_em`),
  CONSTRAINT `fk_anotacoes_tecnicas_atualizado_por` FOREIGN KEY (`atualizado_por_id`) REFERENCES `perfis` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_anotacoes_tecnicas_criado_por` FOREIGN KEY (`criado_por_id`) REFERENCES `perfis` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `anotacoes_tecnicas_auditoria`
--

DROP TABLE IF EXISTS `anotacoes_tecnicas_auditoria`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `anotacoes_tecnicas_auditoria` (
  `id` int NOT NULL AUTO_INCREMENT,
  `anotacao_id` int DEFAULT NULL,
  `usuario_id` int DEFAULT NULL,
  `acao` enum('criou','editou','excluiu') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `criado_em` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_anotacoes_tecnicas_auditoria_anotacao_id` (`anotacao_id`),
  KEY `idx_anotacoes_tecnicas_auditoria_usuario_id` (`usuario_id`),
  KEY `idx_anotacoes_tecnicas_auditoria_criado_em` (`criado_em`),
  CONSTRAINT `fk_anotacoes_tecnicas_auditoria_anotacao` FOREIGN KEY (`anotacao_id`) REFERENCES `anotacoes_tecnicas` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_anotacoes_tecnicas_auditoria_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `perfis` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `anotacao_arquivos`
--

DROP TABLE IF EXISTS `anotacao_arquivos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `anotacao_arquivos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `anotacao_id` int NOT NULL,
  `nome_original` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `arquivo_path` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mime_type` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tamanho` int NOT NULL,
  `uploaded_by` int DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_anotacao_arquivos_anotacao_id` (`anotacao_id`),
  KEY `idx_anotacao_arquivos_uploaded_by` (`uploaded_by`),
  KEY `idx_anotacao_arquivos_created_at` (`created_at`),
  CONSTRAINT `fk_anotacao_arquivos_anotacao` FOREIGN KEY (`anotacao_id`) REFERENCES `anotacoes_tecnicas` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_anotacao_arquivos_uploaded_by` FOREIGN KEY (`uploaded_by`) REFERENCES `perfis` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `avisos`
--

DROP TABLE IF EXISTS `avisos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `avisos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `titulo` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mensagem` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `tipo` enum('info','alerta','critico') COLLATE utf8mb4_unicode_ci DEFAULT 'info',
  `ativo` tinyint(1) DEFAULT '1',
  `criado_em` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `chamado_anexos`
--

DROP TABLE IF EXISTS `chamado_anexos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chamado_anexos` (
  `id` int NOT NULL AUTO_INCREMENT,
  `chamado_id` int NOT NULL,
  `arquivo_url` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nome_original` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `mime_type` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `criado_em` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_chamado_anexos_chamado_id` (`chamado_id`),
  CONSTRAINT `fk_chamado_anexos_chamado` FOREIGN KEY (`chamado_id`) REFERENCES `chamados` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `chamados`
--

DROP TABLE IF EXISTS `chamados`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `chamados` (
  `id` int NOT NULL AUTO_INCREMENT,
  `titulo` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descricao` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('aberto','pendente','em_andamento','resolvido','fechado') COLLATE utf8mb4_unicode_ci DEFAULT 'aberto',
  `prioridade` enum('baixa','media','alta','urgente') COLLATE utf8mb4_unicode_ci DEFAULT 'media',
  `criado_por_id` int DEFAULT NULL,
  `atribuido_para_id` int DEFAULT NULL,
  `registrado_por_id` int DEFAULT NULL,
  `solicitante_nome_manual` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `solicitante_contato_manual` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `solicitante_setor_manual` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `origem_solicitacao` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `observacao_interna` text COLLATE utf8mb4_unicode_ci,
  `anexo_url` text COLLATE utf8mb4_unicode_ci,
  `criado_em` datetime DEFAULT CURRENT_TIMESTAMP,
  `tipo` enum('incidente','solicitacao') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'incidente',
  `categoria` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `criado_por_id` (`criado_por_id`),
  KEY `atribuido_para_id` (`atribuido_para_id`),
  KEY `idx_chamados_registrado_por_id` (`registrado_por_id`),
  KEY `idx_chamados_origem_solicitacao` (`origem_solicitacao`),
  CONSTRAINT `chamados_ibfk_1` FOREIGN KEY (`criado_por_id`) REFERENCES `perfis` (`id`) ON DELETE CASCADE,
  CONSTRAINT `chamados_ibfk_2` FOREIGN KEY (`atribuido_para_id`) REFERENCES `perfis` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=146 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `comentarios`
--

DROP TABLE IF EXISTS `comentarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `comentarios` (
  `id` int NOT NULL AUTO_INCREMENT,
  `texto` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `chamado_id` int NOT NULL,
  `usuario_id` int NOT NULL,
  `criado_em` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `chamado_id` (`chamado_id`),
  KEY `usuario_id` (`usuario_id`),
  CONSTRAINT `comentarios_ibfk_1` FOREIGN KEY (`chamado_id`) REFERENCES `chamados` (`id`) ON DELETE CASCADE,
  CONSTRAINT `comentarios_ibfk_2` FOREIGN KEY (`usuario_id`) REFERENCES `perfis` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=132 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `itens_estoque`
--

DROP TABLE IF EXISTS `itens_estoque`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `itens_estoque` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nome` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `categoria` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `descricao` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `quantidade_atual` int NOT NULL DEFAULT '0',
  `quantidade_minima` int NOT NULL DEFAULT '0',
  `localizacao` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ativo` tinyint(1) NOT NULL DEFAULT '1',
  `criado_em` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `movimentacoes_estoque`
--

DROP TABLE IF EXISTS `movimentacoes_estoque`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `movimentacoes_estoque` (
  `id` int NOT NULL AUTO_INCREMENT,
  `item_id` int NOT NULL,
  `tipo` enum('entrada','saida') COLLATE utf8mb4_unicode_ci NOT NULL,
  `quantidade` int NOT NULL,
  `chamado_id` int DEFAULT NULL,
  `observacao` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `criado_em` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_mov_item` (`item_id`),
  KEY `fk_mov_chamado` (`chamado_id`),
  CONSTRAINT `fk_mov_chamado` FOREIGN KEY (`chamado_id`) REFERENCES `chamados` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_mov_item` FOREIGN KEY (`item_id`) REFERENCES `itens_estoque` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `perfis`
--

DROP TABLE IF EXISTS `perfis`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `perfis` (
  `id` int NOT NULL,
  `nome_completo` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nivel` enum('funcionario','tecnico','admin') COLLATE utf8mb4_unicode_ci DEFAULT 'funcionario',
  `setor_texto` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cargo_texto` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `perfis_ibfk_1` FOREIGN KEY (`id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `relatorios_chamado`
--

DROP TABLE IF EXISTS `relatorios_chamado`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `relatorios_chamado` (
  `id` int NOT NULL AUTO_INCREMENT,
  `chamado_id` int NOT NULL,
  `tecnico_id` int DEFAULT NULL,
  `titulo` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `relatorio` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `criado_em` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `chamado_id` (`chamado_id`),
  KEY `tecnico_id` (`tecnico_id`),
  CONSTRAINT `relatorios_chamado_ibfk_1` FOREIGN KEY (`chamado_id`) REFERENCES `chamados` (`id`) ON DELETE CASCADE,
  CONSTRAINT `relatorios_chamado_ibfk_2` FOREIGN KEY (`tecnico_id`) REFERENCES `perfis` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=86 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `usuarios`
--

DROP TABLE IF EXISTS `usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuarios` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `senha_hash` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `criado_em` datetime DEFAULT CURRENT_TIMESTAMP,
  `reset_token` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reset_token_expire` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=84 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
SET @@SESSION.SQL_LOG_BIN = @MYSQLDUMP_TEMP_LOG_BIN;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-06-24 11:45:25
