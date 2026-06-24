// ======================== IMPORTS =========================
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const pool = require('./db');
const { autenticarToken, apenasTecnicos } = require('./authMiddleware');
const crypto = require('crypto'); 
const nodemailer = require('nodemailer'); 



console.log('EMAIL:', process.env.BREVO_EMAIL); console.log('SMTP:', process.env.BREVO_SMTP_KEY);
// ======================== APP/HTTP/WS ======================
const app = express();
const http = require('http');
const server = http.createServer(app);
const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_ATTACHMENTS_PER_TICKET = 5;
const MAX_ATTACHMENTS_PER_NOTE = 10;
const ALLOWED_UPLOAD_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif'
]);
const DANGEROUS_UPLOAD_EXTENSIONS = new Set([
  '.exe',
  '.bat',
  '.cmd',
  '.msi',
  '.ps1',
  '.vbs',
  '.js',
  '.jar',
  '.scr',
  '.com'
]);
const ALLOWED_ANOTACAO_FILE_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.pdf',
  '.doc',
  '.docx',
  '.txt',
  '.xls',
  '.xlsx',
  '.csv',
  '.zip',
  '.rar',
  '.log',
  '.sql',
  '.xml',
  '.json',
  '.md'
]);
const ALLOWED_ANOTACAO_MIME_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'application/csv',
  'application/zip',
  'application/x-zip-compressed',
  'application/vnd.rar',
  'application/x-rar-compressed',
  'application/json',
  'application/xml',
  'text/xml',
  'text/markdown',
  'application/octet-stream'
]);
const ANOTACOES_UPLOAD_DIR = path.join(__dirname, 'private_uploads', 'anotacoes-tecnicas');
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '12h';

// Socket.IO com CORS liberado
const { Server } = require('socket.io');
const io = new Server(server, {
  cors: {
    origin: '*', // libera qualquer origem (IP/localhost/domínio)
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  }
});

const PORT = process.env.PORT || 300;

const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.BREVO_EMAIL,
    pass: process.env.BREVO_SMTP_KEY
  }
});



// ======================== MIDDLEWARES ======================
// CORS genérico
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Preflight sem usar app.options('*', ...) (evita PathToRegexp error)
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

// ======================== MULTER (UPLOADS) =================
fs.mkdirSync(ANOTACOES_UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => { cb(null, 'uploads/'); },
  filename: (req, file, cb) => {
    const sanitizedName = path
      .basename(file.originalname)
      .replace(/[^a-zA-Z0-9._-]/g, '_');

    cb(null, `${Date.now()}-${sanitizedName}`);
  }
});
const upload = multer({
  storage,
  limits: {
    fileSize: MAX_UPLOAD_SIZE_BYTES
  },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_UPLOAD_MIME_TYPES.has(file.mimetype)) {
      return cb(new Error('Tipo de arquivo nÃ£o permitido.'));
    }

    cb(null, true);
  }
});
const uploadChamadoAnexos = upload.array('anexos', MAX_ATTACHMENTS_PER_TICKET);

