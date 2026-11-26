# Modelo de dados da PoC

Os nomes de campos são contratos técnicos propostos em inglês; as explicações são em português. Schemas concretos serão definidos sem carregar dados sensíveis. Os objetos são transitórios, exceto a base de conhecimento empacotada e eventual cache do modelo, que nunca contêm evidências.

## ScanContext

`scanId` aleatório por análise; `tabId`, `frameId` (sempre zero), `documentId` confirmado, `navigationId` interno e `origin` sanitizada quando necessária; `startedAt` e fase. Identidade de solicitação principal é correlacionada por `requestId` transitório; `documentId` pode estar ausente antes de commit. Nunca usar a identidade não confirmada para unir evidências. Identificadores não são histórico nem prova de correspondência por si só.

Estados de análise: `IDLE → WAITING_PERMISSION → WAITING_RESPONSE_OR_RELOAD → COLLECTING → EVALUATING → COMPLETED`; `INTERRUPTED` a partir de qualquer estado ativo. Transições dependem de gesto, concessão, resposta/reload e identidade; alteração não esperada, perda de worker/aba/permissão ou timeout interrompe. A fase não é estado de regra. Em resposta não observada, regras dependentes recebem `NOT_EVALUATED`; outras podem ser avaliadas com evidência adequada. Resultados parciais são identificados como tal.

Na fase `WAITING_RESPONSE_OR_RELOAD`, o estado transitório de associação é `AWAITING_RESPONSE`,
`AWAITING_COMMIT` ou `IDENTITY_CONFIRMED`: `documentId` não é presumido antes do commit. Antes da
confirmação, reter apenas IDs e fatos já sanitizados em memória; nunca armazenar evidência bruta
sensível para associação posterior. Somente associar após comprovar correspondência; descartar
eventos não associáveis. Redirects, reload, navegação concorrente e reinício do worker são gates do
SPIKE-004; perda de identidade interrompe a análise ou resulta em `NOT_EVALUATED`.

## Evidence e cobertura

`Evidence`: `evidenceId` opaco por análise; `scanId`, `documentId`, `kind`, `facts` tipados e sanitizados, `source` (header/meta/storage/cookie/recurso), `observedAt` e limitações. União fechada de fatos: presença/ausência de header com CSP normalizada em diretivas permitidas; `jwtLike` e área; cookie candidato e flags booleanas; recurso com esquema, origem sanitizada e estado conhecido; script externo com `hasIntegrity`; nunca valores ou conteúdos arbitrários. Indisponibilidade não é fato de ausência. CSP e nomes de origem só são representados por tokens de lista permitida ou por sinal seguro; campos desconhecidos e payload bruto são rejeitados.

`Coverage`: `source` identifica a fonte; `status` é `COMPLETE`, `PARTIAL` ou `UNAVAILABLE`;
`reason` registra motivo e `limits` as limitações aplicáveis. Completa apenas se a inspeção integral
do recorte terminou sem erro, truncamento, permissão ausente ou identidade incerta. `COMPLETE`
descreve fotografia, não cobertura futura. Para cookie, distinguir loja e partição; somente afirmar
completa se todas as aplicáveis foram demonstravelmente consultadas. Limites atingidos => `PARTIAL`.
Uma evidência positiva aplicável comprovada pode gerar `FAILED` parcial; `NOT_APPLICABLE` é possível
quando a inaplicabilidade é comprovada e os dados faltantes são irrelevantes. Caso contrário,
`PARTIAL`/`UNAVAILABLE` não permitem `PASSED` ou ausência conclusiva.

## RuleEvaluation e Finding

`RuleEvaluation`: `ruleId` SEC-001…SEC-010, `scanId`, `status` ∈ `PASSED | FAILED | NOT_APPLICABLE | NOT_EVALUATED`, `evidenceIds`, `coverage`, `reason`, `findingIds`. Exatamente uma por regra por análise completa; análise interrompida preenche ausentes como `NOT_EVALUATED`. `FAILED` exige evidência positiva e pelo menos um finding; demais estados não inventam finding. `NOT_APPLICABLE` exige inaplicabilidade demonstrada, não falta de acesso.

`Finding`: `findingId` opaco, `ruleId`, `scanId`, `evidenceIds`, `severity`, `evidenceConfidence`, `riskConfidence`, `technicalJustification`, `remediationId`. Referências devem resolver para evidências do mesmo scan/documento. `Severity`: `LOW` para SEC-010 e `MEDIUM` para outras regras. `EvidenceConfidence`: `HIGH` se observação direta validada, `MEDIUM` se efeito depende de interpretação. `RiskConfidence`: `LOW` em SEC-005…008 e `MEDIUM` nas demais. Critérios de RF-005b prevalecem. A IA nunca altera essas propriedades.

## CorrelationResult e ScanResult

`CorrelationResult`: `correlationId` COR-001 ou COR-002, `scanId`, `documentId`, `findingIds`, `evidenceIds`, `explanation`; só existe para os pares positivos da especificação e valida que todos têm identidade idêntica. Não adicionar severidade implícita ou afirmar XSS/exploração.

`ScanResult`: `context`, `status` terminal, `incomplete` booleano, `evaluations` com dez
`RuleEvaluation`, `findings`, `correlations`, `coverage` e `limitations`. Em progresso, ainda não é
resultado final. Nenhum objeto de contexto pode conter URL completa, query, fragmento, credencial,
token, valor de cookie, conteúdo da página ou texto de header não autorizado.

## Fonte, índice e recomendação

`KnowledgeSource`: `sourceId` identifica um dos cinco documentos, `title`, `canonicalUrl`,
`revision`, `hash` e `license`. Cada `KnowledgeChunk` possui `chunkId`, `sourceId`, revisão, texto
e localização. `EmbeddingIndex`: `modelVersion`, `parameters`, `chunkVectors` normalizados e
`queryVectors` para as dez consultas canônicas; valores e dimensões são finitos e consistentes em
JSON local. Fonte/revisão e hashes são validados antes do uso; falha desabilita recuperação afetada.
Não incluir conteúdo de aplicações na base.

`Recommendation`: `findingId`, `mode` (`DETERMINISTIC` ou `LOCAL_AI`), texto como dado não confiável,
`references` a fonte/revisão/chunk efetivamente usado e limitações. A existência da referência é
verificada; não garante sustentação semântica. Saída inválida ou timeout aciona fallback determinístico;
se fonte ausente, indicar limitação sem inventar referência.
