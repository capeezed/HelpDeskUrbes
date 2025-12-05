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
    origin: '*', // libera qualquer origem (IP/localhost/domínio)
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
  }
});

const PORT = process.env.PORT || 300;

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

    // SQL atualizado com tipo e categoria
    const sql = `
      INSERT INTO chamados (titulo, descricao, tipo, categoria, criado_por_id, anexo_url)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    
    const [result] = await pool.query(sql, [
      titulo, 
      descricao, 
      tipo, 
      categoria, 
      criado_por_id, 
      anexo_url
    ]);
    
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

    const token = jwt.sign(payload, process.env.JWT_SECRET);
    res.json({ message: 'Login bem-sucedido!', token });
  } catch (err) {
    console.error('Erro no login:', err);
    res.status(500).json({ message: 'Erro interno no servidor.' });
  }
});

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
app.put('/api/estoque/itens/:id', async (req, res) => {
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
    // Funcionário só pode ver se o chamado é dele
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

// ======================== START SERVER =====================
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Backend rodando em http://0.0.0.0:${PORT}`);
});
