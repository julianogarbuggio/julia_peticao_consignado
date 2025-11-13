// Contador de contratos
let contratoCount = 0;

// Adicionar primeiro contrato ao carregar a página
document.addEventListener('DOMContentLoaded', function() {
    adicionarContrato();
});

// Função para adicionar contrato
function adicionarContrato() {
    if (contratoCount >= 2) {
        mostrarAlerta('Máximo de 2 contratos permitidos', 'error');
        return;
    }

    contratoCount++;
    const tbody = document.getElementById('contratosBody');
    const row = tbody.insertRow();
    row.id = `contrato-${contratoCount}`;

    row.innerHTML = `
        <td><input type="text" name="ct${contratoCount}_numero" placeholder="Ex: 123456" required></td>
        <td>
            <input type="text" name="ct${contratoCount}_inicioMM" placeholder="MM" maxlength="2" style="width: 50px" required>
            /
            <input type="text" name="ct${contratoCount}_inicioAA" placeholder="AA" maxlength="2" style="width: 50px" required>
        </td>
        <td>
            <input type="text" name="ct${contratoCount}_fimMM" placeholder="MM" maxlength="2" style="width: 50px" required>
            /
            <input type="text" name="ct${contratoCount}_fimAA" placeholder="AA" maxlength="2" style="width: 50px" required>
        </td>
        <td>
            <select name="ct${contratoCount}_situacao" required>
                <option value="">Selecione...</option>
                <option value="Ativo">Ativo</option>
                <option value="Quitado">Quitado</option>
                <option value="Cancelado">Cancelado</option>
            </select>
        </td>
        <td><input type="text" name="ct${contratoCount}_parcela" class="valor-input" placeholder="0,00" required oninput="calcularTotais()"></td>
        <td><input type="text" name="ct${contratoCount}_pago" class="valor-input" placeholder="0,00" required oninput="calcularTotais()"></td>
        <td><input type="text" name="ct${contratoCount}_aPagar" class="valor-input" placeholder="0,00" required oninput="calcularTotais()"></td>
        <td>
            <select name="ct${contratoCount}_copia" required>
                <option value="">Selecione...</option>
                <option value="SIM">SIM</option>
                <option value="NÃO">NÃO</option>
            </select>
        </td>
        <td>
            <button type="button" class="btn-remove" onclick="removerContrato(${contratoCount})">Remover</button>
        </td>
    `;

    // Adicionar máscaras de valor
    const valorInputs = row.querySelectorAll('.valor-input');
    valorInputs.forEach(input => {
        input.addEventListener('blur', function() {
            formatarValor(this);
        });
    });
}

// Função para remover contrato
function removerContrato(id) {
    const row = document.getElementById(`contrato-${id}`);
    if (row) {
        row.remove();
        contratoCount--;
        calcularTotais();
    }
}

// Função para formatar valor monetário
function formatarValor(input) {
    let valor = input.value.replace(/\D/g, '');
    if (valor === '') {
        input.value = '0,00';
        return;
    }
    valor = (parseInt(valor) / 100).toFixed(2);
    valor = valor.replace('.', ',');
    valor = valor.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    input.value = valor;
}

// Função para converter valor formatado em número
function valorParaNumero(valorStr) {
    if (!valorStr) return 0;
    return parseFloat(valorStr.replace(/\./g, '').replace(',', '.')) || 0;
}

// Função para calcular totais
function calcularTotais() {
    let totalPago = 0;
    let totalAPagar = 0;

    // Somar valores de todos os contratos
    for (let i = 1; i <= 2; i++) {
        const inputPago = document.querySelector(`input[name="ct${i}_pago"]`);
        const inputAPagar = document.querySelector(`input[name="ct${i}_aPagar"]`);

        if (inputPago && inputPago.value) {
            totalPago += valorParaNumero(inputPago.value);
        }
        if (inputAPagar && inputAPagar.value) {
            totalAPagar += valorParaNumero(inputAPagar.value);
        }
    }

    const totalDobro = totalPago * 2;
    const valorCausa = totalDobro + totalAPagar;

    // Atualizar display
    document.getElementById('valorPagoIndevido').textContent = formatarMoeda(totalPago);
    document.getElementById('valorIndevidoDobro').textContent = formatarMoeda(totalDobro);
    document.getElementById('valorCausa').textContent = formatarMoeda(valorCausa);
}

