#!/usr/bin/env python3
"""
Gerador de DOCX usando DocxTemplate (python-docx-template).
Baseado no código funcionando do julia_consignado_peticao.
"""
import sys
import json
from pathlib import Path
from docxtpl import DocxTemplate

def format_money(value):
    """Formata um número para string monetária brasileira (R$ X.XXX,XX)"""
    if isinstance(value, str):
        # Se já é string, retorna como está
        return value
    try:
        value_float = float(value)
        return f"R$ {value_float:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
    except:
        return str(value)

def render_docx(template_path, output_path, context):
    """Renderiza template DOCX com contexto"""
    
    # 1. Garantir que todos os valores sejam strings
    for key, value in list(context.items()):
        if not isinstance(value, str):
            context[key] = str(value)
    
    # 2. Aplicar maiúsculas nos campos de cabeçalho
    uppercase_fields = ["CIDADE", "ESTADO", "TIPO_ORGAO", "NOME_COMPLETO", "NOME_EMPRESA"]
    for field in uppercase_fields:
        if context.get(field):
            context[field] = context[field].upper()
    
    # 3. Aplicar formatação monetária
    money_fields = ["VALOR_PAGO_INDEVIDO", "VALOR_INDEVIDO_DOBRO", "VALOR_CAUSA"]
    for field in money_fields:
        if field in context:
            context[field] = format_money(context[field])
    
    # 4. Formatar valores da tabela (_FLOAT)
    for key in list(context.keys()):
        if key.endswith("_FLOAT"):
            value = context[key]
            new_key = key.replace("_FLOAT", "")
            context[new_key] = format_money(value)
            del context[key]
    
    # 5. Renderizar template
    try:
        tpl = DocxTemplate(template_path)
        tpl.render(context)
        tpl.save(output_path)
        print(f"✅ DOCX gerado: {output_path}")
        return True
    except Exception as e:
        print(f"❌ Erro ao gerar DOCX: {e}", file=sys.stderr)
        return False

if __name__ == "__main__":
    if len(sys.argv) != 4:
        print("Uso: python3 gerar_docx_docxtpl.py <template.docx> <output.docx> '<json_context>'")
        sys.exit(1)
    
    template_path = sys.argv[1]
    output_path = sys.argv[2]
    context_json = sys.argv[3]
    
    try:
        context = json.loads(context_json)
        success = render_docx(template_path, output_path, context)
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"❌ Erro: {e}", file=sys.stderr)
        sys.exit(1)