const anotacaoStorage = multer.diskStorage({
  destination: (req, file, cb) => { cb(null, ANOTACOES_UPLOAD_DIR); },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`);
  }
});
const uploadAnotacao = multer({
  storage: anotacaoStorage,
  limits: {
    fileSize: MAX_UPLOAD_SIZE_BYTES
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();

    if (DANGEROUS_UPLOAD_EXTENSIONS.has(ext) || !ALLOWED_ANOTACAO_FILE_EXTENSIONS.has(ext)) {
      return cb(new Error('Tipo de arquivo nao permitido.'));
    }

    if (!ALLOWED_ANOTACAO_MIME_TYPES.has(file.mimetype)) {
      return cb(new Error('Tipo de arquivo nao permitido.'));
    }

    cb(null, true);
  }
});
const uploadAnotacaoArquivos = uploadAnotacao.array('arquivos', MAX_ATTACHMENTS_PER_NOTE);

function processarUploadAnotacaoArquivos(req, res, next) {
  uploadAnotacaoArquivos(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      removerArquivosEnviados(req.files);

      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'Um dos arquivos excede o tamanho maximo de 5 MB.' });
      }

      if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        return res.status(400).json({ message: 'Limite de arquivos excedido.' });
      }

      return res.status(400).json({ message: 'Erro ao processar os arquivos enviados.' });
    }

    if (err) {
      removerArquivosEnviados(req.files);
      return res.status(400).json({ message: err.message || 'Arquivo invalido.' });
    }

    next();
  });
}

// ======================== SOCKET.IO STATE ==================
/** Mapa userId -> socketId (1:1 simples) */
const clientesConectados = new Map();

io.on('connection', (socket) => {
  console.log('✅ WebSocket conectado:', socket.id);

  socket.on('registrarUsuario', (userId) => {
  if (!userId) return;

  // Remove sockets anteriores do mesmo usuário
  for (const [uid, sid] of clientesConectados.entries()) {
    if (uid === Number(userId) && sid !== socket.id) {
      clientesConectados.delete(uid);
      console.log(`♻️ Substituindo conexão antiga do userId ${userId}`);
    }
  }

  clientesConectados.set(Number(userId), socket.id);
  console.log(`🔗 userId ${userId} associado ao socket ${socket.id}`);
});

  socket.on('disconnect', () => {
    for (const [userId, sockId] of clientesConectados.entries()) {
      if (sockId === socket.id) {
        clientesConectados.delete(userId);
        break;
      }
    }
    console.log('❌ WebSocket desconectado:', socket.id);
  });
});

// Helpers para emitir eventos
function enviarParaUsuario(userId, evento, dados) {
  const socketId = clientesConectados.get(Number(userId));
  if (socketId) {
    io.to(socketId).emit(evento, dados);
  }
}

async function enviarParaTecnicos(evento, dados) {
  try {
    const [rows] = await pool.query("SELECT id FROM perfis WHERE nivel IN ('tecnico','admin')");
    rows.forEach(r => enviarParaUsuario(r.id, evento, dados));
  } catch (e) {
    console.error('Erro ao emitir para técnicos:', e?.message || e);
  }
}

// ======================== ROTAS API ========================

const SLA_SELECT = `
  DATE_ADD(
    c.criado_em,
    INTERVAL CASE c.prioridade
      WHEN 'urgente' THEN 4
      WHEN 'alta' THEN 8
      WHEN 'media' THEN 24
      WHEN 'baixa' THEN 48
      ELSE 24
    END HOUR
  ) AS sla_prazo_em,
  TIMESTAMPDIFF(
    MINUTE,
    NOW(),
    DATE_ADD(
      c.criado_em,
      INTERVAL CASE c.prioridade
        WHEN 'urgente' THEN 4
        WHEN 'alta' THEN 8
        WHEN 'media' THEN 24
        WHEN 'baixa' THEN 48
        ELSE 24
      END HOUR
    )
  ) AS sla_minutos_restantes,
  CASE
    WHEN c.status IN ('resolvido', 'fechado') THEN 'encerrado'
    WHEN NOW() > DATE_ADD(
      c.criado_em,
      INTERVAL CASE c.prioridade
        WHEN 'urgente' THEN 4
        WHEN 'alta' THEN 8
        WHEN 'media' THEN 24
        WHEN 'baixa' THEN 48
        ELSE 24
      END HOUR
    ) THEN 'vencido'
    WHEN TIMESTAMPDIFF(
      MINUTE,
      NOW(),
      DATE_ADD(
        c.criado_em,
        INTERVAL CASE c.prioridade
          WHEN 'urgente' THEN 4
          WHEN 'alta' THEN 8
          WHEN 'media' THEN 24
          WHEN 'baixa' THEN 48
          ELSE 24
        END HOUR
      )
    ) <= 60 THEN 'alerta'
    ELSE 'dentro'
  END AS sla_status
`;

function normalizarTextoParaPrioridade(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function contemTermo(texto, termos) {
  return termos.some(termo => texto.includes(termo));
}

function classificarPrioridadeChamado({ titulo, descricao, tipo, categoria }) {
  const texto = normalizarTextoParaPrioridade(`${titulo} ${descricao} ${tipo} ${categoria}`);

  const termosUrgentes = [
    'urgente',
    'emergencia',
    'parado',
    'parada',
    'fora do ar',
    'sem internet',
    'sem rede',
    'todos sem acesso',
    'ninguem acessa',
    'nao acessa',
    'nao consigo acessar',
    'nao liga',
    'servidor',
    'sistema fora',
    'producao',
    'operacao parada',
    'atendimento parado'
  ];

  const termosAltos = [
    'sem acesso',
    'erro ao acessar',
    'nao abre',
    'nao imprime',
    'impressora parada',
    'computador travando',
    'travando muito',
    'perdi acesso',
    'bloqueado',
    'falha',
    'erro',
    'nao funciona'
  ];

  const termosBaixos = [
    'duvida',
    'orientacao',
    'instalar',
    'instalacao',
    'trocar',
    'substituir',
    'configurar',
    'cadastro',
    'solicitacao de acesso',
    'novo usuario',
    'ajuste'
  ];

  if (contemTermo(texto, termosUrgentes)) return 'urgente';
  if (contemTermo(texto, termosAltos)) return 'alta';
  if (tipo === 'incidente') return 'media';
  if (contemTermo(texto, termosBaixos)) return 'baixa';
  return 'media';
}

function getUploadedImages(req) {
  return req.files || [];
}

function buildAttachmentUrl(req, file) {
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  return `${baseUrl}/uploads/${file.filename}`;
}

async function inserirAnexosChamado(conn, req, chamadoId, arquivos) {
  if (!arquivos.length) return null;

  const valores = arquivos.map(file => [
    chamadoId,
    buildAttachmentUrl(req, file),
    file.originalname,
    file.mimetype
  ]);

  await conn.query(
    `INSERT INTO chamado_anexos (chamado_id, arquivo_url, nome_original, mime_type)
     VALUES ?`,
    [valores]
  );

  return valores[0][1];
}

const ANOTACAO_ENCRYPTION_PREFIX = 'enc:v1:';
let anotacoesSecretKey;

function getAnotacoesSecret() {
  if (anotacoesSecretKey) return anotacoesSecretKey;

  const secret = process.env.ANOTACOES_SECRET || process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('ANOTACOES_SECRET ou JWT_SECRET nao configurado.');
  }

  anotacoesSecretKey = crypto.scryptSync(secret, 'helpdesk-urbes-anotacoes', 32);
  return anotacoesSecretKey;
}

function criptografarAnotacao(conteudo) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', getAnotacoesSecret(), iv);
  const encrypted = Buffer.concat([
    cipher.update(String(conteudo), 'utf8'),
    cipher.final()
  ]);
  const tag = cipher.getAuthTag();

  return ANOTACAO_ENCRYPTION_PREFIX + Buffer.from(JSON.stringify({
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    data: encrypted.toString('base64')
  })).toString('base64');
}

function descriptografarAnotacao(valor) {
  if (!valor || !String(valor).startsWith(ANOTACAO_ENCRYPTION_PREFIX)) {
    return valor;
  }

  const raw = String(valor).slice(ANOTACAO_ENCRYPTION_PREFIX.length);
  const payload = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    getAnotacoesSecret(),
    Buffer.from(payload.iv, 'base64')
  );

  decipher.setAuthTag(Buffer.from(payload.tag, 'base64'));

  return Buffer.concat([
    decipher.update(Buffer.from(payload.data, 'base64')),
    decipher.final()
  ]).toString('utf8');
}

async function registrarAuditoriaAnotacao(conn, anotacaoId, usuarioId, acao) {
  await conn.query(
    `INSERT INTO anotacoes_tecnicas_auditoria (anotacao_id, usuario_id, acao)
     VALUES (?, ?, ?)`,
    [anotacaoId, usuarioId, acao]
  );
}

function arquivoComecaCom(buffer, bytes) {
  if (buffer.length < bytes.length) return false;
  return bytes.every((byte, index) => buffer[index] === byte);
}

function arquivoTextoSeguro(buffer) {
  return !buffer.includes(0);
}

function validarAssinaturaArquivo(file) {
  const ext = path.extname(file.originalname).toLowerCase();
  const buffer = fs.readFileSync(file.path);

  if (ext === '.png') return arquivoComecaCom(buffer, [0x89, 0x50, 0x4E, 0x47]);
  if (ext === '.jpg' || ext === '.jpeg') return arquivoComecaCom(buffer, [0xFF, 0xD8, 0xFF]);
  if (ext === '.webp') {
    return buffer.slice(0, 4).toString('ascii') === 'RIFF' &&
      buffer.slice(8, 12).toString('ascii') === 'WEBP';
  }
  if (ext === '.pdf') return arquivoComecaCom(buffer, [0x25, 0x50, 0x44, 0x46]);
  if (ext === '.zip' || ext === '.docx' || ext === '.xlsx') {
    return arquivoComecaCom(buffer, [0x50, 0x4B, 0x03, 0x04]) ||
      arquivoComecaCom(buffer, [0x50, 0x4B, 0x05, 0x06]) ||
      arquivoComecaCom(buffer, [0x50, 0x4B, 0x07, 0x08]);
  }
  if (ext === '.rar') {
    return arquivoComecaCom(buffer, [0x52, 0x61, 0x72, 0x21, 0x1A, 0x07]);
  }
  if (ext === '.doc' || ext === '.xls') {
    return arquivoComecaCom(buffer, [0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]);
  }
  if (['.txt', '.csv', '.log', '.sql', '.xml', '.json', '.md'].includes(ext)) {
    return arquivoTextoSeguro(buffer.slice(0, Math.min(buffer.length, 4096)));
  }

  return false;
}

function removerArquivoFisico(arquivoPath) {
  if (!arquivoPath) return;

  const fullPath = path.resolve(__dirname, arquivoPath);
  const basePath = path.resolve(ANOTACOES_UPLOAD_DIR);

  if (fullPath !== basePath && !fullPath.startsWith(basePath + path.sep)) return;

  fs.unlink(fullPath, (err) => {
    if (err && err.code !== 'ENOENT') {
      console.error('Erro ao remover arquivo de anotacao:', err.message);
    }
  });
}

function removerArquivosEnviados(files) {
  for (const file of files || []) {
    removerArquivoFisico(path.relative(__dirname, file.path));
  }
}

function getArquivoAnotacaoPath(arquivoPath) {
  const fullPath = path.resolve(__dirname, arquivoPath);
  const basePath = path.resolve(ANOTACOES_UPLOAD_DIR);

  if (fullPath !== basePath && !fullPath.startsWith(basePath + path.sep)) {
    throw new Error('Caminho de arquivo invalido.');
  }

  return fullPath;
}

function formatarArquivoAnotacao(row) {
  return {
    id: row.id,
    anotacao_id: row.anotacao_id,
    nome_original: row.nome_original,
    mime_type: row.mime_type,
    tamanho: row.tamanho,
    uploaded_by: row.uploaded_by,
    uploaded_by_nome: row.uploaded_by_nome,
    created_at: row.created_at
  };
}

async function listarArquivosAnotacoes(anotacaoIds) {
  if (!anotacaoIds.length) return new Map();

  const [rows] = await pool.query(
    `SELECT
       aa.id,
       aa.anotacao_id,
       aa.nome_original,
       aa.mime_type,
       aa.tamanho,
       aa.uploaded_by,
       aa.created_at,
       p.nome_completo AS uploaded_by_nome
     FROM anotacao_arquivos aa
     LEFT JOIN perfis p ON p.id = aa.uploaded_by
     WHERE aa.anotacao_id IN (?)
     ORDER BY aa.created_at DESC, aa.id DESC`,
    [anotacaoIds]
  );

  const map = new Map();

  for (const row of rows) {
    if (!map.has(row.anotacao_id)) map.set(row.anotacao_id, []);
    map.get(row.anotacao_id).push(formatarArquivoAnotacao(row));
  }

  return map;
}

async function inserirArquivosAnotacao(conn, anotacaoId, usuarioId, files) {
  const arquivos = files || [];
  if (!arquivos.length) return;

  for (const file of arquivos) {
    if (!validarAssinaturaArquivo(file)) {
      throw new Error('Arquivo invalido ou com conteudo nao permitido.');
    }
  }

  const valores = arquivos.map(file => [
    anotacaoId,
    path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_'),
    path.relative(__dirname, file.path),
    file.mimetype,
    file.size,
    usuarioId
  ]);

  await conn.query(
    `INSERT INTO anotacao_arquivos
       (anotacao_id, nome_original, arquivo_path, mime_type, tamanho, uploaded_by)
     VALUES ?`,
    [valores]
  );
}

/**
 * GET /api/chamados
 * - Técnico/Admin: vê todos (com nome do solicitante)
 * - Funcionário: vê apenas os seus
 * - Filtro por ?status=aberto|em_andamento|pendente|resolvido|fechado
 */
app.get('/api/chamados', autenticarToken, async (req, res) => {
  const usuario = req.usuario;
  const { status } = req.query;

  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 20);
  const offset = (page - 1) * limit;

  try {
    const params = [];
    let sql = `
      SELECT SQL_CALC_FOUND_ROWS
        c.*,
        COALESCE(p.nome_completo, c.solicitante_nome_manual) AS solicitante_nome,
        ${SLA_SELECT}
      FROM chamados c
      LEFT JOIN perfis p ON c.criado_por_id = p.id
    `;

    const conditions = [];

    if (!(usuario.nivel === 'tecnico' || usuario.nivel === 'admin')) {
      conditions.push('c.criado_por_id = ?');
      params.push(usuario.id);
    }

    if (status) {
      conditions.push('c.status = ?');
      params.push(status);
    }

    if (conditions.length) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY c.criado_em DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await pool.query(sql, params);
    const [[{ 'FOUND_ROWS()': total }]] = await pool.query('SELECT FOUND_ROWS()');

    res.json({
      data: rows,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao buscar chamados' });
  }
});

app.get('/api/avisos-publicos', async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT id, titulo, mensagem, tipo FROM avisos WHERE ativo = 1 ORDER BY criado_em DESC"
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao buscar avisos.' });
  }
});


/**
 * GET /api/chamado/:id
 * - Funcionário só pode ver se for o criador
 * - Técnico/Admin podem ver qualquer um
 * - Traz nomes de solicitante e técnico atribuído
 */
app.get('/api/chamado/:id', autenticarToken, async (req, res) => {
  const chamadoId = req.params.id;
  const usuario = req.usuario;

  try {
    const sql = `
      SELECT 
        c.*,
        ${SLA_SELECT},
        COALESCE(p_solicitante.nome_completo, c.solicitante_nome_manual) AS solicitante_nome,
        COALESCE(p_solicitante.setor_texto, c.solicitante_setor_manual) AS solicitante_setor,
        p_solicitante.cargo_texto AS solicitante_cargo,
        p_tecnico.nome_completo AS tecnico_atribuido_nome,
        p_registrador.nome_completo AS registrado_por_nome
      FROM chamados c
      LEFT JOIN perfis p_solicitante ON c.criado_por_id = p_solicitante.id
      LEFT JOIN perfis p_tecnico ON c.atribuido_para_id = p_tecnico.id
      LEFT JOIN perfis p_registrador ON c.registrado_por_id = p_registrador.id
      WHERE c.id = ?
    `;
    const [rows] = await pool.query(sql, [chamadoId]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'Chamado não encontrado.' });
    }

    const chamado = rows[0];

    if (usuario.nivel === 'funcionario' && chamado.criado_por_id !== usuario.id) {
      return res.status(403).json({ message: 'Acesso negado: este chamado não pertence a você.' });
    }

    const [anexos] = await pool.query(
      `SELECT id, arquivo_url, nome_original, mime_type, criado_em
       FROM chamado_anexos
       WHERE chamado_id = ?
       ORDER BY id ASC`,
      [chamadoId]
    );

    chamado.anexos = anexos;

    res.json(chamado);
  } catch (err) {
    console.error('Erro ao buscar detalhe do chamado:', err);
    res.status(500).json({ message: 'Erro ao buscar dados' });
  }
});

/**
 * GET /api/tecnicos
 * - Apenas técnicos/admin
 */
app.get('/api/tecnicos', autenticarToken, apenasTecnicos, async (req, res) => {
  try {
    const sql = "SELECT id, nome_completo FROM perfis WHERE nivel IN ('tecnico','admin') ORDER BY nome_completo";
    const [rows] = await pool.query(sql);
    res.json(rows);
  } catch (err) {
    console.error('Erro ao buscar técnicos:', err);
    res.status(500).json({ message: 'Erro ao buscar dados' });
  }
});

/**
 * POST /api/chamado
 * - Cria chamado (funcionário)
 * - Notifica técnicos (socket: 'novo-chamado')
 */
app.post('/api/chamado', autenticarToken, uploadChamadoAnexos, async (req, res) => {
  let conn;

  try {
    const { titulo, descricao, tipo, categoria } = req.body; // ADICIONADOS tipo e categoria
    const criado_por_id = req.usuario.id;
    
    // Validações
    if (!titulo || !descricao || !tipo || !categoria) {
      return res.status(400).json({ message: 'Todos os campos obrigatórios devem ser preenchidos.' });
    }
    
    // Valida o tipo
    if (!['incidente', 'solicitacao'].includes(tipo)) {
      return res.status(400).json({ message: 'Tipo inválido. Use "incidente" ou "solicitacao".' });
    }
    
    let anexo_url = null;

    if (req.file) {
      const baseUrl = `${req.protocol}://${req.get('host')}`;
      anexo_url = `${baseUrl}/uploads/${req.file.filename}`;
    }

    const prioridade = classificarPrioridadeChamado({ titulo, descricao, tipo, categoria });

    const arquivos = getUploadedImages(req);

    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [result] = await conn.query(
      `INSERT INTO chamados (titulo, descricao, tipo, categoria, prioridade, criado_por_id, anexo_url)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [titulo, descricao, tipo, categoria, prioridade, criado_por_id, null]
    );

    const anexoUrlPrincipal = await inserirAnexosChamado(conn, req, result.insertId, arquivos);

    if (anexoUrlPrincipal) {
      await conn.query('UPDATE chamados SET anexo_url = ? WHERE id = ?', [anexoUrlPrincipal, result.insertId]);
    }

    await conn.commit();
    
    const [novoChamadoRows] = await pool.query('SELECT * FROM chamados WHERE id = ?', [result.insertId]);
    const novoChamado = novoChamadoRows[0];

    // Notifica técnicos
    await enviarParaTecnicos('novo-chamado', {
      chamadoId: novoChamado.id,
      titulo: novoChamado.titulo,
      tipo: novoChamado.tipo,
      categoria: novoChamado.categoria,
      criado_por_id,
      criado_em: novoChamado.criado_em,
      status: novoChamado.status
    });

    res.status(201).json(novoChamado);
  } catch (err) {
    if (conn) await conn.rollback();
    console.error('Erro ao criar chamado:', err);

    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'Um dos anexos excede o tamanho mÃ¡ximo de 5 MB.' });
      }

      return res.status(400).json({ message: 'Erro ao processar os anexos enviados.' });
    }

    if (err?.message === 'Tipo de arquivo nÃ£o permitido.') {
      return res.status(400).json({ message: 'Formato de anexo invÃ¡lido. Envie imagens JPG, PNG, WEBP ou GIF.' });
    }

    res.status(500).json({ message: 'Erro ao salvar dados' });
  } finally {
    if (conn) conn.release();
  }
});

app.post('/api/chamados/por-usuario', autenticarToken, apenasTecnicos, uploadChamadoAnexos, async (req, res) => {
  let conn;

  try {
    const {
      titulo,
      descricao,
      tipo,
      categoria,
      solicitanteTipo,
      solicitanteId,
      solicitanteNomeManual,
      solicitanteContatoManual,
      solicitanteSetorManual,
      origemSolicitacao,
      observacaoInterna
    } = req.body;

    const tecnicoId = req.usuario.id;
    const origemValida = ['telefone', 'presencial', 'whatsapp', 'email', 'outro'];
    const origem = origemValida.includes(origemSolicitacao) ? origemSolicitacao : 'outro';
    const abrirParaUsuarioCadastrado = solicitanteTipo === 'cadastrado';

    if (!titulo || !descricao || !tipo || !categoria) {
      return res.status(400).json({ message: 'Todos os campos obrigatórios devem ser preenchidos.' });
    }

    if (!['incidente', 'solicitacao'].includes(tipo)) {
      return res.status(400).json({ message: 'Tipo inválido. Use "incidente" ou "solicitacao".' });
    }

    if (abrirParaUsuarioCadastrado && !solicitanteId) {
      return res.status(400).json({ message: 'Selecione o usuário solicitante.' });
    }

    if (!abrirParaUsuarioCadastrado && !solicitanteNomeManual?.trim()) {
      return res.status(400).json({ message: 'Informe o nome do solicitante.' });
    }

    let criadoPorId = null;
    if (abrirParaUsuarioCadastrado) {
      const [[solicitante]] = await pool.query('SELECT id FROM perfis WHERE id = ? LIMIT 1', [solicitanteId]);
      if (!solicitante) {
        return res.status(404).json({ message: 'Usuário solicitante não encontrado.' });
      }
      criadoPorId = Number(solicitanteId);
    }

    

    const prioridade = classificarPrioridadeChamado({ titulo, descricao, tipo, categoria });

    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [result] = await conn.query(
      `INSERT INTO chamados (
        titulo,
        descricao,
        tipo,
        categoria,
        prioridade,
        status,
        criado_por_id,
        atribuido_para_id,
        registrado_por_id,
        solicitante_nome_manual,
        solicitante_contato_manual,
        solicitante_setor_manual,
        origem_solicitacao,
        observacao_interna,
        anexo_url
      ) VALUES (?, ?, ?, ?, ?, 'em_andamento', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        titulo,
        descricao,
        tipo,
        categoria,
        prioridade,
        criadoPorId,
        tecnicoId,
        tecnicoId,
        abrirParaUsuarioCadastrado ? null : solicitanteNomeManual.trim(),
        abrirParaUsuarioCadastrado ? null : solicitanteContatoManual?.trim() || null,
        abrirParaUsuarioCadastrado ? null : solicitanteSetorManual?.trim() || null,
        origem,
        observacaoInterna?.trim() || null,
        null
      ]
    );

    const anexoUrlPrincipal = await inserirAnexosChamado(conn, req, result.insertId, arquivos);

    if (anexoUrlPrincipal) {
      await conn.query('UPDATE chamados SET anexo_url = ? WHERE id = ?', [anexoUrlPrincipal, result.insertId]);
    }

    await conn.commit();

    const [novoChamadoRows] = await pool.query('SELECT * FROM chamados WHERE id = ?', [result.insertId]);
    const novoChamado = novoChamadoRows[0];

    if (criadoPorId) {
      enviarParaUsuario(criadoPorId, 'chamado-atribuido', {
        chamadoId: novoChamado.id,
        tipo: 'registrado_por_tecnico',
        mensagem: `Seu chamado foi registrado pelo técnico ${req.usuario.nome_completo || 'Técnico'}`,
        tecnicoNome: req.usuario.nome_completo
      });
    }

    res.status(201).json(novoChamado);
  } catch (err) {
    if (conn) await conn.rollback();
    console.error('Erro ao criar chamado por usuário:', err);

    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'Um dos anexos excede o tamanho máximo de 5 MB.' });
      }

      return res.status(400).json({ message: 'Erro ao processar os anexos enviados.' });
    }

    if (err?.message === 'Tipo de arquivo nÃƒÂ£o permitido.') {
      return res.status(400).json({ message: 'Formato de anexo inválido. Envie imagens JPG, PNG, WEBP ou GIF.' });
    }

    res.status(500).json({ message: 'Erro ao salvar chamado por usuário' });
  } finally {
    if (conn) conn.release();
  }
});

