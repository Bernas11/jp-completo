# Política de segurança

Este sistema trata **dados pessoais** (incluindo documentos de identificação) de militantes.

## Estado do projeto
Este repositório é um **protótipo público de portefólio**, usado com autorização da Juventude Popular para o nome e a identidade visual. Não está em produção e **não deve receber dados reais de militantes**.

## O que está protegido por desenho
RLS em todas as tabelas · cartões de cidadão em bucket privado com ligações temporárias · MFA obrigatório no backoffice · *rate limiting* · assinatura HMAC na sincronização · registo de auditoria. Detalhes em `docs/`.
