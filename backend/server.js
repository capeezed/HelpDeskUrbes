// backend/server.js

// ======================== IMPORTS =========================
const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const pool = require('./db');
const { autenticarToken, apenasTecnicos } = require('./authMiddleware');

// ======================== APP/HTTP/WS ======================
const app = express();
const http = require('http');
const server = http.createServer(app);

// Socket.IO com CORS liberado
const { Server } = require('socket.io');
const io = new Server(server, {
  cors: {
    origin: true, // libera qualquer origem (IP/localhost/domínio)
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  }
});

const PORT = process.env.PORT || 3000;

// ======================== MIDDLEWARES ======================
app.use(cors({
  origin: true, // libera tudo
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.static(path.join(__dirname, 'public')));

// ======================== MULTER (UPLOADS) =================
const storage = multer.diskStorage({
  destination: (req, file, cb) => { cb(null, 'uploads/'); },
  filename: (req, file, cb) => { cb(null, Date.now() + '-' + file.originalname); }
});
const upload = multer({ storage });

// ======================== SOCKET.IO STATE ==================
/** Mapa userId -> socketId (1:1 simples) */
const clientesConectados = new Map();

io.on('connection', (socket) => {
  console.log('✅ WebSocket conectado:', socket.id);

  socket.on('registrarUsuario', (userId) => {
    if (!userId) return;
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

/**
 * GET /api/chamados
 * - Técnico/Admin: vê todos (com nome do solicitante)
 * - Funcionário: vê apenas os seus
 * - Filtro por ?status=aberto|em_andamento|pendente|resolvido|fechado
 */
app.get('/api/chamados', autenticarToken, async (req, res) => {
  const usuario = req.usuario;
  const { status } = req.query;

  try {
    let sql;
    const params = [];
    const baseQuery = `
      SELECT 
        c.*, 
        p.nome_completo AS solicitante_nome
      FROM chamados c
      JOIN perfis p ON c.criado_por_id = p.id
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

    sql = baseQuery + (conditions.length ? ` WHERE ${conditions.join(' AND ')}` : '');
    sql += ' ORDER BY c.criado_em DESC';

    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Erro ao buscar chamados:', err);
    res.status(500).json({ message: 'Erro ao buscar dados' });
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
        p_solicitante.nome_completo AS solicitante_nome,
        p_solicitante.setor_texto AS solicitante_setor,
        p_solicitante.cargo_texto AS solicitante_cargo,
        p_tecnico.nome_completo AS tecnico_atribuido_nome 
      FROM chamados c
      JOIN perfis p_solicitante ON c.criado_por_id = p_solicitante.id
      LEFT JOIN perfis p_tecnico ON c.atribuido_para_id = p_tecnico.id
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
app.post('/api/chamado', autenticarToken, upload.single('anexo'), async (req, res) => {
  try {
    const { titulo, descricao } = req.body;
    const criado_por_id = req.usuario.id;
    let anexo_url = null;

    if (req.file) {
      anexo_url = `http://${req.hostname}:${PORT}/uploads/${req.file.filename}`;
    }

    const sql = `
      INSERT INTO chamados (titulo, descricao, criado_por_id, anexo_url)
      VALUES (?, ?, ?, ?)
    `;
    const [result] = await pool.query(sql, [titulo, descricao, criado_por_id, anexo_url]);
    const [novoChamadoRows] = await pool.query('SELECT * FROM chamados WHERE id = ?', [result.insertId]);
    const novoChamado = novoChamadoRows[0];

    // Notifica técnicos
    await enviarParaTecnicos('novo-chamado', {
      chamadoId: novoChamado.id,
      titulo: novoChamado.titulo,
      criado_por_id,
      criado_em: novoChamado.criado_em,
      status: novoChamado.status
    });

    res.status(201).json(novoChamado);
  } catch (err) {
    console.error('Erro ao criar chamado:', err);
    res.status(500).json({ message: 'Erro ao salvar dados' });
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
  const { novaPrioridade } = req.body;

  if (!novaPrioridade) {
    return res.status(400).json({ message: 'Nova prioridade é obrigatória.' });
  }
  try {
    await pool.query('UPDATE chamados SET prioridade = ? WHERE id = ?', [novaPrioridade, chamadoId]);
    res.json({ message: 'Prioridade atualizada com sucesso!' });
  } catch (err) {
    console.error('Erro ao mudar prioridade:', err);
    res.status(500).json({ message: 'Erro ao salvar dados' });
  }
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
  const { email, pass, nomeCompleto, setor, cargo } = req.body;
  if (!email || !pass || !nomeCompleto || !setor || !cargo) {
    return res.status(400).json({ message: 'Todos os campos são obrigatórios.' });
  }
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const salt = await bcrypt.genSalt(10);
    const senhaHash = await bcrypt.hash(pass, salt);

    const [userResult] = await connection.query(
      'INSERT INTO usuarios (email, senha_hash) VALUES (?, ?)',
      [email, senhaHash]
    );
    const novoUsuarioId = userResult.insertId;

    await connection.query(
      'INSERT INTO perfis (id, nome_completo, setor_texto, cargo_texto) VALUES (?, ?, ?, ?)',
      [novoUsuarioId, nomeCompleto, setor, cargo]
    );

    await connection.commit();
    res.status(201).json({ message: 'Usuário criado com sucesso!', userId: novoUsuarioId });
  } catch (err) {
    await connection.rollback();
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'Este email já está cadastrado.' });
    }
    console.error('Erro ao registrar usuário:', err);
    res.status(500).json({ message: 'Erro interno no servidor.' });
  } finally {
    connection.release();
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

    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });
    res.json({ message: 'Login bem-sucedido!', token });
  } catch (err) {
    console.error('Erro no login:', err);
    res.status(500).json({ message: 'Erro interno no servidor.' });
  }
});