app.post('/api/admin/avisos', autenticarToken, async (req, res) => {
  try {
    if (!['tecnico','admin'].includes(req.usuario.nivel)) {
      return res.status(403).json({ message: 'Acesso negado.' });
    }

    const { titulo, mensagem, tipo } = req.body;

    if (!titulo || !mensagem) {
      return res.status(400).json({ message: 'Título e mensagem são obrigatórios.' });
    }

    await pool.query(
      'INSERT INTO avisos (titulo, mensagem, tipo) VALUES (?, ?, ?)',
      [titulo, mensagem, tipo || 'info']
    );

    res.status(201).json({ message: 'Aviso criado com sucesso.' });
  } catch (err) {
    console.error("Erro ao criar aviso:", err);
    res.status(500).json({ message: 'Erro interno ao salvar o aviso.' });
  }
});


/**
 * PUT /api/chamados/:id/atribuir
 * - Técnico/Admin
 * - Atribui, muda status para em_andamento
 * - Notifica técnico e funcionário
 */
app.put('/api/chamados/:id/atribuir', autenticarToken, apenasTecnicos, async (req, res) => {
  const chamadoId = req.params.id;
  const { tecnicoId } = req.body;

  if (!tecnicoId) {
    return res.status(400).json({ message: 'ID do técnico é obrigatório.' });
  }

  try {
    await pool.query(
      `UPDATE chamados SET atribuido_para_id = ?, status = 'em_andamento' WHERE id = ?`,
      [tecnicoId, chamadoId]
    );

    // pega criador e nome do técnico
    const [[ch]] = await pool.query(
      `SELECT c.criado_por_id, p.nome_completo AS tecnico_nome
       FROM chamados c
       JOIN perfis p ON p.id = ?
       WHERE c.id = ?`,
      [tecnicoId, chamadoId]
    );
    const tecnicoNome = ch?.tecnico_nome || 'Técnico';
    const criadorId = ch?.criado_por_id;

    // notifica técnico
    enviarParaUsuario(tecnicoId, 'chamado-atribuido', {
      chamadoId: Number(chamadoId),
      tipo: 'atribuido',
      mensagem: `Você recebeu um novo chamado`,
      tecnicoNome
    });

    // notifica criador
    if (criadorId) {
      enviarParaUsuario(criadorId, 'chamado-atribuido', {
        chamadoId: Number(chamadoId),
        tipo: 'atribuido',
        mensagem: `Seu chamado foi atribuído ao técnico ${tecnicoNome}`,
        tecnicoNome
      });
    }

    res.json({ message: 'Chamado atribuído com sucesso!' });
  } catch (err) {
    console.error('Erro ao atribuir chamado:', err);
    res.status(500).json({ message: 'Erro ao salvar dados' });
  }
});

