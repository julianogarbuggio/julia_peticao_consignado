import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Servir arquivos estáticos
app.use(express.static(__dirname));

// Rota principal
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    status: 'OK',
    timestamp: new Date().toISOString()
  });
});

// Proxy para BrasilAPI
app.get('/api/cnpj/brasilapi/:cnpj', async (req, res) => {
  try {
    const { cnpj } = req.params;
    const axios = (await import('axios')).default;
    const response = await axios.get(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, { timeout: 20000 });
    res.json(response.data);
  } catch (error) {
    console.error('Erro BrasilAPI:', error.message);
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

// Proxy para ReceitaWS
app.get('/api/cnpj/receitaws/:cnpj', async (req, res) => {
  try {
    const { cnpj } = req.params;
    const axios = (await import('axios')).default;
    const response = await axios.get(`https://www.receitaws.com.br/v1/cnpj/${cnpj}`, { timeout: 20000 });
    res.json(response.data);
  } catch (error) {
    console.error('Erro ReceitaWS:', error.message);
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

// Buscar CNPJ (busca local)
app.get('/api/cnpj/:cnpj', async (req, res) => {
  try {
    const { cnpj } = req.params;
    
    // Carregar banco de dados local
    const bancosPath = join(__dirname, 'data', 'bancos_top20.json');
    const bancos = JSON.parse(fs.readFileSync(bancosPath, 'utf-8'));
    
    // Buscar localmente
    const cnpjLimpo = cnpj.replace(/[.\/-]/g, '');
    const banco = bancos.find(b => b.cnpj.replace(/[.\/-]/g, '') === cnpjLimpo);
    
    if (banco) {
      return res.json({
        source: 'local',
        data: banco
      });
    }
    
    // Se não encontrou localmente, tentar BrasilAPI
    try {
      const axios = (await import('axios')).default;
      const response = await axios.get(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`, { timeout: 10000 });
      const data = response.data;
      
      return res.json({
        source: 'brasilapi',
        data: {
          nome: data.razao_social || '',
          cnpj: data.cnpj || '',
          endereco: `${data.logradouro || ''}, ${data.numero || ''}, ${data.municipio || ''}/${data.uf || ''}, ${data.cep || ''}`,
          email: '',
          whatsapp: ''
        }
      });
    } catch (apiError) {
      console.log('BrasilAPI falhou, tentando ReceitaWS...');
    }
    
    // Se BrasilAPI falhou, tentar ReceitaWS
    try {
      const axios = (await import('axios')).default;
      const response = await axios.get(`https://www.receitaws.com.br/v1/cnpj/${cnpjLimpo}`, { timeout: 10000 });
      const data = response.data;
      
      return res.json({
        source: 'receitaws',
        data: {
          nome: data.nome || '',
          cnpj: data.cnpj || '',
          endereco: `${data.logradouro || ''}, ${data.numero || ''}, ${data.municipio || ''}/${data.uf || ''}, ${data.cep || ''}`,
          email: data.email || '',
          whatsapp: data.telefone || ''
        }
      });
    } catch (apiError) {
      console.log('ReceitaWS falhou');
    }
    
    // Nenhuma fonte funcionou
    res.status(404).json({
      success: false,
      error: 'CNPJ não encontrado em nenhuma fonte'
    });
    
  } catch (error) {
    console.error('Erro ao buscar CNPJ:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Listar templates
app.get('/api/templates', (req, res) => {
  try {
    const templatesDir = join(__dirname, 'templates');
    const files = fs.readdirSync(templatesDir);
    const templates = files
      .filter(f => f.endsWith('_LIMPO.docx'))
      .map(f => ({
        name: f.replace('_LIMPO.docx', ''),
        path: f
      }));
    res.json({ success: true, templates });
  } catch (error) {
    console.error('Erro ao listar templates:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Gerar DOCX
app.post('/api/gerar-docx', async (req, res) => {
  try {
    const { tipo, dados } = req.body;

    if (!tipo || !dados) {
      return res.status(400).json({
        success: false,
        error: 'Tipo e dados são obrigatórios'
      });
    }

    // Mapear tipo para template
    const templateMap = {
      'com_tutela': '01_Peticao_Inicial_Emprestimo_Tutela_Nome_Sobrenome_Parte_Autora_x_Razao_Social_Re_LIMPO.docx',
      'sem_tutela': '01_Peticao_Inicial_Emprestimo_Sem_Tutela_Nome_Sobrenome_Parte_Autora_x_Razao_Social_Re_LIMPO.docx'
    };

    const templateFile = templateMap[tipo];
    if (!templateFile) {
      return res.status(400).json({
        success: false,
        error: `Tipo inválido: ${tipo}`
      });
    }

    const templatePath = join(__dirname, 'templates', templateFile);
    const outputPath = join(__dirname, 'temp', `peticao_${Date.now()}.docx`);

    // Verificar se template existe
    if (!fs.existsSync(templatePath)) {
      return res.status(404).json({
        success: false,
        error: `Template não encontrado: ${templateFile}`
      });
    }

    // Chamar script Python
    const dadosJson = JSON.stringify(dados).replace(/'/g, "'\\''");
    const command = `python3.11 "${join(__dirname, 'gerar_docx_simples.py')}" "${templatePath}" "${outputPath}" '${dadosJson}'`;

    console.log('Executando:', command);
    const { stdout, stderr } = await execPromise(command, { maxBuffer: 10 * 1024 * 1024 });

    if (stderr && !stderr.includes('UserWarning')) {
      console.error('Erro Python:', stderr);
    }

    if (!fs.existsSync(outputPath)) {
      throw new Error('Documento não foi gerado');
    }

    // Ler arquivo gerado
    const buffer = fs.readFileSync(outputPath);

    // Limpar arquivo temporário
    fs.unlinkSync(outputPath);

    // Enviar arquivo
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="Peticao_Inicial_${tipo}.docx"`);
    res.send(buffer);

  } catch (error) {
    console.error('Erro ao gerar DOCX:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      details: error.stack
    });
  }
});

// Gerar PDF
app.post('/api/gerar-pdf', async (req, res) => {
  try {
    const { tipo, dados } = req.body;

    // Primeiro gerar DOCX
    const templateMap = {
      'com_tutela': '01_Peticao_Inicial_Emprestimo_Tutela_Nome_Sobrenome_Parte_Autora_x_Razao_Social_Re_LIMPO.docx',
      'sem_tutela': '01_Peticao_Inicial_Emprestimo_Sem_Tutela_Nome_Sobrenome_Parte_Autora_x_Razao_Social_Re_LIMPO.docx'
    };

    const templateFile = templateMap[tipo];
    const templatePath = join(__dirname, 'templates', templateFile);
    const docxPath = join(__dirname, 'temp', `peticao_${Date.now()}.docx`);
    const pdfPath = docxPath.replace('.docx', '.pdf');

    // Gerar DOCX
    const dadosJson = JSON.stringify(dados).replace(/'/g, "'\\''");
    const commandDocx = `python3.11 "${join(__dirname, 'gerar_docx_simples.py')}" "${templatePath}" "${docxPath}" '${dadosJson}'`;
    await execPromise(commandDocx, { maxBuffer: 10 * 1024 * 1024 });

    // Converter para PDF usando LibreOffice
    const commandPdf = `libreoffice --headless --convert-to pdf --outdir "${join(__dirname, 'temp')}" "${docxPath}"`;
    await execPromise(commandPdf, { timeout: 30000 });

    if (!fs.existsSync(pdfPath)) {
      throw new Error('PDF não foi gerado');
    }

    // Ler arquivo PDF
    const buffer = fs.readFileSync(pdfPath);

    // Limpar arquivos temporários
    fs.unlinkSync(docxPath);
    fs.unlinkSync(pdfPath);

    // Enviar arquivo
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Peticao_Inicial_${tipo}.pdf"`);
    res.send(buffer);

  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Gerar ambos (DOCX + PDF)
app.post('/api/gerar-ambos', async (req, res) => {
  try {
    const { tipo, dados } = req.body;

    const templateMap = {
      'com_tutela': '01_Peticao_Inicial_Emprestimo_Tutela_Nome_Sobrenome_Parte_Autora_x_Razao_Social_Re_LIMPO.docx',
      'sem_tutela': '01_Peticao_Inicial_Emprestimo_Sem_Tutela_Nome_Sobrenome_Parte_Autora_x_Razao_Social_Re_LIMPO.docx'
    };

    const templateFile = templateMap[tipo];
    const templatePath = join(__dirname, 'templates', templateFile);
    const docxPath = join(__dirname, 'temp', `peticao_${Date.now()}.docx`);
    const pdfPath = docxPath.replace('.docx', '.pdf');

    // Gerar DOCX
    const dadosJson = JSON.stringify(dados).replace(/'/g, "'\\''");
    const commandDocx = `python3.11 "${join(__dirname, 'gerar_docx_simples.py')}" "${templatePath}" "${docxPath}" '${dadosJson}'`;
    await execPromise(commandDocx, { maxBuffer: 10 * 1024 * 1024 });

    // Converter para PDF
    const commandPdf = `libreoffice --headless --convert-to pdf --outdir "${join(__dirname, 'temp')}" "${docxPath}"`;
    await execPromise(commandPdf, { timeout: 30000 });

    // Criar ZIP com ambos
    const archiver = require('archiver');
    const archive = archiver('zip', { zlib: { level: 9 } });

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="Peticao_Inicial_${tipo}.zip"`);

    archive.pipe(res);
    archive.file(docxPath, { name: `Peticao_Inicial_${tipo}.docx` });
    archive.file(pdfPath, { name: `Peticao_Inicial_${tipo}.pdf` });
    await archive.finalize();

    // Limpar arquivos temporários
    setTimeout(() => {
      fs.unlinkSync(docxPath);
      fs.unlinkSync(pdfPath);
    }, 1000);

  } catch (error) {
    console.error('Erro ao gerar ambos:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Função para gerar nome personalizado do arquivo
function gerarNomeArquivo(context, extensao) {
  try {
    // Extrair nome e sobrenome da autora
    const nomeCompleto = (context.NOME_COMPLETO || context.nome_completo || '').trim();
    const partes = nomeCompleto.split(' ').filter(p => p.length > 0);
    const nome = partes[0] || 'Nome';
    const sobrenome = partes[partes.length - 1] || 'Sobrenome';
    
    // Extrair razão social da ré
    const razaoSocial = (context.RAZAO_SOCIAL_RE || context.razao_social || context.nome_empresa || 'Empresa').trim();
    
    // Normalizar: remover acentos, espaços, caracteres especiais
    const normalizar = (str) => str
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-zA-Z0-9]/g, '_') // Substitui caracteres especiais por _
      .replace(/_+/g, '_') // Remove _ duplicados
      .replace(/^_|_$/g, ''); // Remove _ no início/fim
    
    const nomeNorm = normalizar(nome);
    const sobrenomeNorm = normalizar(sobrenome);
    const razaoNorm = normalizar(razaoSocial);
    
    return `01_Peticao_Inicial_Emprestimo_${nomeNorm}_${sobrenomeNorm}_x_${razaoNorm}.${extensao}`;
  } catch (err) {
    console.error('Erro ao gerar nome do arquivo:', err);
    return `01_Peticao_Inicial_Emprestimo_${Date.now()}.${extensao}`;
  }
}

// Endpoints compatíveis com o HTML (formato /api/generate/*)
app.post('/api/generate/docx', async (req, res) => {
  try {
    const { template, context } = req.body;
    
    const templatePath = join(__dirname, 'templates', template);
    const nomeArquivo = gerarNomeArquivo(context, 'docx');
    const outputPath = join(__dirname, 'out', nomeArquivo);

    if (!fs.existsSync(templatePath)) {
      return res.status(404).json({ error: `Template não encontrado: ${template}` });
    }

    const dadosJson = JSON.stringify(context).replace(/'/g, "'\\''" );
    const command = `env -i PATH=/usr/bin:/bin /usr/bin/python3.11 "${join(__dirname, 'gerar_docx_docxtpl.py')}" "${templatePath}" "${outputPath}" '${dadosJson}'`;

    await execPromise(command, { maxBuffer: 10 * 1024 * 1024 });

    if (!fs.existsSync(outputPath)) {
      throw new Error('Documento não foi gerado');
    }

    const filename = outputPath.split('/').pop();
    res.json({ docx_url: `/out/${filename}` });

  } catch (error) {
    console.error('Erro ao gerar DOCX:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/generate/pdf', async (req, res) => {
  try {
    const { template, context } = req.body;
    
    const templatePath = join(__dirname, 'templates', template);
    const nomeArquivo = gerarNomeArquivo(context, 'docx');
    const docxPath = join(__dirname, 'out', nomeArquivo);
    const pdfPath = docxPath.replace('.docx', '.pdf');

    const dadosJson = JSON.stringify(context).replace(/'/g, "'\\''" );
    const commandDocx = `env -i PATH=/usr/bin:/bin /usr/bin/python3.11 "${join(__dirname, 'gerar_docx_docxtpl.py')}" "${templatePath}" "${docxPath}" '${dadosJson}'`;
    await execPromise(commandDocx, { maxBuffer: 10 * 1024 * 1024 });

    const commandPdf = `libreoffice --headless --convert-to pdf --outdir "${join(__dirname, 'out')}" "${docxPath}" 2>&1`;
    try {
      await execPromise(commandPdf, { timeout: 30000 });
      console.log('✅ LibreOffice executado sem erro');
    } catch (err) {
      console.log('⚠️ LibreOffice retornou erro (provavelmente warning javaldx)');
      // Ignorar warning do javaldx - aguardar 3s e verificar se PDF existe
      await new Promise(resolve => setTimeout(resolve, 3000));
      console.log(`🔍 Verificando se PDF existe: ${pdfPath}`);
      if (!fs.existsSync(pdfPath)) {
        console.log('❌ PDF não existe após 3s');
        throw err;
      }
      console.log('✅ PDF existe! Continuando...');
    }

    // Aguardar mais 1s para garantir que arquivo foi escrito completamente
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log(`🔍 Verificação final: ${pdfPath} existe? ${fs.existsSync(pdfPath)}`);
    if (!fs.existsSync(pdfPath)) {
      throw new Error('PDF não foi gerado');
    }
    console.log('✅ PDF pronto para enviar!')

    const filename = pdfPath.split('/').pop();
    res.json({ pdf_url: `/out/${filename}` });

  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/generate/both', async (req, res) => {
  try {
    const { template, context } = req.body;
    
    const templatePath = join(__dirname, 'templates', template);
    const nomeArquivo = gerarNomeArquivo(context, 'docx');
    const docxPath = join(__dirname, 'out', nomeArquivo);
    const pdfPath = docxPath.replace('.docx', '.pdf');

    // Gerar DOCX
    const dadosJson = JSON.stringify(context).replace(/'/g, "'\\''" );
    const commandDocx = `env -i PATH=/usr/bin:/bin /usr/bin/python3.11 "${join(__dirname, 'gerar_docx_docxtpl.py')}" "${templatePath}" "${docxPath}" '${dadosJson}'`;
    await execPromise(commandDocx, { maxBuffer: 10 * 1024 * 1024 });

    // Converter para PDF
    const commandPdf = `libreoffice --headless --convert-to pdf --outdir "${join(__dirname, 'out')}" "${docxPath}" 2>&1`;
    try {
      await execPromise(commandPdf, { timeout: 30000 });
      console.log('✅ LibreOffice executado sem erro');
    } catch (err) {
      console.log('⚠️ LibreOffice retornou erro (provavelmente warning javaldx)');
      // Ignorar warning do javaldx - aguardar 3s e verificar se PDF existe
      await new Promise(resolve => setTimeout(resolve, 3000));
      console.log(`🔍 Verificando se PDF existe: ${pdfPath}`);
      if (!fs.existsSync(pdfPath)) {
        console.log('❌ PDF não existe após 3s');
        throw err;
      }
      console.log('✅ PDF existe! Continuando...');
    }

    // Aguardar mais 1s para garantir que arquivo foi escrito completamente
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log(`🔍 Verificação final: ${pdfPath} existe? ${fs.existsSync(pdfPath)}`);
    if (!fs.existsSync(pdfPath)) {
      throw new Error('PDF não foi gerado');
    }
    console.log('✅ PDF pronto para enviar!')

    const docxFilename = docxPath.split('/').pop();
    const pdfFilename = pdfPath.split('/').pop();
    res.json({ 
      docx_url: `/out/${docxFilename}`,
      pdf_url: `/out/${pdfFilename}`
    });

  } catch (error) {
    console.error('Erro ao gerar ambos:', error);
    res.status(500).json({ error: error.message });
  }
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Servidor rodando em http://localhost:${PORT}`);
  console.log(`📄 Interface: http://localhost:${PORT}`);
  console.log(`🔧 Health: http://localhost:${PORT}/api/health`);
});
