# GiraJob — Diagnóstico e plano de evolução

Referência principal: "GiraJob — Plano Completo de Negócio e Produto" (04/11/2026). Nada será apagado; toda mudança no banco será aditiva, preservando dados, telas e regras atuais.

## 1. Diagnóstico do projeto atual

Já funcionando (testado com contas reais):
- Login (e-mail/senha e Google), escolha de perfil, papéis: admin, contratante, profissional, vendedor.
- Profissional: cadastro em 7 etapas (com CEP automático e chave Pix), explorar vagas, detalhe da vaga, candidatura, desistência, agenda com QR Code, perfil.
- Contratante: empresa (CNPJ e CEP automáticos), vagas com vários cargos e horários, quadro montado a partir de "Meus preços", triagem e contratação, alerta de conflito de horário, QR com registro de entrada, lista de pagamento, cobrança "GiraJob paga por mim" (Pix/boleto manual), financeiro, relatórios por evento com receitas e saldo, bloqueio por inadimplência.
- Admin: painel com filtros, cadastros novos, usuários, categorias, financeiro (taxas dos dois lados, Pix/boleto), relatório de receita, clientes adimplentes/inadimplentes com bloqueio, auditoria.
- Segurança: regras críticas validadas no servidor, permissões por papel, arquivos privados, trilha de auditoria.

Pontos a confirmar no início: a candidatura por cargo específico já existe no banco, mas o checklist interno ainda está em aberto. Primeiro passo: testar o fluxo de ponta a ponta e concluir o que faltar.

Identidade visual atual: tons de roxo. O documento define turquesa #00BFA6, laranja #FF6B3D, verde-lima #C8FF5B, azul-marinho #0B2342 e branco.

## 2. Existe x Planejamento

| Área | Existe | Falta |
|---|---|---|
| Vagas | Cargos em lote, horários por cargo, catálogo de preços | Duplicar vaga, modelos salvos, recorrência, raio de check-in, instruções de chegada, política de cancelamento, simulação de custo total antes de publicar |
| Estados da vaga | rascunho, publicada, pausada, encerrada, preenchida | Em seleção, em andamento, concluída, cancelada, expirada, com motivo registrado |
| Candidaturas | recebida, em análise, aprovada, recusada, desistiu, contratada | Lista de espera, confirmação pelo profissional, Kanban, seleção em lote, favoritos, substituição rápida |
| Check-in | QR estático validado pelo contratante, entrada | QR dinâmico com validade curta, geolocalização/geofence, check-out, ocorrências, contestação, câmera para ler QR |
| Conclusão do serviço | Não existe | Confirmação de término pelos dois lados, prazo de contestação, autorização de pagamento |
| Pagamentos | Lista com taxas dos dois lados, Pix/boleto manual | Provedor com split (PSP), ledger imutável com estornos como novos lançamentos, conciliação, comprovante; carteira do profissional |
| Planos | Tabela de assinaturas sem uso real | Planos Começar/Essencial/Pro/Operação com limites de vagas e taxa por plano; GiraJob Plus para o profissional |
| Avaliações | Tabela existe, sem telas | Avaliação bilateral, resposta/contestação, pontualidade e comparecimento |
| Agenda | Lista de trabalhos | Calendário dia/semana/mês, bloqueio de disponibilidade, lembretes |
| Notificações | Tabela existe, sem telas | Central no app, e-mail; push e WhatsApp depois, com consentimento |
| Capacitação | Não existe | Trilhas por cargo, módulos, progresso, prova, certificado, banco de talentos |
| Inteligência | Não existe | Remuneração sugerida (mediana e faixa, com tamanho da amostra), radar/mapa de calor agregado |
| Admin | Painel, financeiro, clientes, auditoria | Funil completo, comparecimento, conclusão, GMV/MRR/take rate/churn, denúncias, disputas, suporte, papéis internos (operação, financeiro, suporte) |
| Contratante | Empresa única, um responsável | Unidades, equipe com permissões (gestor de unidade), faturas |
| App do profissional | Web responsivo | App instalável (PWA) e, depois, publicação nas lojas iOS/Android |
| LGPD | Termos aceitos | Consentimentos registrados, exportação/exclusão de dados, canal de privacidade |

## 3. Módulos e telas a desenvolver

Admin: Funil e indicadores; Planos e limites; Disputas e contestações; Denúncias e moderação; Suporte (chamados); Capacitação (cursos, trilhas, certificados); Inteligência de mercado (remuneração, radar); Equipe interna e permissões; Conciliação de pagamentos.