app.put('/api/admin/avisos/:id', autenticarToken, async (req, res) => {

  if (!['tecnico','admin'].includes(req.usuario.nivel)) {
    return res.status(403).json({ message: 'Acesso negado.' });
  }

  const { titulo, mensagem, tipo } = req.body;

  await pool.query(
    'UPDATE avisos SET titulo=?, mensagem=?, tipo=? WHERE id=?',
    [titulo, mensagem, tipo, req.params.id]
  );

  res.json({ message: 'Aviso atualizado.' });
});


/**
 * PUT /api/chamados/:id/status
 * - Técnico/Admin
 * - Notifica criador e técnico
 */
app.put('/api/chamados/:id/status', autenticarToken, apenasTecnicos, async (req, res) => {
  const chamadoId = req.params.id;
  const { novoStatus } = req.body;

  try {
    await pool.query('UPDATE chamados SET status = ? WHERE id = ?', [novoStatus, chamadoId]);

    const [[row]] = await pool.query(
      'SELECT criado_por_id, atribuido_para_id FROM chamados WHERE id = ?',
      [chamadoId]
    );

    const payload = { chamadoId: Number(chamadoId), status: String(novoStatus) };
    if (row?.criado_por_id) enviarParaUsuario(row.criado_por_id, 'status-alterado', payload);
    if (row?.atribuido_para_id) enviarParaUsuario(row.atribuido_para_id, 'status-alterado', payload);

    res.json({ message: 'Status atualizado com sucesso!' });
  } catch (err) {
    console.error('Erro ao mudar status:', err);
    res.status(500).json({ message: 'Erro ao salvar dados' });
  }
});

/**
 * PUT /api/chamados/:id/prioridade
 * - Técnico/Admin
 */
app.put('/api/chamados/:id/prioridade', autenticarToken, apenasTecnicos, async (req, res) => {
  const chamadoId = req.params.id;
  const { prioridade } = req.body;
  const validas = ['baixa', 'media', 'alta', 'urgente'];
  if (!validas.includes(prioridade)) return res.status(400).json({ message: 'Prioridade inválida.' });
  try {
    await pool.query('UPDATE chamados SET prioridade = ? WHERE id = ?', [prioridade, chamadoId]);
    res.json({ message: 'Prioridade alterada!', prioridade });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao alterar prioridade' });
  }
});

app.delete('/api/admin/avisos/:id', autenticarToken, async (req, res) => {
  if (!['tecnico','admin'].includes(req.usuario.nivel)) {
    return res.status(403).json({ message: 'Acesso negado.' });
  }

  await pool.query('DELETE FROM avisos WHERE id = ?', [req.params.id]);
  res.json({ message: 'Aviso removido.' });
});

app.get('/api/admin/avisos', autenticarToken, async (req, res) => {
  if (!['tecnico','admin'].includes(req.usuario.nivel)) {
    return res.status(403).json({ message: 'Acesso negado.' });
  }

  try {
    const [rows] = await pool.query(`
      SELECT *
      FROM avisos
      ORDER BY criado_em DESC
    `);

    res.json(rows);
  } catch (err) {
    console.error('Erro ao buscar avisos admin:', err);
    res.status(500).json({ message: 'Erro ao buscar avisos.' });
  }
});

