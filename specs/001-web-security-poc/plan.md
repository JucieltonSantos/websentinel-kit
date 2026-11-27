# Plano de implementação: WebSentinelKit — PoC

**Branch de referência do Spec Kit**: `001-web-security-poc` | **Data**: 2026-11-26 | **Especificação**: [spec.md](spec.md)

**Estado**: plano de referência para o desenvolvimento da PoC; Foundation e SPIKE-001 aprovados nos limites registrados em `docs/checkpoints/foundation.md`; SPIKE-002 aprovado nos limites de `docs/spikes/002-http-headers.md`. SPIKE-003–005, componentes futuros, checkpoint técnico e distribuição permanecem pendentes de validação e aprovação. O plano não amplia o escopo.

## Resumo

Extensão Chrome MV3 local-first com Side Panel em React e análise passiva voluntária de um único documento principal. Coletores sanitizam dados na origem; funções puras avaliam dez regras e duas correlações. Uma base JSON com cinco fontes versionadas fornece remediação determinística e recuperação local; uso da geração por IA é opcional para o usuário, mas recuperação semântica e inferência local devem ser demonstradas para concluir US3 e PoC integral. Falhas de evidência ou de capacidade não viram resultado seguro. [Pesquisa e decisões](research.md), [modelo](data-model.md), [contratos](contracts/interfaces.md) e [validação](quickstart.md) detalham a proposta.

## Contexto técnico

- **Linguagem/versão**: TypeScript com `strict`; Node 24 e versões da stack foram fixados após o SPIKE-001. A matriz final de navegadores permanece pendente. Baseline proposto Chrome 138+ para a variante opcional Prompt API; o núcleo não depende dessa API. `documentId` exige suporte desde Chrome 106, cookies particionados desde 119; validar a matriz final.
- **Dependências aprovadas para desenvolvimento**: WXT, React, Tailwind CSS, Zod, Vitest e pnpm, nas versões registradas na Foundation e em `package.json`. A auditoria da distribuição final permanece pendente; justificativas e fontes em [research.md](research.md). Transformers.js é candidato condicionado, não dependência consolidada; Gemini Nano/Prompt API é alternativa em avaliação.
- **Armazenamento**: base JSON empacotada, sem banco de dados externo nem histórico persistente. Resultados e evidências apenas em memória da sessão; cache de pesos, se necessário e permitido, separado da base e jamais com dados da aplicação. Sem banco vetorial ou IndexedDB para conhecimento.
- **Testes**: Vitest para regras puras, correlação, validação e sanitização; testes de integração MV3 em Chrome real para permissões, navegação, headers, isolamento e ciclo de vida. Playwright foi aprovado para os cenários demonstrados no SPIKE-001; os demais ainda exigem validação.
- **Plataforma/projeto**: uma extensão Chrome MV3, projeto único; demo vulnerável exclusivamente local.
- **Metas de desempenho**: limites operacionais iniciais definidos abaixo para proteção de recursos, não promessa de latência. Medir tempos e memória no hardware de referência antes de fixar metas de produto.
- **Restrições**: sem backend, serviço de inferência externa, exploração, varredura ativa, coleta de outras abas/iframes ou histórico; permissões restritas; CSP MV3 e política de código remoto aplicáveis.
- **Escala**: uma análise por vez e um documento principal por análise; dez regras, duas correlações e cinco documentos OWASP.

## Verificação da constituição

| Princípios | Antes da pesquisa | Após o design |
|------------|-------------------|---------------|
| I SDD; II simplicidade | A especificação existe; projeto único e funções simples. | Conforme proposto; sem código nem abstrações genéricas. |
| III segurança; IV privacidade; X privilégio mínimo | Ameaças, sanitização na origem e permissões por operação são obrigatórias. | Condicional: confirmar acesso real a cookies, isolamento de mensagens e ausência de vazamentos nos testes em Chrome. |
| V local-first; VI análise passiva | Sem backend ou requisições para teste; início voluntário. | Conforme o design; falhas de acesso geram avaliação indisponível. |
| VII evidência; VIII motor determinístico | Findings rastreáveis, motor e correlações puros. | Conforme contratos; `NOT_EVALUATED` conserva incerteza. |
| IX independência de IA | Núcleo e fallback funcionam offline; IA nunca modifica findings. | Condicional: provar modelo local, consentimento, fontes e conformidade MV3/CWS antes de ativar IA. |
| XI testes; XII código aberto | Testes positivos, negativos, borda, builds e documentação. | Planejados; nenhuma execução ou reprodutibilidade foi demonstrada. |

**Resultado da revisão de design original**: nenhuma violação deliberada identificada. Desde então, o SPIKE-001 validou a stack para desenvolvimento nos limites do checkpoint da Foundation; a aprovação posterior do SPIKE-002 cobre apenas os limites de seu relatório; os demais spikes ainda não foram comprovados. Validações condicionais são bloqueios para afirmar conformidade e disponibilizar as partes afetadas, não autorização para ampliar escopo. Se um bloqueio não puder ser resolvido, interromper e revisar com o responsável.

