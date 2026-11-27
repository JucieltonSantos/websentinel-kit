# Checkpoint — Foundation

**Data:** 2026-11-27  
**Estado:** aprovada para desenvolvimento da PoC, nos limites abaixo.  
**Escopo:** T001–T006, T008 e T014; esta revisão não certifica funcionalidades futuras.

## Implementação e decisões

- Estrutura única de projeto, configuração MV3, Side Panel inicial em inglês e service worker que abre o painel. O painel informa que a análise ainda não está disponível. Não há coletor, scanner, motor de correlação, RAG ou demo funcional no produto; os schemas de saída são contratos, não essas funcionalidades. O SPIKE-001 está isolado.
- Contratos Zod estritos modelam fases, identidade, evidências tipadas, cobertura, dez avaliações, findings, correlações e mensagens. Remetente deve vir dos metadados nativos do Chrome e os dados de explicação devem ser comparados com snapshot confiável. As evidências de comportamento são unitárias e não substituem integração real.
- Decisões preservadas: local-first, análise passiva iniciada pelo usuário, privilégio mínimo, sanitização na origem, regras determinísticas independentes de IA, não misturar documentos e `NOT_EVALUATED` quando faltar evidência necessária. Sem Redux, Zustand, DI ou monorepo. A conformidade foi revisada para a fundação existente; os requisitos relativos a coletores, regras, correlação, IA e testes de ponta a ponta dependem de implementação e validação futuras.

## Stack e dependências

O responsável aprovou a stack para desenvolvimento no [SPIKE-001](../spikes/001-stack.md). Configuração atual com versões fixadas: Node 24.14.0, pnpm 11.1.2, WXT 0.21.5, módulo React WXT 1.2.2, React/React DOM 19.3.1, TypeScript 7.0.2 em modo strict, Tailwind CSS e plugin Vite 4.3.5, Zod 4.6.7, Vitest 5.1.2 e Playwright 1.65.1. O build informou Vite 8.3.8. Playwright está aprovado para os cenários demonstrados; abertura nativa do painel continua dependente de validação manual. Versões dos tipos e licenças estão em `package.json` e [dependencies.md](../dependencies.md).

T001–T006, T008 e T014 estão marcadas como concluídas; estrutura, fontes, testes, configuração e registros correspondentes foram revistos. A validação de reprodutibilidade registrada para o spike usou cópia limpa no mesmo sistema e store pré-existente; não comprova outro ambiente ou máquina.

## Evidências de validação

Em 2026-11-27, na raiz, sem instalar dependências:

| Verificação | Resultado |
|---|---|
| `pnpm test` | Passou: 4 arquivos e 61 testes unitários. |
| `pnpm run typecheck` | Passou, incluindo `tsc --noEmit`. |
| `pnpm run build` | Passou; gerou `.output/chrome-mv3`. |
| Manifesto gerado | MV3, apenas `sidePanel` em `permissions`; sem host permissions ou permissões opcionais declaradas. |
| Avisos no pacote | `cmp` confirmou `LICENSE` e `THIRD_PARTY_NOTICES.md` idênticos aos arquivos da raiz. |

As evidências históricas de TDD estão em [foundation-tdd.md](../validation/foundation-tdd.md) e [contracts-review.md](../validation/contracts-review.md). Na revisão corretiva, o registro informa RED comportamental de sete falhas em 49 testes para CR-001/002/003/004/006, seguido de RED adicional de duas falhas em 58 testes para CSP/meta, e GREEN de 61 testes, typecheck e build. CR-005 foi registrado como **limitação**, não como correção com RED próprio: validação sintática não garante sanitização semântica. A execução atual confirmou GREEN; não reverteu o código para reproduzir os estados RED históricos.

## Revisão CR-001 a CR-006

| ID | Resultado da revisão | Risco residual e tarefa responsável |
|---|---|---|
| CR-001 | Remetente é classificado a partir de metadados nativos e casos ambíguos são rejeitados nos testes. | Metadados e superfícies reais ainda precisam de confirmação; SPIKE-004 (T011) e T024. |
| CR-002 | Finding e evidências são comparados com snapshot confiável validado; alterações e ausência de snapshot são rejeitadas. | O chamador deve obter snapshot confiável; integração T024/T064. Chunks e referências dependem de T051–T053. |
| CR-003 | Schemas específicos rejeitam fatos contraditórios de CSP, HSTS, XFO e meta. | Schema não faz parsing ou avaliação efetiva; coletores T016/T021 e regras T027–T034. |
| CR-004 | Ciclo concluído pode ser incompleto; interrupção exige `incomplete`. | Apresentação e interpretação de cobertura por regra dependem de T032 e T044/T046. |
| CR-005 | Limite de texto não prova ausência de segredos; nenhum campo de evidência é destinado a valores brutos. | Sanitização na origem e canários são obrigatórios em T015/T020–T026 e T057; privacidade real de IA em T069. |
| CR-006 | IDs duplicados e referências inconsistentes são rejeitados nos casos testados. | Unicidade temporal, replay, ordenação e ciclo real dependem de T011/T024/T025. |

## Limitações, licenciamento e próximos passos

- Na data deste checkpoint, o manifesto da Foundation não provava a viabilidade futura de `activeTab`, headers, cookies, identidade de navegação ou suspensão do worker: T009–T011 e T013 são gates específicos. T012/T013 devem decidir separadamente recuperação e inferência local. O teste automatizado prévio abriu o documento do painel como página, não o painel nativo.
- A licença própria é MIT, com titular indicado em `LICENSE`; avisos iniciais estão em `THIRD_PARTY_NOTICES.md` e foram copiados ao build. A revisão técnica e seus limites constam em [dependencies.md](../dependencies.md). T060 deve auditar a proveniência do bundle definitivo, licenças, avisos, CSP, permissões e reprodutibilidade antes de distribuição.
- Tarefas disponíveis na data deste checkpoint pelas dependências declaradas: spikes T009–T012 e testes antecipados T015–T019, T027–T031, T040–T041, T044–T045, T047, T050–T051, T063, T065 e T067. T045, de remediações determinísticas, também satisfaz suas dependências declaradas. A execução de componentes definitivos continua sujeita às dependências e checkpoints de `tasks.md`.
- O checklist de requisitos foi revisado: cookies, cobertura e contexto estão definidos na especificação; a marcação não valida o produto. Ver [checklist](../../specs/001-web-security-poc/checklists/requirements.md).

## Aprovação

O responsável aprovou conceitualmente CR-001 a CR-006 e autorizou explicitamente a aprovação da Foundation em 2026-11-27, condicionada às evidências finais; testes, typecheck, build e inspeções acima atenderam aos critérios desta fase. Esta aprovação autoriza o desenvolvimento dentro do plano e de seus gates, não dispensa as aprovações de checkpoints subsequentes ou autoriza mudança de escopo.

**A aprovação da Foundation não representa aprovação para distribuição pública nem comprova as capacidades dos spikes restantes.**