app.get('/api/admin/anotacoes-tecnicas', autenticarToken, apenasTecnicos, async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT
        a.id,
        a.titulo,
        a.conteudo,
        a.criado_em,
        a.atualizado_em,
        a.criado_por_id,
        a.atualizado_por_id,
        p_criador.nome_completo AS criado_por_nome,
        p_editor.nome_completo AS atualizado_por_nome
      FROM anotacoes_tecnicas a
      JOIN perfis p_criador ON p_criador.id = a.criado_por_id
      LEFT JOIN perfis p_editor ON p_editor.id = a.atualizado_por_id
      ORDER BY a.atualizado_em DESC, a.criado_em DESC
    `);

    const arquivosPorAnotacao = await listarArquivosAnotacoes(rows.map(row => row.id));

    const anotacoes = rows.map(row => ({
      ...row,
      conteudo: descriptografarAnotacao(row.conteudo),
      arquivos: arquivosPorAnotacao.get(row.id) || []
    }));

    res.json(anotacoes);
  } catch (err) {
    console.error('Erro ao buscar anotacoes tecnicas:', err);
    res.status(500).json({ message: 'Erro ao buscar anotacoes tecnicas.' });
  }
});

app.post('/api/admin/anotacoes-tecnicas', autenticarToken, apenasTecnicos, processarUploadAnotacaoArquivos, async (req, res) => {
  const { titulo, conteudo } = req.body;
  let conn;

  if (!titulo?.trim() || !conteudo?.trim()) {
    removerArquivosEnviados(req.files);
    return res.status(400).json({ message: 'Titulo e conteudo sao obrigatorios.' });
  }

  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [result] = await conn.query(
      `INSERT INTO anotacoes_tecnicas (titulo, conteudo, criado_por_id, atualizado_por_id)
       VALUES (?, ?, ?, ?)`,
      [
        titulo.trim(),
        criptografarAnotacao(conteudo.trim()),
        req.usuario.id,
        req.usuario.id
      ]
    );

    await registrarAuditoriaAnotacao(conn, result.insertId, req.usuario.id, 'criou');
    await inserirArquivosAnotacao(conn, result.insertId, req.usuario.id, req.files);
    await conn.commit();

    res.status(201).json({ message: 'Anotacao criada com sucesso.', id: result.insertId });
  } catch (err) {
    if (conn) await conn.rollback();
    removerArquivosEnviados(req.files);
    console.error('Erro ao criar anotacao tecnica:', err);
    const status = err?.message?.startsWith('Arquivo') ? 400 : 500;
    res.status(status).json({ message: err?.message || 'Erro ao criar anotacao tecnica.' });
  } finally {
    if (conn) conn.release();
  }
});

app.put('/api/admin/anotacoes-tecnicas/:id', autenticarToken, apenasTecnicos, processarUploadAnotacaoArquivos, async (req, res) => {
  const anotacaoId = Number(req.params.id);
  const { titulo, conteudo } = req.body;
  let conn;

  if (!Number.isInteger(anotacaoId) || anotacaoId <= 0) {
    removerArquivosEnviados(req.files);
    return res.status(400).json({ message: 'Anotacao invalida.' });
  }

  if (!titulo?.trim() || !conteudo?.trim()) {
    removerArquivosEnviados(req.files);
    return res.status(400).json({ message: 'Titulo e conteudo sao obrigatorios.' });
  }

  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [result] = await conn.query(
      `UPDATE anotacoes_tecnicas
       SET titulo = ?, conteudo = ?, atualizado_por_id = ?, atualizado_em = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        titulo.trim(),
        criptografarAnotacao(conteudo.trim()),
        req.usuario.id,
        anotacaoId
      ]
    );

    if (result.affectedRows === 0) {
      await conn.rollback();
      removerArquivosEnviados(req.files);
      return res.status(404).json({ message: 'Anotacao nao encontrada.' });
    }

    await registrarAuditoriaAnotacao(conn, anotacaoId, req.usuario.id, 'editou');
    await inserirArquivosAnotacao(conn, anotacaoId, req.usuario.id, req.files);
    await conn.commit();

    res.json({ message: 'Anotacao atualizada com sucesso.' });
  } catch (err) {
    if (conn) await conn.rollback();
    removerArquivosEnviados(req.files);
    console.error('Erro ao atualizar anotacao tecnica:', err);
    const status = err?.message?.startsWith('Arquivo') ? 400 : 500;
    res.status(status).json({ message: err?.message || 'Erro ao atualizar anotacao tecnica.' });
  } finally {
    if (conn) conn.release();
  }
});

app.get('/api/admin/anotacoes-tecnicas/:id/arquivos/:arquivoId/download', autenticarToken, apenasTecnicos, async (req, res) => {
  const anotacaoId = Number(req.params.id);
  const arquivoId = Number(req.params.arquivoId);

  if (!Number.isInteger(anotacaoId) || anotacaoId <= 0 || !Number.isInteger(arquivoId) || arquivoId <= 0) {
    return res.status(400).json({ message: 'Arquivo invalido.' });
  }

  try {
    const [[arquivo]] = await pool.query(
      `SELECT id, anotacao_id, nome_original, arquivo_path
       FROM anotacao_arquivos
       WHERE id = ? AND anotacao_id = ?`,
      [arquivoId, anotacaoId]
    );

    if (!arquivo) {
      return res.status(404).json({ message: 'Arquivo nao encontrado.' });
    }

    const fullPath = getArquivoAnotacaoPath(arquivo.arquivo_path);

    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ message: 'Arquivo fisico nao encontrado.' });
    }

    res.download(fullPath, arquivo.nome_original);
  } catch (err) {
    console.error('Erro ao baixar arquivo de anotacao:', err);
    res.status(500).json({ message: 'Erro ao baixar arquivo.' });
  }
});

app.delete('/api/admin/anotacoes-tecnicas/:id/arquivos/:arquivoId', autenticarToken, apenasTecnicos, async (req, res) => {
  const anotacaoId = Number(req.params.id);
  const arquivoId = Number(req.params.arquivoId);
  let conn;
  let arquivoPath = null;

  if (!Number.isInteger(anotacaoId) || anotacaoId <= 0 || !Number.isInteger(arquivoId) || arquivoId <= 0) {
    return res.status(400).json({ message: 'Arquivo invalido.' });
  }

  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [[arquivo]] = await conn.query(
      `SELECT id, arquivo_path
       FROM anotacao_arquivos
       WHERE id = ? AND anotacao_id = ?`,
      [arquivoId, anotacaoId]
    );

    if (!arquivo) {
      await conn.rollback();
      return res.status(404).json({ message: 'Arquivo nao encontrado.' });
    }

    arquivoPath = arquivo.arquivo_path;

    await conn.query(
      'DELETE FROM anotacao_arquivos WHERE id = ? AND anotacao_id = ?',
      [arquivoId, anotacaoId]
    );

    await conn.commit();
    removerArquivoFisico(arquivoPath);

    res.json({ message: 'Arquivo removido com sucesso.' });
  } catch (err) {
    if (conn) await conn.rollback();
    console.error('Erro ao remover arquivo de anotacao:', err);
    res.status(500).json({ message: 'Erro ao remover arquivo.' });
  } finally {
    if (conn) conn.release();
  }
});

app.delete('/api/admin/anotacoes-tecnicas/:id', autenticarToken, apenasTecnicos, async (req, res) => {
  const anotacaoId = Number(req.params.id);
  let conn;
  let arquivosRemover = [];

  if (!Number.isInteger(anotacaoId) || anotacaoId <= 0) {
    return res.status(400).json({ message: 'Anotacao invalida.' });
  }

  try {
    conn = await pool.getConnection();
    await conn.beginTransaction();

    const [[anotacao]] = await conn.query(
      'SELECT id FROM anotacoes_tecnicas WHERE id = ?',
      [anotacaoId]
    );

    if (!anotacao) {
      await conn.rollback();
      return res.status(404).json({ message: 'Anotacao nao encontrada.' });
    }

    const [arquivos] = await conn.query(
      'SELECT arquivo_path FROM anotacao_arquivos WHERE anotacao_id = ?',
      [anotacaoId]
    );
    arquivosRemover = arquivos.map(a => a.arquivo_path);

    await registrarAuditoriaAnotacao(conn, anotacaoId, req.usuario.id, 'excluiu');
    await conn.query('DELETE FROM anotacoes_tecnicas WHERE id = ?', [anotacaoId]);
    await conn.commit();

    arquivosRemover.forEach(removerArquivoFisico);

    res.json({ message: 'Anotacao removida com sucesso.' });
  } catch (err) {
    if (conn) await conn.rollback();
    console.error('Erro ao remover anotacao tecnica:', err);
    res.status(500).json({ message: 'Erro ao remover anotacao tecnica.' });
  } finally {
    if (conn) conn.release();
  }
});