## Estrutura do projeto

### Documentação desta funcionalidade

```text
specs/001-web-security-poc/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── contracts/interfaces.md
└── quickstart.md
```

### Código-fonte proposto (raiz do repositório)

```text
entrypoints/          # background, content e sidepanel WXT
src/
├── collectors/       # adaptadores de browser e sanitização na origem
├── security/         # dez regras puras e modelo comum
├── correlation/      # duas correlações puras
├── knowledge/        # fontes, chunks e índice JSON
├── remediation/      # fallback determinístico e recuperação
├── ai/               # adaptador opcional de IA local
├── contracts/        # mensagens e validação nas fronteiras
└── ui/               # componentes React do Side Panel
tests/                # unitários e integração Chrome
demo/                 # aplicação vulnerável mínima local
docs/                 # limitações e decisões
```

A árvore descreve a arquitetura planejada; a Foundation já criou a estrutura inicial e confirmou os entrypoints atuais no build. Os componentes futuros ainda não foram implementados.

## Arquitetura e ciclo da análise

1. Ação explícita do usuário no ícone habilita `activeTab`; o Side Panel identifica aba/origem e inicia a operação. Um clique interno no painel não é presumido como gatilho de `activeTab`. Revalidar permissões e contexto no início.
2. O background registra listeners de `webRequest` e `webNavigation` no nível superior; filtra aba, `frameId=0`, tipo e origem autorizada. Só atua após iniciar análise. `onHeadersReceived` usa `responseHeaders`; não requisitar `extraHeaders` sem necessidade comprovada. Nunca armazenar ou transmitir cabeçalhos arbitrários: selecionar e transformar apenas CSP, HSTS e X-Frame-Options, descartando `Set-Cookie` e demais valores.
3. Sem resposta principal observada, apresentar instrução de recarregamento manual; observar a navegação esperada e sua resposta, descartar instantâneo anterior. Correlacionar `tabId`, requestId e navegação; vincular ao `documentId` confirmado por eventos de navegação e sender. Redirects, falta de identidade ou mudança inesperada implicam interrupção ou `NOT_EVALUATED`, nunca associação presumida.
4. `scripting` injeta coletor empacotado apenas no frame principal autorizado. Na origem ele verifica estruturas JWT sem enviar valores, extrai apenas sinais de CSP em meta, referências HTTP e metadados SRI sanitizados; nunca transmite DOM, texto, chaves ou URLs completas. Captura é uma fotografia limitada, não vigilância contínua.
5. Coletor de cookies no background usa `cookies` somente se autorizado; API retorna valores sensíveis junto a metadados. Recebê-los em escopo mínimo, extrair apenas correspondência da lista e flags, descartar referências imediatamente; nunca serializar, registrar, persistir ou repassar o objeto original. JavaScript não garante apagamento físico da memória; documentar essa limitação. Se loja/partição aplicável ou abrangência não for estabelecida, `NOT_EVALUATED`.
6. `src/scan/scan-orchestrator.ts` recebe apenas eventos e amostras sanitizados, invoca `evaluate`, monta `ScanResult` e entrega resultado validado ao painel. A correlação é integrada separadamente por `correlate`, apenas com identidade do mesmo contexto; US1 funciona sem ela. O painel apresenta avaliação, cobertura, justificativa, duas confianças e remediação sem alegar vulnerabilidade confirmada.
7. Fechamento da aba, troca de origem, navegação inesperada, cancelamento, timeout, perda de permissão, `documentId` divergente ou suspensão do worker invalida a operação; preservar apenas resultados sanitizados comprovadamente associados ao documento e marcá-los incompletos, se ainda existirem em memória. Nunca reiniciar nem mesclar automaticamente. A retomada exige nova ação do usuário.

O Side Panel mantém estado transitório; o worker não depende de globais para garantir conclusão. Se o worker reiniciar, o painel detecta perda da sessão e encerra como interrompida; não manter worker vivo artificialmente. Testar corridas entre eventos, redirecionamento, cache e reload. `history.pushState`/fragmento sem novo documento que altere URL ou aplicação invalida contexto por segurança; mudança fora da coleta não deve iniciar análise automática.

Antes do commit, a navegação fica em associação pendente: somente IDs e fatos já sanitizados são
retidos transitoriamente; nenhum valor bruto sensível é guardado para associação posterior. Após o
commit, associar apenas se a identidade e os eventos forem comprovadamente correspondentes; descartar
eventos não associáveis. Redirecionamentos, reload, navegação concorrente e reinício do worker são
avaliados no SPIKE-004 antes de consolidar a solução.

## Permissões, segurança e limites

