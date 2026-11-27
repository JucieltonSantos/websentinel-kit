# Fundação — evidências de validação

Data: 2026-11-26. Escopo: T014, T003–T006. Não constitui aprovação do checkpoint T007.

- RED inicial de T003/T004: `pnpm test`, dois arquivos carregados, 20 testes executados; 9 falharam em asserções comportamentais e 11 passaram com validadores provisórios retornando `false`. Não foi falha de importação ou configuração.
- GREEN inicial após implementação dos schemas: `pnpm test`, 20/20 testes passaram.
- RED de T006: `pnpm test`, 27 testes executados; uma asserção comportamental falhou e 26 passaram com validador provisório de resultados.
- RED adicional de isolamento: uma asserção falhou entre 28 testes ao fornecer remetente/contexto divergente; depois, passou com a verificação de aba, documento e análise.
- RED adicional de referências: uma asserção falhou entre 29 testes para evidência de correlação não pertencente aos findings; depois, passou com a validação dos relacionamentos.
- RED adicional de interrupção pré-commit: uma asserção falhou entre 30 testes e passou após permitir resultado interrompido sem documento quando não existem evidências ou findings.
- RED adicional de evidência CSP normalizada: uma asserção falhou entre 32 testes e passou após permitir fatos limitados sem header bruto.
- GREEN final: `pnpm test`, 3 arquivos e 33/33 testes aprovados. A suíte Playwright fica em `tests/browser/`, separada dos unitários.

`pnpm install --offline --frozen-lockfile --store-dir /tmp/websentinel-spike-pnpm-store`,
`pnpm run typecheck`, `pnpm test` e `pnpm run build` passaram. O build inclui `LICENSE` e
`THIRD_PARTY_NOTICES.md` idênticos aos da raiz. O manifesto MV3 contém apenas a permissão
`sidePanel`; nenhuma permissão de host foi declarada. Um teste Playwright com Chrome for Testing
carregou o service worker e abriu o documento do painel como página; não comprovou a abertura do
Side Panel nativo nem substitui validação manual. Navegação e suspensão pertencem aos demais spikes.
Dois builds sucessivos da raiz produziram hashes idênticos para todos os arquivos no mesmo ambiente;
isso não comprova reprodução do build definitivo em outra máquina.

Os validadores rejeitam campos estruturais não previstos e valores brutos onde há fatos de segurança,
mas não demonstram que qualquer texto livre já recebido foi semanticamente sanitizado. Os futuros
coletores devem realizar sanitização na origem; esquemas e testes não substituem essa obrigação.
A autoria do remetente e o contexto ativo devem ser obtidos de metadados confiáveis do Chrome, não de
campos fornecidos pela página; a integração real permanece fora desta etapa. A auditoria completa da
proveniência do bundle final e das licenças para distribuição permanece na T060.

## Revisão de T005 e T006 — 2026-11-27

As evidências RED de T003/T004 registradas acima foram preservadas. Novos testes executados antes das correções produziram RED comportamental: 2 falhas e 36 aprovações para referências duplicadas e resultado sem evidências confiáveis; depois, 1 falha e 38 aprovações para solicitação de explicação sem evidência referenciada. Não se tratou de erros de importação.

GREEN: `pnpm test` passou com 42 testes em 3 arquivos; `pnpm run typecheck` e `pnpm run build` passaram. Os fatos das evidências são uniões Zod estritas e tipadas, sem campos de valores brutos de cookies, storage, tokens ou headers. Mensagens de conteúdo exigem aba, documento e análise ativos; resultados exigem as evidências de referência do contexto confiável. Referências duplicadas e não resolvidas são rejeitadas; os quatro estados e cobertura parcial são testados.

Os campos de explicação e motivo são limitados por formato e tamanho, mas podem conter dados sensíveis alfanuméricos: nenhuma regex demonstra sanitização semântica. Não existem campos destinados a transportar valores brutos; os componentes futuros DEVEM sanitizar na origem e fornecer metadados de remetente e contexto obtidos do navegador, jamais da página. Essa obrigação e os testes reais de integração permanecem para T015–T026; esta revisão não valida coletores nem executa T007.