app.get('/api/dashboard/total-relatorios', autenticarToken, apenasTecnicos, async (req, res) => {
  const { mes, ano } = req.query;

  let where = '1=1';
  const params = [];

  if (mes) {
    where += ' AND MONTH(r.criado_em) = ?';
    params.push(mes);
  }

  if (ano) {
    where += ' AND YEAR(r.criado_em) = ?';
    params.push(ano);
  }

  const [[row]] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM relatorios_chamado r
     WHERE ${where}`,
    params
  );

  res.json({ total: row.total });
});


// CHAMADOS POR CATEGORIA
app.get('/api/dashboard/chamados-por-categoria', autenticarToken, apenasTecnicos, async (req, res) => {
  const { mes, ano } = req.query;

  let where = '1=1';
  const params = [];

  if (mes) {
    where += ' AND MONTH(c.criado_em) = ?';
    params.push(mes);
  }

  if (ano) {
    where += ' AND YEAR(c.criado_em) = ?';
    params.push(ano);
  }

  const [rows] = await pool.query(
    `SELECT c.categoria, COUNT(*) AS total
     FROM chamados c
     WHERE ${where}
     GROUP BY c.categoria`,
    params
  );

  res.json(rows);
});


// CHAMADOS POR STATUS
app.get('/api/dashboard/chamados-por-status', autenticarToken, apenasTecnicos, async (req, res) => {
  const { mes, ano } = req.query;

  let where = '1=1';
  const params = [];

  if (mes) {
    where += ' AND MONTH(c.criado_em) = ?';
    params.push(mes);
  }

  if (ano) {
    where += ' AND YEAR(c.criado_em) = ?';
    params.push(ano);
  }

  const [rows] = await pool.query(
    `SELECT c.status, COUNT(*) AS total
     FROM chamados c
     WHERE ${where}
     GROUP BY c.status`,
    params
  );

  res.json(rows);
});


// LISTAR RELATÓRIOS
app.get('/api/dashboard/relatorios', autenticarToken, apenasTecnicos, async (req, res) => {
  const { mes, ano } = req.query;

  let where = '1=1';
  const params = [];

  if (mes) {
    where += ' AND MONTH(r.criado_em) = ?';
    params.push(mes);
  }

  if (ano) {
    where += ' AND YEAR(r.criado_em) = ?';
    params.push(ano);
  }

  const [rows] = await pool.query(
    `SELECT 
       r.id,
       r.titulo,
       r.relatorio,
       r.criado_em,
       c.titulo AS chamado_titulo
     FROM relatorios_chamado r
     JOIN chamados c ON c.id = r.chamado_id
     WHERE ${where}
     ORDER BY r.criado_em DESC`,
    params
  );

  res.json(rows);
});


// ======================== RELATÓRIOS (técnico) =============

/**
 * GET /api/chamados/:id/relatorio
 * - Técnico/Admin
 * - Retorna último relatório (se existir)
 */
app.get('/api/chamados/:id/relatorio', autenticarToken, apenasTecnicos, async (req, res) => {
  const chamadoId = req.params.id;

  try {
    const sql = `
      SELECT r.id, r.titulo, r.relatorio, r.criado_em,
             p.nome_completo AS tecnico_nome
      FROM relatorios_chamado r
      LEFT JOIN perfis p ON p.id = r.tecnico_id
      WHERE r.chamado_id = ?
      ORDER BY r.criado_em DESC
      LIMIT 1
    `;
    const [rows] = await pool.query(sql, [chamadoId]);
    res.json(rows[0] || null);
  } catch (err) {
    console.error('Erro ao buscar relatório:', err);
    res.status(500).json({ message: 'Erro ao buscar relatório' });
  }
});

/**
 * POST /api/chamados/:id/relatorio
 * - Técnico/Admin
 * - Só permite se chamado estiver "fechado"
 * - Um relatório por chamado
 */
app.post('/api/chamados/:id/relatorio', autenticarToken, apenasTecnicos, async (req, res) => {
  const chamadoId = Number(req.params.id);
  const tecnicoId = req.usuario.id;
  const { titulo, relatorio } = req.body;

  if (!titulo?.trim() || !relatorio?.trim()) {
    return res.status(400).json({ message: 'Título e relatório são obrigatórios.' });
  }

  try {
    const [[ch]] = await pool.query('SELECT status FROM chamados WHERE id = ?', [chamadoId]);
    if (!ch) return res.status(404).json({ message: 'Chamado não encontrado.' });
    if (ch.status !== 'fechado') {
      return res.status(400).json({ message: 'Só é possível registrar relatório com o chamado fechado.' });
    }

    const [exist] = await pool.query('SELECT id FROM relatorios_chamado WHERE chamado_id = ? LIMIT 1', [chamadoId]);
    if (exist.length) {
      return res.status(409).json({ message: 'Este chamado já possui relatório final.' });
    }

    await pool.query(
      `INSERT INTO relatorios_chamado (chamado_id, tecnico_id, titulo, relatorio)
       VALUES (?, ?, ?, ?)`,
      [chamadoId, tecnicoId, titulo.trim(), relatorio.trim()]
    );

    const [out] = await pool.query(
      `SELECT r.id, r.titulo, r.relatorio, r.criado_em, p.nome_completo AS tecnico_nome
       FROM relatorios_chamado r
       LEFT JOIN perfis p ON p.id = r.tecnico_id
       WHERE r.chamado_id = ?
       ORDER BY r.criado_em DESC
       LIMIT 1`,
      [chamadoId]
    );

    res.status(201).json(out[0]);
  } catch (err) {
    console.error('Erro ao salvar relatório:', err);
    res.status(500).json({ message: 'Erro ao salvar relatório' });
  }
});

// ======================== AUTH ============================

/**
 * POST /api/register
 */
app.post('/api/register', async (req, res) => {
  const { email, pass, nomeCompleto, setor, cargo } = req.body

  if (!email || !pass || !nomeCompleto || !setor || !cargo) {
    return res.status(400).json({ message: 'Todos os campos são obrigatórios.' })
  }

  const senhaRegex = /^(?=.*[!@#$%^&*()_\-+=\[{\]};:'",.<>\/?]).{8,32}$/
  if (!senhaRegex.test(pass)) {
    return res.status(400).json({
      message: 'A senha deve ter entre 8 e 32 caracteres e conter ao menos um caractere especial.'
    })
  }

  const connection = await pool.getConnection()

  try {
    await connection.beginTransaction()

    const salt = await bcrypt.genSalt(10)
    const senhaHash = await bcrypt.hash(pass, salt)

    const [userResult] = await connection.query(
      'INSERT INTO usuarios (email, senha_hash) VALUES (?, ?)',
      [email, senhaHash]
    )

    const novoUsuarioId = userResult.insertId

    await connection.query(
      'INSERT INTO perfis (id, nome_completo, setor_texto, cargo_texto) VALUES (?, ?, ?, ?)',
      [novoUsuarioId, nomeCompleto, setor, cargo]
    )

    await connection.commit()

    res.status(201).json({
      message: 'Usuário criado com sucesso!',
      userId: novoUsuarioId
    })
  } catch (err) {
    await connection.rollback()
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Este email já está cadastrado.' })
    }
    res.status(500).json({ message: 'Erro interno no servidor.' })
  } finally {
    connection.release()
  }
});

/**
 * POST /api/login
 * - Retorna JWT com perfil e nome_completo
 */
app.post('/api/login', async (req, res) => {
  const { email, pass } = req.body;
  if (!email || !pass) {
    return res.status(400).json({ message: 'Email e senha são obrigatórios.' });
  }

  try {
    const [rows] = await pool.query(
      `SELECT 
         u.id, u.email, u.senha_hash, 
         p.nome_completo, p.nivel, p.setor_texto, p.cargo_texto 
       FROM usuarios u
       JOIN perfis p ON u.id = p.id
       WHERE u.email = ?`,
      [email]
    );

    if (!rows.length) {
      return res.status(401).json({ message: 'Email ou senha inválidos.' });
    }

    const usuario = rows[0];
    const senhaCorreta = await bcrypt.compare(pass, usuario.senha_hash);
    if (!senhaCorreta) {
      return res.status(401).json({ message: 'Email ou senha inválidos.' });
    }

    const payload = {
      id: usuario.id,
      email: usuario.email,
      nome_completo: usuario.nome_completo,
      nivel: usuario.nivel,
      setor: usuario.setor_texto,
      cargo: usuario.cargo_texto
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    res.json({ message: 'Login bem-sucedido!', token });
  } catch (err) {
    console.error('Erro no login:', err);
    res.status(500).json({ message: 'Erro interno no servidor.' });
  }
});

app.post('/api/esqueci-senha', async (req, res) => {

  const { email } = req.body;

  if (!email) {
    return res.status(400).json({
      message: 'Email obrigatório.'
    });
  }

  try {

    const [rows] = await pool.query(
      'SELECT * FROM usuarios WHERE email = ?',
      [email]
    );

    if (!rows.length) {

      return res.json({
        message:
          'Se o email existir, enviaremos um link.'
      });
    }

    const usuario = rows[0];

    const token = crypto
      .randomBytes(32)
      .toString('hex');

    const expire = new Date(
      Date.now() + 1000 * 60 * 15
    );

    await pool.query(
      `UPDATE usuarios
       SET reset_token = ?,
           reset_token_expire = ?
       WHERE id = ?`,
      [token, expire, usuario.id]
    );

    const link =
      `http://191.242.225.226:300/reset-password/${token}`;

    console.log('LINK RESET:', link);

    const info = await transporter.sendMail({ from: '"TI Desk" <suporte.ti@urbes.com.br>', to: email, subject: 'Recuperação de senha', html: ` <h1>Teste</h1> ` }); console.log(info);

    res.json({
      message:
        'Se o email existir, enviaremos um link.'
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      message:
        'Erro interno ao enviar email.'
    });
  }
});

