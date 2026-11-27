# Revisão corretiva de contratos — 2026-11-27

Escopo: CR-001 a CR-006; constituição, `spec.md`, `data-model.md`, `contracts/interfaces.md` e testes existentes. Nenhum requisito SDD foi alterado; T007 e os spikes não foram executados.

## Diagnóstico, correção e evidências

| ID | Classificação e reprodução | Correção e teste | Risco residual |
|---|---|---|---|
| CR-001 | Falha de fronteira reproduzida: um objeto com `surface` afirmada era aceito como remetente. | `validateMessage` deriva a classificação de metadados nativos recebidos separadamente do payload: ID, URL e, para conteúdo, aba, frame e documento. Testes rejeitam `surface` isolada e página de extensão inesperada; aceitam fixtures de painel, worker e conteúdo. | O chamador deve usar exclusivamente o `chrome.runtime.MessageSender` recebido do navegador, nunca um objeto da mensagem. Isso ainda não foi verificado em listener real. Se URL ou identidade estiverem ausentes, a classificação falha de forma fechada. |
| CR-002 | Falha reproduzida: finding e evidência alterados, com IDs consistentes, eram aceitos. | A interface da mensagem foi preservada; o validador exige snapshot de resultado e evidências do contexto confiável, valida referências e compara os objetos normalizados recebidos com os do snapshot. Testes cobrem objeto alterado, evidência alterada, ausência de snapshot, duplicidade e caso válido. | A garantia depende de o chamador obter o snapshot de estado interno confiável. Validação dos chunks e referências de conhecimento segue no trabalho de RAG. |
| CR-003 | Falha reproduzida: HSTS ausente e efetivo e fatos de CSP associados a HSTS eram aceitos; CSP ausente com restrições e meta ausente com política também. | Headers usam schemas específicos para CSP, HSTS e XFO; refinamentos rejeitam estado ausente com propriedade efetiva contraditória. Testes incluem HSTS, CSP, meta e XFO, inclusive campos de tipo incompatível. | Os schemas validam a coerência dos fatos recebidos; não fazem parsing de headers ou detecção de segurança. |
| CR-004 | Falha reproduzida: `COMPLETED` com `incomplete: true` era rejeitado mesmo com cobertura parcial. | Estado terminal e cobertura não são equiparados: uma análise concluída pode ser incompleta; `INTERRUPTED` continua exigindo `incomplete: true`. Testes cobrem cobertura parcial e indisponível. | O modelo não estabelece que todo resultado `COMPLETED` com cobertura parcial deva ter `incomplete: true`; a interpretação e apresentação da cobertura devem respeitar a especificação por regra. |
| CR-005 | Limitação documentada: `boundedText` restringe tamanho e caracteres, mas pode aceitar segredo alfanumérico; não há campo destinado a valor bruto em `Evidence`. | A responsabilidade de sanitização na origem permanece explícita. Não foi criada lista de códigos obrigatória: isso restringiria os campos textuais existentes e exigiria alinhar o contrato antes da adoção. | Validação sintática não garante privacidade semântica; não passar textos da aplicação sem sanitização. |
| CR-006 | Falha reproduzida: mensagens `EVIDENCE` aceitavam IDs de evidência duplicados. | Rejeição por ID duplicado; solicitações de explicação rejeitam duplicidades, IDs ausentes e itens não pertencentes ao snapshot. Testes positivos e negativos adicionados. | `requestId` tem formato validado, mas unicidade, expiração, replay e ordem dependem de estado e eventos reais: SPIKE-004 e T024 devem defini-los e testá-los. |

## Superfícies e viabilidade do remetente

A [documentação de `MessageSender` do Chrome](https://developer.chrome.com/docs/extensions/reference/api/runtime#type-MessageSender) descreve `id`, `url`, `tab`, `frameId` e `documentId`; vários são opcionais. O validador usa `url` exata de `sidepanel.html` para painel, `background.js` para worker e URL HTTP(S), aba, `frameId=0` e `documentId` para content script. Rejeita metadados ausentes ou ambíguos. Isso é uma hipótese verificável de integração, não prova de que todas as versões/rotas fornecem os campos para cada superfície. O contrato não instala listener: SPIKE-004/T024 devem validar os metadados reais de mensagens, URLs, ciclos de vida e falhas fechadas.

## Alternativa para solicitação de explicação

O contrato SDD atual transporta finding, evidências e referências de chunks. Uma alternativa é enviar apenas `findingId` junto ao identificador de análise e fazer o destinatário recuperar finding e evidências do snapshot confiável. Isso reduziria duplicação e superfície de falsificação, mas altera `contracts/interfaces.md` e exige aprovação específica antes de mudar a interface. A correção atual mantém o contrato e não autoriza essa alteração.

## Resultados

- RED: sete falhas comportamentais em 49 testes para CR-001/002/003/004/006; rodada adicional teve duas falhas em 58 testes para CSP/meta contraditórias.
- GREEN: `pnpm test` passou em 61 testes, 4 arquivos; `pnpm run typecheck` e `pnpm run build` passaram.
- A sanitização na origem, replay/ordenação e integração com Chrome real não foram implementadas nem declaradas comprovadas.