- Manifesto proposto: `sidePanel`, `activeTab`, `scripting`, `webRequest`, `webNavigation`; `cookies` como opcional para SEC-007/008, solicitada com gesto do usuário e quando necessário. Validar instalação, avisos e se as APIs podem ser opcionais no Chrome alvo. Não incluir `tabs`, `storage`, `webRequestBlocking` ou `<all_urls>` obrigatórios sem comprovação. Se `activeTab` não permitir cookies ou resposta na origem necessária, solicitar host exato como permissão opcional apenas com consentimento; ausência resulta em cobertura limitada, não acesso amplo automático.
- `activeTab` não concede observação genérica de sub-recursos de terceiros; não solicitar acesso de terceiros apenas para aumentar cobertura. Usar referências do DOM e relatar carregamento/desfecho desconhecido. O evento de resposta não observado é diferente de header ausente.
- Para a observação da resposta principal, a evidência do SPIKE-002 favorece `activeTab` por gesto e listener único registrado sincronamente. Não exigir host obrigatório nem solicitar host opcional preventivamente; não depender de reload da extensão. Evidência indisponível permanece `NOT_EVALUATED`. Esta orientação é limitada às condições de [SPIKE-002](../../docs/spikes/002-http-headers.md) e não substitui a aprovação do checkpoint T013 nem a validação de identidade pelo SPIKE-004.
- Toda mensagem é validada por schema estrito, versão e limite de tamanho; rejeitar chaves extras e remetentes externos; conferir extensão, tabId, frameId e documentId compatíveis. Não aceitar ordens da página. O painel renderiza texto como texto, sem HTML gerado ou links não validados.
- Limites iniciais a validar: 30 s para aguardar reload, 10 s para coleta após documento pronto, 5 s por coleta, 1 MiB por mensagem sanitizada, até 1.000 itens por categoria; excedentes tornam cobertura parcial e impedem `PASSED`. IA: uma solicitação por vez, 30 s de geração e contexto sanitizado máximo de 16 KiB; timeout gera fallback. Estes limites são proposta técnica, não metas comprovadas.
- URLs, nomes e metadados podem conter segredos: usar apenas enums/flags e identificadores locais opacos; para referências de recursos exibir no máximo origem sem credenciais ou consulta, e somente se sanitizada; não transferir texto de CSP bruto sem validação de lista permitida.

## IA local e conhecimento

Cinco fontes OWASP aprovadas são adquiridas e versionadas para empacotamento, com licença, URL, revisão/hash e chunks identificáveis em JSON. Recuperação: embeddings de chunks e de consultas canônicas das dez regras pré-computados com o mesmo modelo, normalizados e ranqueados por similaridade cosseno com desempate por ID; o fallback mapeia regra para trechos e recomendações fixos, sem embeddings em runtime. A qualidade semântica, licença, dimensões e custo do índice devem ser medidos; referências à fonte não comprovam que a resposta é sustentada.

A geração é opcional para o usuário, mas sua capacidade local e a recuperação semântica são obrigatórias para concluir US3 e a PoC integral. A recuperação pode ser desenvolvida se somente a inferência falhar. Candidato inicial: Prompt API/Gemini Nano no Side Panel, condicionado a suporte, consentimento explícito e verificações de política e privacidade; Transformers.js é alternativa condicionada a viabilidade. Nenhum modelo específico, runtime, cache ou compatibilidade com CWS é aprovado como fato. Não enviar dados da aplicação ao baixar modelo. Falhas de disponibilidade, referências, validação ou tempo retornam fallback determinístico, que não substitui a entrega do RAG. A IA recebe somente sinais sanitizados e chunks autorizados, como dados não confiáveis; nunca altera findings, severidade ou confianças.

## Estratégia de testes e gates

- Testes positivos, negativos e de borda das 10 regras; duas correlações com contextos idênticos e diferentes; CSP múltipla/Report-Only/meta e precedência; `NOT_EVALUATED` por falta de resposta ou leitura.
- Sanitização e privacy tests com segredos canário em cookies, headers, URLs, storage, mensagens, logs, resultados e contexto de IA; esquemas, sender, excesso e payloads malformados.
- Chrome real: permissões negadas, host restrito, cookies particionados, navegação/reload/redirect, suspensão do worker, DOM incompleto, recursos externos e limites; teste de isolamento de abas/documentos.
- Base: cinco documentos, versões, licença, hash e IDs; referência inexistente/adulterada, fontes ausentes, prompt injection, modelo indisponível e fallback offline. Revisão humana da sustentação das afirmações; referência válida não é prova semântica.
- Demo local mínima exercita ao menos um finding e uma correlação, sem serviço público; verificar reprodutibilidade e artefatos de distribuição MV3.

## Acompanhamento de complexidade e riscos

Nenhuma exceção à constituição proposta. Riscos ainda não resolvidos: acesso completo a cookies particionados e seu contexto, visibilidade de respostas/cache, identidade entre `webRequest` e navegação, capacidade e conformidade de runtimes/modelos, custo de embeddings, e viabilidade de reconstruir builds. Os SPIKE-001 e SPIKE-002 foram executados e aprovados em seus limites; os demais experimentos e o checkpoint técnico permanecem pendentes. Se não for possível satisfazer os requisitos, marcar a capacidade indisponível e submeter a limitação ao responsável antes de afirmar conclusão da PoC.
