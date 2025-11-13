# Jul.IA - Plataforma Inteligente de Petições

Sistema automatizado para geração de petições iniciais de empréstimo consignado com busca de CNPJ e geração de documentos em DOCX/PDF.

## 🚀 Funcionalidades

- ✅ **Busca de CNPJ** com fallback automático (BrasilAPI + ReceitaWS)
- ✅ **Parser automático** de dados da parte autora
- ✅ **Tabela interativa** de contratos (até 2 contratos)
- ✅ **Geração de DOCX** com nomenclatura personalizada
- ✅ **Geração de PDF** via LibreOffice
- ✅ **8 templates** pré-configurados
- ✅ **20 bancos** pré-cadastrados
- ✅ **Interface dark** profissional

## 📋 Requisitos

- Node.js 22.x
- Python 3.11
- LibreOffice (para conversão PDF)
- pnpm

## 🔧 Instalação

```bash
# 1. Clonar repositório
git clone https://github.com/SEU_USUARIO/julia_peticao_consignado.git
cd julia_peticao_consignado

# 2. Instalar dependências Node.js
pnpm install

# 3. Instalar dependências Python
pip3 install fastapi uvicorn httpx docxtpl python-docx-template

# 4. Instalar LibreOffice (Ubuntu/Debian)
sudo apt-get install libreoffice

# 5. Iniciar servidor
pnpm dev
```

## 🌐 Uso

Acesse: `http://localhost:3000`

### Fluxo de uso:

1. **Preencher formulário** com dados da petição
2. **Buscar CNPJ** (botão azul "Buscar")
3. **Adicionar contratos** na tabela
4. **Gerar documento**:
   - Gerar DOCX
   - Gerar PDF
   - Gerar DOCX + PDF

### Nomenclatura dos arquivos:

```
01_Peticao_Inicial_Emprestimo_Nome_Sobrenome_x_Razao_Social_Re.docx
```

Exemplo:
```
01_Peticao_Inicial_Emprestimo_Juliano_Garbuggio_x_Banco_do_Brasil_S_A.docx
```

## 📁 Estrutura do Projeto

```
julia_peticao_consignado/
├── server.js                 # Servidor Node.js (Express)
├── gerar_docx_docxtpl.py    # Script Python para geração DOCX
├── package.json             # Dependências Node.js
├── public/
│   └── index.html          # Interface web
├── templates/              # Templates DOCX
│   ├── template_peticaoconsig.docx
│   ├── template_procuracao.docx
│   └── ...
├── data/
│   └── bancos_top20.json   # Base de 20 bancos
└── out/                    # Documentos gerados
```

## 🔌 Endpoints da API

### Busca de CNPJ

```bash
GET /api/cnpj/brasilapi/:cnpj
GET /api/cnpj/receitaws/:cnpj
```

### Geração de Documentos

```bash
POST /api/generate/docx
POST /api/generate/pdf
POST /api/generate/both

# Body:
{
  "template": "template_peticaoconsig.docx",
  "context": {
    "NOME_COMPLETO": "Juliano Garbuggio",
    "RAZAO_SOCIAL_RE": "Banco do Brasil S.A.",
    ...
  }
}
```

## 🎨 Templates Disponíveis

1. `template_peticaoconsig.docx` - Petição inicial consignado
2. `template_procuracao.docx` - Procuração
3-8. Templates diversos (kit consignado, parceiro, etc.)

## 🏦 Bancos Pré-cadastrados

20 maiores bancos do Brasil ordenados alfabeticamente:
- BNDES
- Banco ABC Brasil
- Banco BMG
- Banco BTG Pactual
- Banco BV (Votorantim)
- Banco Bradesco
- Banco C6
- Banco da Amazônia
- Banco Daycoval
- Banco Inter
- Banco Pan
- Banco Safra
- Banco Santander
- Banco do Brasil
- Banco do Nordeste
- Banrisul
- Caixa Econômica Federal
- Itaú Unibanco
- Sicoob (Bancoob)
- Sicredi

## 🐛 Problemas Conhecidos

- ⚠️ Cálculos da tabela podem apresentar erros quando contrato está ATIVO
- ⚠️ PDF pode gerar warning do LibreOffice (mas funciona normalmente)

## 📝 TODO

- [ ] Corrigir cálculos para contratos ATIVO
- [ ] Adicionar validação de campos obrigatórios
- [ ] Implementar dropdown de seleção de bancos
- [ ] Adicionar preview em tempo real do documento

## 👨‍💻 Autor

Juliano Garbuggio - Advocacia & Consultoria

## 📄 Licença

Todos os direitos reservados © 2025
