# Contratos de interfaces e regras

Contratos propostos para implementação e testes; os identificadores técnicos são em inglês. Não há API externa ou endpoint de análise.

## Fronteiras e mensagens

Envelope estrito: `version`, `type`, `requestId`, `scanId`, `documentId` quando existente e `payload` discriminado. Limite 1 MiB, rejeitar propriedades inesperadas, versões desconhecidas, tamanho excedido e IDs inválidos. Sem texto bruto de DOM, valores de storage, cookies, credenciais, URLs com parâmetros ou headers não permitidos. Schema de runtime é necessário mesmo com TypeScript.

| Mensagem | Origem → destino | Payload e comportamento |
|----------|------------------|-------------------------|
| `START_SCAN` | Side Panel → background | aba autorizada selecionada; confirmar gesto `activeTab`, permissões e estado; negar outra análise ativa. |
| `SCAN_STATUS` | background → Side Panel | fase, motivo, cobertura e instrução para reload manual quando necessário; nenhum reload automático. |
| `COLLECT` | background → coletor empacotado no frame principal | identidade de análise/documento e categorias estritamente necessárias. |
| `EVIDENCE` | coletor → background | somente `Evidence` e `Coverage` sanitizados; sem dados brutos. |
| `SCAN_RESULT` | background → Side Panel | `ScanResult` validado do mesmo contexto; interrompido ou completo. |
| `REQUEST_EXPLANATION` | Side Panel → adaptador IA local | finding e evidência previamente sanitizados, chunks da base e limites; sem valores sensíveis. |
| `EXPLANATION` | adaptador → Side Panel | `Recommendation` com referências validadas ou fallback e motivo; não altera finding. |

Todos os receptores validam `sender.id` e o tipo de superfície; mensagens de content script conferem `tabId`, `frameId=0`, `documentId` e identidade ativa quando aplicável. Mensagens painel↔worker devem vir da própria extensão e superfície esperada, com estado e IDs atuais. Não expor listener externo nem confiar em mensagem ou comando de página; `documentId` ausente ou divergente impede aceitação de evidência. Nenhum identificador de aba isolado garante identidade do documento.

Antes do commit da navegação, o ciclo usa `AWAITING_RESPONSE` e `AWAITING_COMMIT`; somente IDs e
fatos previamente sanitizados podem ser mantidos em memória. Em `IDENTITY_CONFIRMED`, fatos só são
associados ao documento quando a correspondência for comprovada. Eventos não associáveis são
descartados, e nunca se retém dado bruto sensível para associação posterior. A solução é condicionada
aos testes de reload, redirects, concorrência e suspensão/reinício no SPIKE-004.

O orquestrador em `src/scan/scan-orchestrator.ts` recebe evidências sanitizadas do contexto confirmado,
aciona as regras puras, monta `ScanResult` conforme [data-model.md](../data-model.md) e entrega
`SCAN_RESULT` ao painel. A etapa de correlação é integrada separadamente; sem ela, US1 permanece
funcional. Todas as mensagens e remetentes continuam sujeitos às validações acima.

## Contratos dos motores puros

`evaluate(ruleId, ScanContext, Evidence[], Coverage) → RuleEvaluation + Finding[]`. Mesmas entradas válidas produzem mesmas saídas; não lê navegador, relógio, rede, React ou IA. Todas as entradas de uma chamada têm mesmo `scanId` e `documentId` confirmado. Aplicar a precedência de RF-004: `NOT_APPLICABLE` comprovado, depois `FAILED` comprovado mesmo com cobertura parcial, depois `NOT_EVALUATED` para insuficiência, e `PASSED` apenas com cobertura suficiente. A cobertura parcial não impede inaplicabilidade comprovada por fatos independentes dos dados faltantes. Entradas incompletas nunca se tornam negativas por default.

| Regra | Fatos exigidos (sanitizados) | Resultado `FAILED` |
|-------|------------------------------|--------------------|
| SEC-001 | resposta principal observada e CSP aplicada por header/meta | nenhuma CSP aplicada identificável |
| SEC-002 | CSP aplicada, `script-src`/`default-src` e efeito conjunto | `unsafe-eval` efetivamente permitido conforme spec; sem restrição de scripts é `NOT_APPLICABLE` |
| SEC-003 | contexto HTTPS e presença/efetividade HSTS da resposta | HSTS efetivo ausente na resposta observada |
| SEC-004 | `frame-ancestors` aplicável e X-Frame-Options com precedência | nenhuma proteção efetiva conforme spec |
| SEC-005 | leitura completa de localStorage, flags estruturais sem valores | estrutura JWT observada |
| SEC-006 | leitura completa de sessionStorage, flags estruturais sem valores | estrutura JWT observada |
| SEC-007 | candidatos da lista, metadados HttpOnly, loja/partição | candidato sem HttpOnly |
| SEC-008 | candidatos da lista, metadados Secure, loja/partição | candidato sem Secure |
| SEC-009 | HTTPS e referências de recursos HTTP, excluídos links de navegação | referência ou tentativa HTTP observada, sem inferir carregamento |
| SEC-010 | scripts externos aplicáveis e presença `integrity` não vazia | script aplicável sem atributo não vazio |

Para cada regra, a saída segue estados, justificativas, evidência, severidade e confianças do [modelo](../data-model.md) e critérios completos de [spec.md](../spec.md). Caso o efeito CSP, cobertura de cookies ou identidade necessária não possa ser estabelecido, aplicar `NOT_EVALUATED` salvo inaplicabilidade já comprovada por evidências independentes ou condição de risco aplicável já comprovada; nenhuma inferência de segurança por omissão.

`correlate(ScanContext, RuleEvaluation[], Finding[]) → CorrelationResult[]`: COR-001 = SEC-001 ou SEC-002 `FAILED` e SEC-005 ou SEC-006 `FAILED`; COR-002 = SEC-001 ou SEC-002 `FAILED` e SEC-007 `FAILED`. Exigir referências positivas do mesmo contexto; rejeitar mistura, não criar correlação por `NOT_EVALUATED`; explicar risco sem alegar XSS.

## Contrato da interface

Um Side Panel em inglês apresenta início voluntário, fases, instrução de reload manual, erro de permissão, interrupção, resumo dos dez estados, findings com evidência sanitizada, severidade e as duas confianças, correlações, recomendações, indisponibilidades e estado de IA. Sem HTML de fontes não confiáveis; referências são links validados contra os documentos e versões locais. Ação de download do modelo é explícita e separada; falha ou recusa mantém fallback. Não incluir páginas extras, gráficos ou histórico.

## Contrato de conhecimento e IA

`retrieve(ruleId) → chunks[]` usa índice JSON local e similaridade entre consulta canônica e chunks com o mesmo modelo, desempate estável; valida schema, origem, versão, integridade e dimensões. `fallback(ruleId, chunksDisponíveis) → Recommendation` é determinístico, offline e indica fonte indisponível. `explain(finding, sanitizedEvidence, chunks) → Recommendation` é opcional para o usuário, exclusivamente local e limitado em tempo/tamanho; sua capacidade e a recuperação semântica devem ser demonstradas para conclusão da US3 e da PoC integral. Recuperação pode avançar separadamente da inferência. A saída e referências são validadas contra chunks efetivamente utilizados. Verificação da referência não garante que a fonte sustente a afirmação; exibir limitação e usar revisão humana. Conteúdo analisado não é instrução; saída inválida, indisponível ou sem referência validável gera fallback.