app.post('/api/resetar-senha/:token', async (req, res) => { const { token } = req.params; const { password } = req.body; if (!password) { return res.status(400).json({ message: 'Senha obrigatória.' }); } try { const [rows] = await pool.query( `SELECT * FROM usuarios WHERE reset_token = ? AND reset_token_expire > NOW()`, [token] ); if (!rows.length) { return res.status(400).json({ message: 'Token inválido ou expirado.' }); } const usuario = rows[0]; const senhaHash = await bcrypt.hash(password, 10); await pool.query( `UPDATE usuarios SET senha_hash = ?, reset_token = NULL, reset_token_expire = NULL WHERE id = ?`, [senhaHash, usuario.id] ); res.json({ message: 'Senha alterada com sucesso.' }); } catch (err) { console.error(err); res.status(500).json({ message: 'Erro ao resetar senha.' }); } });

//sistema de estoque 

app.get('/api/estoque/itens', autenticarToken, apenasTecnicos, async (req, res) => {
  try {
    const [rows] = await pool.query( // <-- troquei db.execute por pool.query
      'SELECT * FROM itens_estoque WHERE ativo = 1 ORDER BY nome'
    );
    res.json(rows);
  } catch (err) {
    console.error('Erro ao listar itens de estoque:', err);
    res.status(500).json({ mensagem: 'Erro ao listar estoque.' });
  }
});