Contratante: Assistente de vaga com simulação de custo; Modelos e duplicação; Kanban de candidatos com lista de espera e favoritos; Equipe do evento (confirmados, presença ao vivo); Leitor de QR por câmera; Conclusão e autorização de pagamento; Avaliações; Planos e assinatura; Unidades e usuários da equipe; Faturas.

Profissional: Confirmação da contratação com simulação do valor líquido; Check-in com localização e check-out; Conclusão/contestação; Carteira (bruto, taxas, líquido, status); Avaliações e reputação; Calendário e disponibilidade; Notificações; Capacitação e certificados; GiraJob Plus; Privacidade (meus dados).

## 4. Arquitetura e banco de dados

Mantém a base atual (tabelas existentes não são removidas nem renomeadas). Novos itens:

```text
plans / plan_limits ........ planos, preço, vagas ativas, taxa por plano
company_units / company_members  unidades e equipe do contratante (papel por unidade)
job_templates .............. modelos de vaga e duplicação
job_status_history / application_status_history  quem mudou, quando e por quê
favorites / waitlist ....... favoritos e lista de espera
checkins ................... entrada/saída, horário servidor e aparelho, local aproximado, método, validador
service_records ............ conclusão, ocorrências, prazo de contestação
disputes ................... contestações e análise administrativa
ledger_entries ............. lançamentos imutáveis (cobrança, taxa, repasse, estorno)
psp_events ................. eventos do provedor (idempotentes) e conciliação
courses / course_modules / enrollments / certificates  capacitação
talent_pool_consents / consents  banco de talentos e LGPD
reports_abuse / support_tickets  denúncias e suporte
notifications (já existe) + notification_preferences
market_rates (visão agregada) .. remuneração por cargo/cidade, sem dados individuais
```

Papéis: superadmin, operação, financeiro, suporte, instrutor (novos), além de admin, contratante, vendedor e profissional. Gestor de unidade fica na equipe do contratante, não no papel global.

Regras críticas continuam no servidor: taxas congeladas no momento da contratação, QR assinado e temporário, pagamento só após conclusão validada, estornos como novos lançamentos.

## 5. Plano de implementação por etapas

Cada etapa é entregue, testada e aprovada antes da próxima.

1. **Fundação e identidade**: nova paleta e componentes, finalizar candidatura por cargo, estados padronizados de vaga e candidatura com histórico.
2. **Seleção completa**: Kanban, lista de espera, favoritos, seleção em lote, confirmação pelo profissional com simulação do valor líquido, notificações no app.
3. **Presença**: QR dinâmico, leitura por câmera, geolocalização com raio, check-out, ocorrências, painel de presença ao vivo.
4. **Conclusão e pagamento**: confirmação de término, contestação, autorização, ledger, carteira do profissional; integração do provedor (PSP) com split e conciliação.
5. **Planos e monetização**: planos do contratante com limites e taxa por plano, simulação de custo, GiraJob Plus.
6. **Reputação e agenda**: avaliações bilaterais, pontualidade/comparecimento, calendário e disponibilidade, lembretes por e-mail.
7. **Administração avançada**: funil, GMV/MRR/take rate/churn, disputas, denúncias, suporte, papéis internos, exportações registradas.
8. **Capacitação e banco de talentos**: cursos, trilhas, provas, certificados, consentimento.
9. **Inteligência de mercado**: remuneração sugerida e radar/mapa de calor agregado.
10. **Escala**: unidades e equipe do contratante, app instalável e lojas, automações.

## 6. Riscos e dependências

- Pagamentos reais dependem da escolha do provedor (Asaas, Mercado Pago, Pagar.me ou Stripe) e de validação jurídica/contábil; até lá, os valores ficam pendentes.
- Conclusão (etapa 4) depende de presença (3); avaliações dependem de conclusão; inteligência depende de volume de dados reais (só com amostra suficiente).
- Planos com limites afetam contratantes atuais: será preciso migrar todos para um plano inicial sem bloquear ninguém.
- Geolocalização e fotos exigem consentimento e cuidados de LGPD.
- App nas lojas exige contas de desenvolvedor Apple/Google; começamos com app instalável pelo navegador.
- Notificações por WhatsApp/push dependem de provedores e consentimento.
- Taxa do profissional e relação de trabalho precisam de validação jurídica.

## Decisões que preciso de você ao longo do caminho

- Provedor de pagamento.
- Preços e limites dos planos (o documento sugere R$ 0 / 99 / 249 / 599+).
- Raio e tolerância do check-in.
- Política de cancelamento e no-show.
- Cidade e categorias do piloto.