// ======================== COMENTÁRIOS ======================

/**
 * GET /api/chamados/:id/comentarios
 * - Funcionário pode ver comentários dos seus chamados
 * - Técnico/Admin podem ver de qualquer chamado
 */
app.get('/api/chamados/:id/comentarios', autenticarToken, async (req, res) => {
  const chamadoId = Number(req.params.id);
  const usuario = req.usuario;

  try {
    // Segurança: impede funcionário de ver comentários de chamado alheio
    if (usuario.nivel === 'funcionario') {
      const [[own]] = await pool.query(
        'SELECT 1 FROM chamados WHERE id = ? AND criado_por_id = ? LIMIT 1',
        [chamadoId, usuario.id]
      );
      if (!own) return res.status(403).json({ message: 'Acesso negado.' });
    }

    const sql = `
      SELECT c.id, c.texto, c.criado_em, p.nome_completo AS autor, p.nivel AS autor_nivel
      FROM comentarios c
      JOIN perfis p ON c.usuario_id = p.id
      WHERE c.chamado_id = ?
      ORDER BY c.criado_em ASC
    `;
    const [rows] = await pool.query(sql, [chamadoId]);
    res.json(rows);
  } catch (err) {
    console.error('Erro ao buscar comentários:', err);
    res.status(500).json({ message: 'Erro ao buscar comentários' });
  }
});

/**
 * POST /api/chamados/:id/comentarios
 * - Funcionário só pode comentar nos seus chamados
 * - Técnico/Admin podem comentar em qualquer
 * - Notifica criador e técnico
 */
app.post('/api/chamados/:id/comentarios', autenticarToken, async (req, res) => {
  const chamadoId = Number(req.params.id);
  const usuarioId = req.usuario.id;
  const { texto } = req.body;

  if (!texto || texto.trim() === '') {
    return res.status(400).json({ message: 'O comentário não pode estar vazio.' });
  }

  try {
    if (req.usuario.nivel === 'funcionario') {
      const [[own]] = await pool.query(
        'SELECT 1 FROM chamados WHERE id = ? AND criado_por_id = ? LIMIT 1',
        [chamadoId, usuarioId]
      );
      if (!own) return res.status(403).json({ message: 'Acesso negado.' });
    }

    await pool.query(
      `INSERT INTO comentarios (texto, chamado_id, usuario_id) VALUES (?, ?, ?)`,
      [texto.trim(), chamadoId, usuarioId]
    );

    const [[autor]] = await pool.query(
      'SELECT nome_completo AS autor, nivel AS autor_nivel FROM perfis WHERE id = ?',
      [usuarioId]
    );

    const [[env]] = await pool.query(
      'SELECT criado_por_id, atribuido_para_id FROM chamados WHERE id = ?',
      [chamadoId]
    );

    const payload = {
      chamadoId,
      texto: texto.trim(),
      autor: autor?.autor || 'Usuário',
      autor_nivel: autor?.autor_nivel || 'funcionario',
      criado_em: new Date()
    };

    if (env?.criado_por_id) enviarParaUsuario(env.criado_por_id, 'novo-comentario', payload);
    if (env?.atribuido_para_id) enviarParaUsuario(env.atribuido_para_id, 'novo-comentario', payload);

    res.status(201).json({ message: 'Comentário adicionado com sucesso!' });
  } catch (err) {
    console.error('Erro ao salvar comentário:', err);
    res.status(500).json({ message: 'Erro ao salvar comentário' });
  }
});

// ======================== CATCH-ALL (APENAS PROD) =========
// Se você NÃO copia o build Angular para /public, isso vai logar erro 404.
// Pode remover este bloco em dev se quiser.
app.use((req, res) => {
  const indexPath = path.join(__dirname, 'public/index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      // Em dev geralmente esse arquivo não existe.
      // Não é erro da API, só não há SPA para servir.
      // Logar como info:
      console.info('SPA não encontrada para servir (ok em dev):', err?.message);
      res.status(404).json({ message: 'Rota não encontrada.' });
    }
  });
});

// ======================== START SERVER =====================
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Backend rodando em http://0.0.0.0:${PORT}`);
});