// Função para formatar moeda
function formatarMoeda(valor) {
    return 'R$ ' + valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Função para mostrar alerta
function mostrarAlerta(mensagem, tipo = 'success') {
    const alert = document.getElementById('alert');
    alert.className = `alert alert-${tipo} active`;
    alert.textContent = mensagem;

    setTimeout(() => {
        alert.className = 'alert';
    }, 5000);
}

// Função para coletar dados do formulário
function coletarDadosFormulario() {
    const form = document.getElementById('peticaoForm');
    
    // Validar formulário
    if (!form.checkValidity()) {
        form.reportValidity();
        return null;
    }

    // Coletar dados básicos
    const dados = {
        // Endereçamento
        tipoOrgao: form.tipoOrgao.value,
        cidade: form.cidade.value,
        estado: form.estado.value,
        preposicaoEstado: form.preposicaoEstado.value,

        // Dados da Autora
        nomeCompleto: form.nomeCompleto.value,
        nacionalidade: form.nacionalidade.value,
        nascimento: form.nascimento.value,
        estadoCivil: form.estadoCivil.value,
        profissao: form.profissao.value,
        rg: form.rg.value,
        estadoRg: form.estadoRg.value,
        cpf: form.cpf.value,
        whatsapp: form.whatsapp.value,
        email: form.email.value,
        logradouro: form.logradouro.value,
        numero: form.numero.value,
        complemento: form.complemento.value || '',
        bairro: form.bairro.value,
        cep: form.cep.value,

        // Dados da Ré
        nomeEmpresa: form.nomeEmpresa.value,
        cnpj: form.cnpj.value,
        logRe: form.logRe.value,
        nRe: form.nRe.value,
        complRe: form.complRe.value || '',
        bairroRe: form.bairroRe.value,
        cidadeRe: form.cidadeRe.value,
        ufRe: form.ufRe.value,
        cepRe: form.cepRe.value,

        // Justiça Gratuita
        justicaGratuita: form.justicaGratuita.value,

        // Contratos
        contratos: []
    };

    // Coletar contratos
    for (let i = 1; i <= 2; i++) {
        const numero = form.querySelector(`input[name="ct${i}_numero"]`);
        if (numero && numero.value) {
            const contrato = {
                numero: numero.value,
                inicioMM: form.querySelector(`input[name="ct${i}_inicioMM"]`).value,
                inicioAA: form.querySelector(`input[name="ct${i}_inicioAA"]`).value,
                fimMM: form.querySelector(`input[name="ct${i}_fimMM"]`).value,
                fimAA: form.querySelector(`input[name="ct${i}_fimAA"]`).value,
                situacao: form.querySelector(`select[name="ct${i}_situacao"]`).value,
                parcela: valorParaNumero(form.querySelector(`input[name="ct${i}_parcela"]`).value),
                pago: valorParaNumero(form.querySelector(`input[name="ct${i}_pago"]`).value),
                aPagar: valorParaNumero(form.querySelector(`input[name="ct${i}_aPagar"]`).value),
                copia: form.querySelector(`select[name="ct${i}_copia"]`).value
            };
            dados.contratos.push(contrato);
        }
    }

    // Validar se há pelo menos 1 contrato
    if (dados.contratos.length === 0) {
        mostrarAlerta('Adicione pelo menos 1 contrato', 'error');
        return null;
    }

    // Calcular totais
    let totalPago = 0;
    let totalAPagar = 0;
    dados.contratos.forEach(c => {
        totalPago += c.pago;
        totalAPagar += c.aPagar;
    });

    dados.valorPagoIndevido = totalPago;
    dados.valorIndevidoDobro = totalPago * 2;
    dados.valorCausa = (totalPago * 2) + totalAPagar;

    return dados;
}

// Função auxiliar para download de arquivo
async function downloadArquivo(url, nomeArquivo) {
    const response = await fetch(url);
    const blob = await response.blob();
    const urlBlob = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = urlBlob;
    a.download = nomeArquivo;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(urlBlob);
    document.body.removeChild(a);
}

// Função para gerar documento
async function gerarDocumento(tipo) {
    const form = document.getElementById('peticaoForm');
    const templateType = form.templateType.value;

    if (!templateType) {
        mostrarAlerta('Selecione o tipo de petição (COM ou SEM Tutela)', 'error');
        return;
    }

    const dados = coletarDadosFormulario();
    if (!dados) return;

    // Mostrar loading
    document.getElementById('loading').classList.add('active');

    try {
        // Determinar endpoint baseado no tipo
        let endpoint;
        if (tipo === 'docx') {
            endpoint = '/api/gerar-docx';
        } else if (tipo === 'pdf') {
            endpoint = '/api/gerar-pdf';
        } else if (tipo === 'both') {
            endpoint = '/api/gerar-ambos';
        } else {
            throw new Error('Tipo de documento inválido');
        }

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                tipo: templateType,
                dados: dados
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Erro ao gerar documento');
        }

        const result = await response.json();
        
        // Download dos arquivos gerados
        if (result.docx_url) {
            const nomeDocx = gerarNomeArquivo(templateType, dados, 'docx');
            await downloadArquivo(result.docx_url, nomeDocx);
        }
        if (result.pdf_url) {
            const nomePdf = gerarNomeArquivo(templateType, dados, 'pdf');
            await downloadArquivo(result.pdf_url, nomePdf);
        }

        mostrarAlerta('Documento(s) gerado(s) com sucesso!', 'success');

    } catch (error) {
        console.error('Erro:', error);
        mostrarAlerta('Erro ao gerar documento: ' + error.message, 'error');
    } finally {
        document.getElementById('loading').classList.remove('active');
    }
}

// Função para gerar nome do arquivo
function gerarNomeArquivo(templateType, dados, extensao) {
    const tipo = templateType === 'com_tutela' ? 'Tutela' : 'Sem_Tutela';
    
    // Extrair nome e sobrenome
    const partesNome = dados.nomeCompleto.trim().split(' ').filter(p => p);
    const primeiroNome = partesNome[0] || 'Nome';
    const sobrenome = partesNome[partesNome.length - 1] || 'Sobrenome';
    
    // Extrair razão social
    const razaoSocial = dados.nomeEmpresa
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .replace(/\s+/g, '_')
        .substring(0, 30);
    
    return `01_Peticao_Inicial_Emprestimo_${tipo}_${primeiroNome}_${sobrenome}_x_${razaoSocial}.${extensao}`;
}