// POST /api/estoque/itens
app.post('/api/estoque/itens', autenticarToken, apenasTecnicos, async (req, res) => {
  const { nome, categoria, descricao, quantidade_inicial = 0, quantidade_minima = 0, localizacao } = req.body;

  if (!nome) {
    return res.status(400).json({ mensagem: 'Nome do item é obrigatório.' });
  }

  try {
    const [result] = await pool.query( // <-- troquei db.execute por pool.query
      `INSERT INTO itens_estoque (nome, categoria, descricao, quantidade_atual, quantidade_minima, localizacao)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [nome, categoria, descricao, quantidade_inicial, quantidade_minima, localizacao]
    );

    res.status(201).json({ id: result.insertId });
  } catch (err) {
    console.error('Erro ao criar item de estoque:', err);
    res.status(500).json({ mensagem: 'Erro ao criar item de estoque.' });
  }
});

// Atualizar item de estoque
app.put('/api/estoque/itens/:id', autenticarToken, apenasTecnicos, async (req, res) => {
  const { id } = req.params;
  const { nome, categoria, descricao, quantidade_minima, localizacao } = req.body;

  try {
    const campos = [];
    const valores = [];

    if (nome !== undefined) {
      campos.push('nome = ?');
      valores.push(nome);
    }
    if (categoria !== undefined) {
      campos.push('categoria = ?');
      valores.push(categoria);
    }
    if (descricao !== undefined) {
      campos.push('descricao = ?');
      valores.push(descricao);
    }
    if (quantidade_minima !== undefined) {
      campos.push('quantidade_minima = ?');
      valores.push(quantidade_minima);
    }
    if (localizacao !== undefined) {
      campos.push('localizacao = ?');
      valores.push(localizacao);
    }

    if (campos.length === 0) {
      return res.status(400).json({ message: 'Nenhum campo para atualizar.' });
    }

    valores.push(id);

    const sql = `UPDATE itens_estoque SET ${campos.join(', ')} WHERE id = ?`;
    await pool.query(sql, valores);

    res.json({ message: 'Item atualizado com sucesso.' });
  } catch (err) {
    console.error('Erro ao atualizar item:', err);
    res.status(500).json({ message: 'Erro ao atualizar item.' });
  }
});

// PUT /api/admin/usuarios/:id/nivel
app.put('/api/admin/usuarios/:id/nivel', autenticarToken, apenasTecnicos, async (req, res) => {
  const userId = Number(req.params.id);
  const { nivel } = req.body;

  if (!['funcionario', 'tecnico'].includes(nivel)) {
    return res.status(400).json({ message: 'Nível inválido.' });
  }

  try {
    await pool.query(
      'UPDATE perfis SET nivel = ? WHERE id = ?',
      [nivel, userId]
    );

    res.json({ message: 'Perfil atualizado com sucesso.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Erro ao atualizar perfil.' });
  }
});

// PUT /api/admin/usuarios/:id/senha
app.put('/api/admin/usuarios/:id/senha', autenticarToken, apenasTecnicos, async (req, res) => {
  const userId = Number(req.params.id);
  const { senha } = req.body;
  const senhaRegex = /^(?=.*[!@#$%^&*()_\-+=\[{\]};:'",.<>\/?]).{8,32}$/;

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ message: 'Usuário inválido.' });
  }

  if (!senhaRegex.test(senha || '')) {
    return res.status(400).json({
      message: 'A senha deve ter entre 8 e 32 caracteres e conter ao menos um caractere especial.'
    });
  }

  try {
    const [[usuario]] = await pool.query(
      `SELECT u.id, p.nivel
       FROM usuarios u
       JOIN perfis p ON p.id = u.id
       WHERE u.id = ?`,
      [userId]
    );

    if (!usuario) {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }

    if (usuario.nivel === 'admin' && req.usuario.nivel !== 'admin') {
      return res.status(403).json({ message: 'Apenas admin pode alterar senha de outro admin.' });
    }

    const senhaHash = await bcrypt.hash(senha, 10);

    await pool.query(
      `UPDATE usuarios
       SET senha_hash = ?, reset_token = NULL, reset_token_expire = NULL
       WHERE id = ?`,
      [senhaHash, userId]
    );

    res.json({ message: 'Senha atualizada com sucesso.' });
  } catch (err) {
    console.error('Erro ao alterar senha do usuário:', err);
    res.status(500).json({ message: 'Erro ao alterar senha do usuário.' });
  }
});

// DELETE /api/admin/usuarios/:id
app.delete('/api/admin/usuarios/:id', autenticarToken, apenasTecnicos, async (req, res) => {
  const userId = Number(req.params.id);
  let conn;

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ message: 'Usuário inválido.' });
  }

  if (userId === Number(req.usuario.id)) {
    return res.status(400).json({ message: 'Você não pode excluir o próprio usuário logado.' });
  }

  try {
    const [[usuario]] = await pool.query(
      `SELECT u.id, p.nivel
       FROM usuarios u
       JOIN perfis p ON p.id = u.id
       WHERE u.id = ?`,
      [userId]
    );

    if (!usuario) {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }

    if (usuario.nivel === 'admin') {
      return res.status(403).json({ message: 'Usuários admin não podem ser excluídos por esta tela.' });
    }

    const [[vinculos]] = await pool.query(
      `SELECT
        (SELECT COUNT(*) FROM chamados
         WHERE criado_por_id = ? OR atribuido_para_id = ? OR registrado_por_id = ?) AS chamados,
        (SELECT COUNT(*) FROM comentarios WHERE usuario_id = ?) AS comentarios,
        (SELECT COUNT(*) FROM relatorios_chamado WHERE tecnico_id = ?) AS relatorios`,
      [userId, userId, userId, userId, userId]
    );

    const totalVinculos =
      Number(vinculos.chamados || 0) +
      Number(vinculos.comentarios || 0) +
      Number(vinculos.relatorios || 0);

    if (totalVinculos > 0) {
      return res.status(409).json({
        message: 'Este usuário possui chamados, comentários ou relatórios vinculados. Altere o perfil para funcionário/técnico em vez de excluir.'
      });
    }

    conn = await pool.getConnection();
    await conn.beginTransaction();

    await conn.query('DELETE FROM perfis WHERE id = ?', [userId]);
    await conn.query('DELETE FROM usuarios WHERE id = ?', [userId]);

    await conn.commit();
    res.json({ message: 'Usuário excluído com sucesso.' });
  } catch (err) {
    if (conn) await conn.rollback();
    console.error('Erro ao excluir usuário:', err);
    res.status(500).json({ message: 'Erro ao excluir usuário.' });
  } finally {
    if (conn) conn.release();
  }
});



// POST /api/estoque/itens/:id/entrada
app.post('/api/estoque/itens/:id/entrada', autenticarToken, apenasTecnicos, async (req, res) => {
  const itemId = Number(req.params.id);
  const { quantidade, observacao } = req.body;

  if (!quantidade || quantidade <= 0) {
    return res.status(400).json({ mensagem: 'Quantidade inválida.' });
  }

  const conn = await pool.getConnection(); // <-- troquei db.getConnection por pool.getConnection
  try {
    await conn.beginTransaction();

    await conn.query(
      'UPDATE itens_estoque SET quantidade_atual = quantidade_atual + ? WHERE id = ?',
      [quantidade, itemId]
    );

    await conn.query(
      `INSERT INTO movimentacoes_estoque (item_id, tipo, quantidade, observacao)
       VALUES (?, 'entrada', ?, ?)`,
      [itemId, quantidade, observacao || null]
    );

    await conn.commit();
    res.json({ mensagem: 'Entrada registrada com sucesso.' });
  } catch (err) {
    await conn.rollback();
    console.error('Erro ao registrar entrada:', err);
    res.status(500).json({ mensagem: 'Erro ao registrar entrada.' });
  } finally {
    conn.release();
  }
});

// POST /api/estoque/itens/:id/saida
app.post('/api/estoque/itens/:id/saida', autenticarToken, apenasTecnicos, async (req, res) => {
  const itemId = Number(req.params.id);
  const { quantidade, chamado_id, observacao } = req.body;

  if (!quantidade || quantidade <= 0) {
    return res.status(400).json({ mensagem: 'Quantidade inválida.' });
  }

  const conn = await pool.getConnection(); // <-- troquei db.getConnection por pool.getConnection
  try {
    await conn.beginTransaction();

    const [[item]] = await conn.query(
      'SELECT quantidade_atual FROM itens_estoque WHERE id = ? FOR UPDATE',
      [itemId]
    );
    if (!item || item.quantidade_atual < quantidade) {
      await conn.rollback();
      return res.status(400).json({ mensagem: 'Estoque insuficiente.' });
    }

    await conn.query(
      'UPDATE itens_estoque SET quantidade_atual = quantidade_atual - ? WHERE id = ?',
      [quantidade, itemId]
    );

    await conn.query(
      `INSERT INTO movimentacoes_estoque (item_id, tipo, quantidade, chamado_id, observacao)
       VALUES (?, 'saida', ?, ?, ?)`,
      [itemId, quantidade, chamado_id || null, observacao || null]
    );

    await conn.commit();
    res.json({ mensagem: 'Saída registrada com sucesso.' });
  } catch (err) {
    await conn.rollback();
    console.error('Erro ao registrar saída:', err);
    res.status(500).json({ mensagem: 'Erro ao registrar saída.' });
  } finally {
    conn.release();
  }
});


// ======================== COMENTÁRIOS ======================

/**
 * GET /api/chamados/:id/comentarios
 * - Funcionário pode ver comentários dos seus chamados
 * - Técnico/Admin podem ver de qualquer chamado
 */
// GET /api/chamados/:id/comentarios
// Lista comentários do chamado
app.get('/api/chamados/:id/comentarios', autenticarToken, async (req, res) => {
  const chamadoId = Number(req.params.id);
  const usuario = req.usuario;

  try {
    //  Funcionário só pode ver se o chamado é dele
    if (usuario.nivel === 'funcionario') {
      const [[own]] = await pool.query(
        'SELECT 1 FROM chamados WHERE id = ? AND criado_por_id = ? LIMIT 1',
        [chamadoId, usuario.id]
      );
      if (!own) return res.status(403).json({ message: 'Acesso negado.' });
    }

    const [rows] = await pool.query(
      `SELECT c.id, c.texto, c.criado_em,
              p.nome_completo AS autor, p.nivel AS autor_nivel
       FROM comentarios c
       JOIN perfis p ON c.usuario_id = p.id
       WHERE c.chamado_id = ?
       ORDER BY c.criado_em ASC`,
      [chamadoId]
    );

    res.json(rows);
  } catch (err) {
    console.error('Erro ao buscar comentários:', err);
    res.status(500).json({ message: 'Erro ao buscar comentários' });
  }
});

app.get('/api/admin/usuarios', autenticarToken, apenasTecnicos, async (req, res) => {
  const [rows] = await pool.query(`
    SELECT u.id, u.email, p.nome_completo, p.nivel
    FROM usuarios u
    JOIN perfis p ON u.id = p.id
    ORDER BY p.nome_completo
  `);

  res.json(rows);
});


// POST /api/chamados/:id/comentarios
// Cria comentário e emite via WebSocket
app.post('/api/chamados/:id/comentarios', autenticarToken, async (req, res) => {
  const chamadoId = Number(req.params.id);
  const usuario = req.usuario;
  const { texto } = req.body;

  if (!texto?.trim()) {
    return res.status(400).json({ message: 'Comentário não pode estar vazio.' });
  }

  try {
    // Funcionário só comenta no que é dele
    if (usuario.nivel === 'funcionario') {
      const [[own]] = await pool.query(
        'SELECT 1 FROM chamados WHERE id = ? AND criado_por_id = ? LIMIT 1',
        [chamadoId, usuario.id]
      );
      if (!own) return res.status(403).json({ message: 'Acesso negado.' });
    }

    await pool.query(
      'INSERT INTO comentarios (chamado_id, usuario_id, texto) VALUES (?, ?, ?)',
      [chamadoId, usuario.id, texto.trim()]
    );

    const [[comentario]] = await pool.query(
      `SELECT c.id, c.texto, c.criado_em,
              p.nome_completo AS autor, p.nivel AS autor_nivel
       FROM comentarios c
       JOIN perfis p ON c.usuario_id = p.id
       WHERE c.chamado_id = ?
       ORDER BY c.id DESC
       LIMIT 1`,
      [chamadoId]
    );

    // Descobre envolvidos para notificar
    const [[env]] = await pool.query(
      'SELECT criado_por_id, atribuido_para_id FROM chamados WHERE id = ?',
      [chamadoId]
    );

    const payload = {
      chamadoId,
      texto: comentario.texto,
      autor: comentario.autor,
      autor_nivel: comentario.autor_nivel,
      criado_em: comentario.criado_em
    };

    // Emite somente para quem importa (criador e técnico)
    // Emite somente para quem importa (criador e técnico)
    if (env?.criado_por_id) {
      console.log(`📤 Enviando comentário para criador ID ${env.criado_por_id}`);
      enviarParaUsuario(env.criado_por_id, 'novo-comentario', payload);
    }
    if (env?.atribuido_para_id) {
      console.log(`📤 Enviando comentário para técnico ID ${env.atribuido_para_id}`);
      enviarParaUsuario(env.atribuido_para_id, 'novo-comentario', payload);
    }

    res.status(201).json(comentario);
  } catch (err) {
    console.error('Erro ao salvar comentário:', err);
    res.status(500).json({ message: 'Erro ao salvar comentário.' });
  }
});

/**
 * POST /api/chamados/:id/comentarios
 * - Funcionário só pode comentar nos seus chamados
 * - Técnico/Admin podem comentar em qualquer
 * - Notifica criador e técnico
 */


// ======================== CATCH-ALL (PROD) =================
// Se não houver SPA buildada em /public, retornará 404 JSON (ok em dev)
app.use((req, res) => {
  const indexPath = path.join(__dirname, 'public/index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      console.info('SPA não encontrada para servir (ok em dev):', err?.message);
      res.status(404).json({ message: 'Rota não encontrada.' });
    }
  });
});

transporter.verify((error, success) => { if (error) { console.log(error); } else { console.log('SMTP OK'); } });

// ======================== START SERVER =====================
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Backend rodando em http://0.0.0.0:${PORT}`);
});
