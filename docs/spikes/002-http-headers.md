# SPIKE-002 — observação de headers HTTP

**Estado: SPIKE-002 aprovado e T009 concluída em 2026-11-27.** O responsável concedeu GO definitivo após revisão das evidências, da validação adicional sem DevTools e de suas limitações. A aprovação limita-se ao SPIKE-002; não altera o manifesto do produto nem autoriza isoladamente T021 ou T013.

## Hipóteses e critérios

1. Um clique no ícone concede `activeTab` à aba escolhida e o acesso continua disponível ao usar o Side Panel. Uma tentativa de execução de uma função inofensiva com `scripting` no painel verifica apenas essa capacidade, não prova observação de headers.
2. Com permissões suficientes, `onHeadersReceived` observa a resposta principal posterior ao início; não recupera resposta anterior. O usuário recarrega manualmente quando necessário. A extensão não recarrega nem emite requisições de teste.
3. Eventos são limitados à aba selecionada, `frameId=0` e `main_frame`; CSP, HSTS e X-Frame-Options são reduzidos à presença, e outros headers e valores não saem do listener. `responseHeaders` indisponível precisa ser distinguido de um array observado vazio.
4. `tabId`, `requestId` e `documentId` podem ser necessários para associação, mas sua disponibilidade efetiva não é presumida. Identidade completa e suspensão do worker pertencem ao SPIKE-004.
5. `activeTab` e permissões API mínimas podem bastar; se não, avaliar permissão de host opcional da origem necessária, sem host amplo obrigatório no produto.

T009 exige comprovar resposta principal e ausência de observação, sem requisições ou reload automáticos, com eventos sanitizados e permissões reproduzíveis. Os resultados, suas limitações e a aprovação humana constam abaixo. Uma ausência de evento pode indicar permissão, listener ou outra limitação: não determina, isoladamente, a causa.

## Ambiente

- 2026-11-27; Node 24.14.0, pnpm 11.1.2, WXT 0.21.5, TypeScript 7.0.2, Vitest 5.1.2, Playwright 1.65.1 e Vite 8.3.8, usando dependências da Foundation e seu lockfile.
- Google Chrome 157.0.8103.78, versão oficial x86_64, informado pelo responsável para os testes manuais. Integração automatizada com Chrome for Testing 159.0.8154.6, Chromium do Playwright, headless e `--no-sandbox` em ambiente de teste; essa opção não é recomendação para produção.
- Fixture HTTP restrita a `127.0.0.1:4179`; não é backend do produto. HSTS é observado como header sintético em HTTP: isso não comprova sua aplicação efetiva pelo navegador.

## Protótipo e permissões

O manifesto experimental solicita `activeTab`, `scripting`, `sidePanel` e `webRequest`; declara apenas `http://127.0.0.1/*` como host **opcional**. Não solicita `<all_urls>`, `webRequestBlocking` ou `extraHeaders`. O listener é somente observador, filtra `main_frame` e a URL local, usa `responseHeaders` e não modifica requests ou respostas. O código não coleta corpos e não registra valores de headers. O objeto original é local ao callback; somente presença CSP/HSTS/XFO, disponibilidade dos metadados e disponibilidade de `responseHeaders` são mantidos. A fixture contém canários sintéticos em CSP, `Set-Cookie` e um header arbitrário; os testes verificam os dados estruturados que cruzam a fronteira exercitada. Isso não é auditoria de toda memória, rede, logs do navegador ou do produto.

A rotina `LAB_SELECT` existe somente no protótipo para o teste automatizado selecionar a aba sem gesto. Ela não comprova `activeTab` e não deve ser reutilizada no produto. O protótipo mantém estado somente em memória e não implementa isolamento completo de navegação; encerramento do worker pode perder a observação. Nenhuma conclusão sobre identidade segura decorre deste spike.

## Resultados automatizados

| Cenário | Esperado | Observado |
|---|---|---|
| Funções de filtro e sanitização | Bloquear outra aba, subframe e recurso; reter apenas três flags, sem canário | 3 testes Vitest passaram. RED anterior: 2 falhas comportamentais e 1 aprovação com implementação provisória; GREEN após implementação. |
| Página carregada antes do início | Estado inicial sem resposta observada | `observation: null` após carregar a fixture e iniciar a observação. |
| Sem gesto no ícone e sem host concedido | Controle negativo não observa resposta | Nova navegação não produziu evento. Não é teste de `activeTab` após gesto. |
| Host exato obrigatório em cópia descartável do manifesto | Verificar separadamente viabilidade de API e acesso local | Resposta principal posterior observada, três flags verdadeiras; `headersAvailable`, `tabIdAvailable` e `requestIdAvailable` verdadeiros; `documentIdAvailable` falso. |
| Sem os três headers | Observar resposta e três flags falsas | Confirmado na mesma cópia descartável, com `headersAvailable` verdadeiro. |
| Outra aba e subframe/recurso | Não contam como resposta da aba principal | Navegação na outra aba não alterou estado; fixture inclui iframe e script. Filtro também tem testes unitários diretos. |
| Segredos canário | Valores não aparecem no resultado sanitizado | Asserções sobre resultado da função e resultado transmitido ao painel passaram. Não foi feita inspeção de memória física nem de todos os logs. |

A cópia com host obrigatório existe apenas em diretório temporário criado e removido pelo teste; ela **não é** o manifesto experimental entregue, não comprova concessão opcional, nem estabelece a permissão mínima. O teste automatizado navega sob controle do Playwright e não comprova o reload manual nem a abertura nativa do Side Panel. As flags negativas só indicam ausência quando `headersAvailable` é verdadeiro. Os IDs não são transmitidos: apenas a disponibilidade é mostrada.

A primeira tentativa de servidor no sandbox retornou `EPERM` ao abrir a porta local; a execução autorizada fora dessa restrição passou. Uma tentativa inicial procurou o headless shell padrão e não encontrou navegador no cache padrão; o teste passou com `PLAYWRIGHT_BROWSERS_PATH` e `channel: chromium` usando o Chrome for Testing já existente. Os testes automatizados não usaram o Chrome instalado.

## Relato manual preliminar do responsável

O responsável informou que instalou a extensão experimental no Google Chrome sem erros impeditivos e abriu o Side Panel nativo. O Chrome apresentou o aviso: “You need to request host permissions in the manifest file in order to be notified about requests from the webRequest API.” O probe inicialmente falhou quando a aba selecionada era `chrome://extensions`; esse resultado não testa a fixture HTTP.

Em seguida, o responsável abriu `http://127.0.0.1:4179/`, clicou no ícone na aba da fixture, iniciou a observação e recarregou manualmente, sem acionar **Request optional local host**. Relatou uma resposta principal observada com `csp`, `hsts` e `xfo` falsos; `headersAvailable`, `tabIdAvailable` e `requestIdAvailable` verdadeiros; `documentIdAvailable` falso. O caminho `/` não configura os três headers na fixture, portanto as flags são coerentes com essa página. O relato inicial não informou resultado do probe na fixture; a versão do Chrome foi confirmada posteriormente.

O manifesto gerado não declara host obrigatório ou content scripts, mas declara `http://127.0.0.1/*` como host opcional. Não clicar no botão durante essa tentativa não exclui uma concessão anterior: o registro de permissões do perfil e as configurações de acesso ao site ainda precisam ser conferidos. O relato é evidência de captura após gesto, sem solicitação adicional nessa tentativa; a atribuição exclusiva a `activeTab` permanece condicionada a essa verificação. O aviso do Chrome também fica registrado, sem inferir sozinho sua causa ou invalidar o evento observado.

### Continuação manual: permissões e registro de listeners

O responsável relatou `origins: []` em `chrome.permissions.getAll()` e `false` em `chrome.permissions.contains()` para o host local, antes de repetir o experimento. Em `/with-headers`, após clicar no ícone, o probe de `activeTab` executou a função na aba. A observação permaneceu em `response not observed yet` após reload manual, sem concessão de host opcional. O Console da página mostrou aviso sobre a diretiva sintética desconhecida `x-secret-canary-csp`; esse aviso não estabelece a causa da ausência do evento.

Após solicitar o host opcional, `contains()` retornou `true`, mas a resposta continuou não observada após reload, inclusive depois de selecionar novamente a aba e reiniciar a observação. `chrome.webRequest.onHeadersReceived.hasListeners()` retornou `true`; isso indica que havia ao menos um listener registrado, não comprova que ele recebia eventos.

No Console do service worker, um listener temporário adicional foi registrado para `main_frame`, sem solicitar headers e retendo apenas `tabId`, `frameId` e `type`. O responsável relatou que o painel passou a apresentar os três headers presentes e `headersAvailable`, `tabIdAvailable` e `requestIdAvailable` verdadeiros, com `documentIdAvailable` falso. Após remover esse listener, reiniciar a observação e recarregar manualmente a fixture, o JSON não apareceu; ao registrá-lo novamente e repetir, voltou a funcionar. Nenhum valor bruto de header foi solicitado por esse listener de diagnóstico; os conteúdos de `spikeEvents` não foram relatados.

Por fim, a extensão experimental foi recarregada depois da concessão do host opcional, removendo o listener temporário, e o responsável informou que a captura voltou a funcionar sem adicioná-lo; o retorno da consulta de permissão após esse recarregamento não foi informado. Essa sequência **sustenta como hipótese**, mas não comprova, uma influência do momento do registro dos listeners ou do ciclo do service worker em relação à concessão. A captura com host opcional concedido não demonstra que `activeTab` sozinho seja suficiente. Naquele momento, a versão do Chrome e os testes de negação, revogação, ausência dos headers e isolamento entre abas ainda não haviam sido relatados; os resultados posteriores constam abaixo. A sequência controlada não estabeleceu a causa interna ou uma solução definitiva para T021.

Para confirmar o estado, fechar abas anteriores da fixture e, antes de novo gesto, abrir o DevTools do **service worker da extensão experimental** em `chrome://extensions` e executar `await chrome.permissions.getAll()` e `await chrome.permissions.contains({origins: ['http://127.0.0.1/*']})`. Registrar `origins` e o booleano; conferir também em **Details** se há acesso persistente ao site. Se houver concessão opcional, ela pode ser removida nas configurações quando disponíveis ou por `await chrome.permissions.remove({origins: ['http://127.0.0.1/*']})`, seguido de nova consulta. Um `false` e ausência de padrões de host concedidos, em perfil sem acesso persistente ao site, são pré-condições para repetir o experimento controlado; a consulta não é prova isolada de que nenhum outro mecanismo concedeu acesso temporário por aba. Um perfil novo com instalação nova oferece controle adicional. Detalhes e comportamento podem variar com a versão do Chrome. [API de permissões do Chrome](https://developer.chrome.com/docs/extensions/reference/api/permissions) e [gerenciamento de acesso a sites](https://support.google.com/chrome/answer/2664769?hl=pt-BR).

## Reprodução automatizada

A partir da raiz, com dependências da Foundation já instaladas e Chrome for Testing compatível disponível:

```sh
cd spikes/002-http-headers
../../node_modules/.bin/wxt prepare
../../node_modules/.bin/vitest run --config vitest.config.ts
../../node_modules/.bin/tsc --noEmit
../../node_modules/.bin/wxt build
PLAYWRIGHT_BROWSERS_PATH=/tmp/websentinel-playwright-browsers node tests/browser.mjs
```

O caminho temporário do navegador depende do ambiente; provisioná-lo conforme as instruções locais se ausente. O teste precisa abrir a porta local e criar perfis temporários; se o sandbox impedir, registrar a limitação. O servidor aceita somente loopback, e o teste o encerra e remove os perfis ao terminar.

## Instrumentação e ensaio controlado E1–E9

A instrumentação foi autorizada para o spike, sem mudança no manifesto definitivo ou em contratos. O registro principal continua síncrono na inicialização WXT; o painel permite registrar/remover um listener adicional, revogar host, reiniciar contadores e atualizar os diagnósticos. Não existe polling contínuo: depois de cada reload, clicar em **Refresh diagnostics**. A abertura do painel consulta o estado uma vez. Os dois listeners mantêm contadores separados de recebidos, aceitos, rejeitados e motivos; os contadores incluem apenas eventos entregues pelo Chrome aos filtros declarados (`main_frame` e host local). Assim, zero eventos não significa que o Chrome não tenha processado requests, e subframes/recursos filtrados pela API não entram nos contadores.

A saída apresenta identificador aleatório e horário de inicialização do worker, situação de registro do listener principal (`mainRegistration` e `mainListenerRegistered`), estado do listener adicional, resultado do probe, seleção de aba, observação ativa, flags e eventos limitados de concessão/remoção de host. `hasListener` indica registro local, não comprova entrega de eventos. As consultas de host em **Refresh diagnostics** são instantâneos: registrar antes e depois manualmente. Eventos de permissão mostram somente `host_added`/`host_removed`; nada armazena a origem recebida. Contadores e registros ficam exclusivamente em memória, são limitados (100 eventos de permissão) e desaparecem no reinício. O resultado do probe também é perdido no reinício. Não armazenar ou publicar valores brutos de headers, URLs completas, cookies, tokens ou credenciais. `LAB_SELECT` só existe para testes automatizados e não demonstra gesto nem `activeTab`.

### Evidência automatizada — três tentativas independentes

**Hipótese**: em ambiente controlado, eventos de outra aba não são aceitos; respostas presentes e ausentes são distinguíveis; encerrar o worker perde o estado temporário sem retomá-lo implicitamente.

**Condições iniciais**: Chrome for Testing 159.0.8154.6, Playwright 1.65.1, Node 24.14.0, headless e `--no-sandbox`; perfis e cópias descartáveis separados por tentativa. O teste cria uma fixture exclusiva na porta 4187, sem interromper o servidor manual na 4179. Para E7/E8/E9, cópia temporária tem host local obrigatório. A extensão experimental entregue mantém o host local **opcional**. Não há gesto real no ícone nem concessão via diálogo: a aba é selecionada por `LAB_SELECT`.

**Procedimento**: `PLAYWRIGHT_BROWSERS_PATH=/tmp/websentinel-playwright-browsers node tests/browser.mjs` após build. São feitos três perfis de controle sem gesto e sem host e três perfis com host local obrigatório na cópia. O teste verifica flags, contadores, rejeição da outra aba, listener adicional, ausência de canários na mensagem/painel e usa CDP `Target.closeTarget` para encerrar o worker.

**Resultados observados e reprodutibilidade**:

| Condição | Tentativa 1 | Tentativa 2 | Tentativa 3 |
|---|---|---|---|
| Controle sem gesto e sem host: resposta não observada | passou | passou | passou |
| Host local obrigatório na cópia: E7 e E8 | passou | passou | passou |
| Registro/remoção do listener adicional e contadores | passou | passou | passou |
| E9: encerramento forçado por CDP e perda de estado | passou | passou | passou |

Nas três tentativas com host local, `tabId` e `requestId` estavam disponíveis e `documentId` não. Em E7, o listener principal recebeu e rejeitou a outra aba; na sequência, recebeu e aceitou uma resposta da aba selecionada. Em E8, a resposta sem headers produziu `headersAvailable: true` e flags falsas. Os requests de iframe/script são excluídos pelo filtro da API e não contados como rejeições. Em E9, a nova instância iniciou com listener principal registrado, listener adicional ausente, zero eventos, sem aba selecionada e sem observação ativa; isso descreve perda de estado, não tratamento de interrupção de produto. Os testes de canário verificam JSON sanitizado e texto de diagnóstico do painel, não toda memória ou logs do navegador.

**Conclusão**: E7/E8 são reproduzíveis no cenário automatizado restrito com permissão de host obrigatória no manifesto temporário. E9 mostra perda do estado após encerramento forçado; não prova suspensão natural ou isolamento de navegação. O controle sem gesto não comprova E1. Não houve divergências entre as três tentativas automatizadas. As condições manuais E1–E4 e decisões reais de concessão/negação e revogação opcional não foram automatizadas; as tentativas manuais posteriores estão registradas abaixo. E5 exige permissão opcional real e E9 manual não foi executado. A causa da inconsistência permanece hipótese, não solução aprovada.

### Validação manual: preparação

1. Com dependências da Foundation instaladas, gerar o spike:

   ```sh
   cd spikes/002-http-headers
   ../../node_modules/.bin/wxt prepare
   ../../node_modules/.bin/vitest run --config vitest.config.ts
   ../../node_modules/.bin/tsc --noEmit
   ../../node_modules/.bin/wxt build
   node fixture.mjs
   ```

   Manter o servidor aberto; se a porta 4179 já estiver ocupada pela fixture, utilizar o servidor existente. Carregar `spikes/002-http-headers/.output/chrome-mv3` em `chrome://extensions`. Recarregar a extensão apenas para instalar o novo build, não como correção ou parte normal do fluxo.
2. No painel, **Refresh diagnostics** mostra o estado pontual; **Reset counters** apaga contadores e eventos de permissão da instância atual, não revoga permissões. Copiar somente o JSON sanitizado de diagnóstico antes de encerrar o worker. Não há atualização automática após reload: clicar novamente em **Refresh diagnostics**.
3. Para uma linha de base sem host, fechar abas anteriores da fixture, clicar em **Revoke optional local host** e conferir `hostGranted: false` em **Refresh diagnostics**. Em `chrome://extensions`, verificar se não há acesso persistente à origem. Confirme também `chrome.permissions.contains({origins: ['http://127.0.0.1/*']})` no Console do service worker, quando necessário. O probe verifica apenas execução de script, não prova captura de headers.
4. Para iniciar uma instância nova sem recarregar a extensão, fechar DevTools do worker e o painel, abrir `chrome://serviceworker-internals/`, localizar pelo ID da extensão experimental e acionar **Stop** se disponível. Confirmar parada; abrir novamente o painel pelo ícone na aba da fixture e comparar `instanceId` com o anterior. Se o controle não estiver disponível ou o ID não mudar, registrar a tentativa como inconclusiva. DevTools aberto e chamadas ao worker podem impedir suspensão por inatividade.

### Repetições manuais E1–E4 — três tentativas independentes

Repetir a sequência abaixo **três vezes**, iniciando cada tentativa pela linha de base sem host e por uma nova instância comprovada. Para cada etapa anotar `instanceId`, `initializedAt`, `hostGranted`, `mainRegistration`, estado dos listeners, probe, contadores antes/depois, eventos de permissão e resultado da observação. Não registrar valores de headers. Uma tentativa sem a condição inicial comprovada é inconclusiva e não conta como repetição.

- **E1 — activeTab**: abrir `http://127.0.0.1:4179/with-headers`, clicar no ícone, **Probe activeTab**, **Reset counters**, **Start observation**. Conferir não observada, recarregar manualmente a fixture e clicar **Refresh diagnostics**. Esperado: probe `succeeded`; resultado do listener e flags são observados, não presumidos. Com resposta disponível, CSP/HSTS/XFO devem ser verdadeiros.
- **E2 — concessão após registro**: na mesma instância de E1, clicar **Request optional local host**, aceitar se houver diálogo, e conferir `hostGranted: true` e eventos de permissão. **Reset counters**, **Start observation**, reload manual e **Refresh diagnostics**. Esperado sob cobertura suficiente: evento aceito e três flags verdadeiros. Se o host não for concedido, registrar E2 como inconclusivo.
- **E3 — listener adicional**: na mesma instância com host concedido, clicar **Register diagnostic listener**, confirmar `additionalListenerRegistered: true`, reiniciar contadores e observação, recarregar e atualizar. Registrar contadores de ambos. Clicar **Remove diagnostic listener**, confirmar `false`, reiniciar contadores e observação e repetir. Esperado: listener adicional conta apenas quando registrado; comparar a entrega ao principal nas duas condições, sem presumir o resultado.
- **E4 — registro em nova instância com host já concedido**: sem revogar o host, anotar a instância, encerrar o worker como na preparação, reabrir a fixture e clicar no ícone. Confirmar novo `instanceId`, `hostGranted: true` e listener adicional ausente. Iniciar observação, recarregar e atualizar. Esperado sob cobertura suficiente: evento aceito e três flags verdadeiros. Se host ou reinício não forem confirmados, E4 é inconclusivo.

Preencher para cada tentativa uma linha: `tentativa | E1 probe/evento | E2 host/evento | E3 principal/adicional | E4 novo worker/host/evento | divergências`. A ocorrência anterior não substitui as três tentativas instrumentadas. A versão do Chrome, aviso de permissão e instâncias devem acompanhar o registro.

### Relatos manuais instrumentados — tentativa preliminar

O responsável forneceu os diagnósticos abaixo; não foram informados E3 nem três repetições independentes. Os identificadores de instância eram diferentes nos quatro relatos, o que comprova instâncias distintas nos instantâneos, mas não identifica por si só o motivo das mudanças.

| Cenário relatado | Condições observadas | Resultado e classificação |
|---|---|---|
| E1 | `hostGranted: true`, probe `succeeded`, listener principal registrado, observação ativa, listener adicional ausente | Zero eventos e observação nula no instantâneo. **Inconclusivo como E1**: a condição de host opcional não concedido não estava satisfeita. |
| E2 | `hostGranted: true`, nova instância, sem aba selecionada, observação inativa | Painel informou `No tab selected by extension icon`; zero eventos. **Inconclusivo como E2**: a observação não foi iniciada e a instância não era a mesma do relato de E1. |
| E4 | `hostGranted: true`, outra instância, sem aba selecionada, observação inativa | Painel informou `No tab selected by extension icon`; zero eventos. **Inconclusivo como E4**: não havia alvo selecionado para iniciar a observação. |
| E8 | `hostGranted: true`, outra instância, aba selecionada e observação ativa no instantâneo | Um evento recebido e rejeitado como `not_observing`; observação nula. **Inconclusivo como E8**: não houve resposta aceita com flags de headers. O contador pode incluir evento anterior ao início da observação; a ordem exata não foi informada. |

Esses relatos não demonstram perda espontânea do worker nem estabelecem a causa da ausência de eventos. A instrumentação deve ser zerada imediatamente antes de cada coleta e os estados de permissão, instância e alvo conferidos nas etapas anterior e posterior ao reload. Se uma instância mudar entre E1 e E2, ou o painel informar ausência de aba selecionada, registrar a tentativa como inconclusiva e recomeçar a sequência com as condições necessárias.

Em nova tentativa relatada de E1, o instantâneo mostrou `hostGranted: false`, mas `probe: not_tested`, `tabSelected: false` e `observing: false`. Um evento foi recebido e rejeitado por `not_observing`; a saída não estabelece em que ponto da sequência ele ocorreu. A mensagem textual anterior do painel ainda dizia `Observing`, apesar do diagnóstico atualizado indicar estado inativo. A mensagem de ação não é sincronizada automaticamente com o estado após reinicialização; o JSON consultado é o estado da instância identificada naquele momento. Sem o `instanceId` anterior não é possível confirmar se houve reinício durante a tentativa. A tentativa é inconclusiva para E1.

**E1 instrumentado, tentativa válida 1/3:** com DevTools do service worker aberto, o responsável relatou antes do reload `hostGranted: false`, probe `succeeded`, aba selecionada, observação ativa e zero eventos. Após reload manual, a mesma instância apresentou um evento recebido e aceito, sem rejeições, com CSP/HSTS/XFO presentes, `headersAvailable`, `tabIdAvailable` e `requestIdAvailable` verdadeiros e `documentIdAvailable` falso. O listener adicional permaneceu ausente. O resultado demonstra captura nessa tentativa com o host opcional não concedido no instantâneo; ainda não demonstra reprodutibilidade nem explica os resultados divergentes anteriores. Permanecem necessárias mais duas tentativas independentes, E2–E4 e os demais gates humanos.

**E1 instrumentado, tentativa válida 2/3:** em nova instância, com DevTools aberto, `hostGranted: false`, probe `succeeded`, aba selecionada, observação ativa e nenhum evento antes do reload, o responsável recarregou manualmente. Na mesma instância, um evento foi recebido e aceito, nenhum rejeitado, listener adicional ausente e CSP/HSTS/XFO presentes; `headersAvailable`, `tabIdAvailable` e `requestIdAvailable` eram verdadeiros e `documentIdAvailable` falso. Resultado: 2/2 tentativas válidas de E1 com captura; falta a terceira repetição independente.

**E1 instrumentado, tentativa válida 3/3:** outra instância, com DevTools aberto, iniciou com `hostGranted: false`, probe `succeeded`, listener adicional ausente, aba selecionada, observação ativa e zero eventos. Após reload manual, a mesma instância registrou um evento recebido e aceito, sem rejeições, CSP/HSTS/XFO presentes, `headersAvailable`, `tabIdAvailable` e `requestIdAvailable` verdadeiros e `documentIdAvailable` falso. Resultado: 3/3 tentativas válidas com captura nas condições controladas e DevTools aberto; isto não demonstra comportamento durante suspensão natural do worker.

**E2 instrumentado, tentativa 1/3:** após E1, na mesma instância, o responsável relatou `hostGranted: true`, listener principal registrado e adicional ausente. Após reiniciar contadores/observação e recarregar manualmente, um evento foi recebido e aceito, com os três headers presentes e `documentIdAvailable: false`. O array `permissionEvents` estava vazio no instantâneo posterior ao reset; como o reset apaga esses eventos, isso não demonstra ausência de evento de concessão. A resposta foi capturada nessa sequência, mas o resultado de `onAdded` antes do reset não foi informado; a observação não comprova o comportamento do evento de permissão. As outras duas repetições permanecem pendentes.

**E2 instrumentado, tentativa válida 2/3:** na mesma instância da segunda tentativa de E1, o responsável informou `hostGranted: true`, listener adicional ausente e observação ativa. Após iniciar nova observação e recarregar manualmente, um evento foi recebido e aceito, com CSP/HSTS/XFO presentes, `headersAvailable`, `tabIdAvailable` e `requestIdAvailable` verdadeiros e `documentIdAvailable` falso. O histórico de `permissionEvents` foi zerado antes do instantâneo, portanto o evento de concessão não foi avaliado. Resultado: captura em 2/2 tentativas válidas de E2; falta uma repetição independente.

**E2 instrumentado, tentativa válida 3/3:** na mesma instância da terceira tentativa de E1, `hostGranted` passou de falso para verdadeiro e `permissionEvents` registrou `host_added`. Após nova observação e reload manual, o listener principal recebeu e aceitou um evento, com o listener adicional ausente, os três headers presentes, `headersAvailable`, `tabIdAvailable` e `requestIdAvailable` verdadeiros e `documentIdAvailable` falso. Resultado: 3/3 tentativas válidas com captura após concessão nas condições testadas; o evento de concessão foi observado na terceira tentativa.

**E3 instrumentado, tentativa 1/3:** na mesma instância de E1/E2, com host concedido e listener adicional registrado, ambos os listeners receberam e aceitaram um evento; o resultado apresentou os três headers presentes e `documentIdAvailable: false`. Após remover o listener adicional e reiniciar contadores e observação, o listener principal voltou a receber e aceitar um evento; o adicional permaneceu registrado como ausente e com contadores zerados. Nesta tentativa, a entrega ao listener principal ocorreu nas duas condições; isso difere da sequência preliminar relatada e não determina a causa da inconsistência. Permanecem duas repetições independentes.

**E3 instrumentado, tentativa válida 2/3:** na mesma instância da segunda sequência E1/E2, com host concedido e listener adicional registrado, cada listener recebeu e aceitou um evento; os três headers estavam presentes e `documentIdAvailable` era falso. Após remover o adicional e reiniciar contadores e observação, o listener principal voltou a receber e aceitar um evento, enquanto o adicional permaneceu ausente e com contadores zerados. Resultado: 2/2 comparações válidas com captura nas duas condições; falta uma repetição independente.

**E3 instrumentado, tentativa válida 3/3:** na mesma instância da terceira sequência E1/E2, com host concedido e listener adicional registrado, cada listener recebeu e aceitou um evento. Após remover o adicional e reiniciar contadores e observação, o listener principal voltou a receber e aceitar um evento, com o adicional ausente e seus contadores zerados. Em ambas as condições, os três headers estavam presentes e `documentIdAvailable` era falso. Resultado: 3/3 comparações manuais válidas com captura pelo listener principal nas duas condições, com DevTools aberto.

**E4 instrumentado, tentativa preliminar inconclusiva:** após a parada solicitada, o primeiro instantâneo mostrou uma instância nova, host concedido, listener principal registrado, listener adicional ausente e aba selecionada. O instantâneo posterior apresentou outra instância, host ainda concedido, aba não selecionada e observação inativa; o painel informou `No tab selected by extension icon`. Um evento foi entregue ao listener e rejeitado por `not_observing`. A mudança de instância demonstra que os dois instantâneos não pertenciam ao mesmo ciclo do worker, mas não determina exatamente quando ou por que o worker anterior parou. Como não havia observação ativa, não se pode concluir se E4 capturaria a resposta. O comportamento é consistente com estado de seleção armazenado apenas em memória; não comprova tratamento seguro de interrupção no produto.

**E4 instrumentado, tentativa válida 1/3:** após a tentativa preliminar inconclusiva, o responsável relatou captura em outra instância, com host concedido, listener adicional ausente, aba selecionada e observação ativa. Um evento foi recebido e aceito, com os três headers presentes, `headersAvailable`, `tabIdAvailable` e `requestIdAvailable` verdadeiros e `documentIdAvailable` falso. O responsável confirmou que o ID da instância era o mesmo e que o host já estava concedido antes do reload; o JSON anterior não foi fornecido. O resultado conta como a primeira tentativa manual controlada, com essa evidência por confirmação verbal, e não explica por si só os casos anteriores. Permanecem duas repetições independentes.

**E4 instrumentado, tentativa válida 2/3:** antes do reload, o responsável forneceu diagnóstico de nova instância, diferente da usada em E1–E3 da segunda sequência, com `hostGranted: true`, listener principal registrado, adicional ausente e aba selecionada. Após iniciar a observação e recarregar manualmente, o diagnóstico da mesma instância mostrou um evento recebido e aceito, três headers presentes, `headersAvailable`, `tabIdAvailable` e `requestIdAvailable` verdadeiros e `documentIdAvailable` falso. Resultado: 2/2 tentativas válidas de E4 com captura; falta uma repetição independente.

**E4 instrumentado, tentativa válida 3/3:** em uma nova instância, com DevTools aberto, host já concedido, listener principal registrado, adicional ausente e aba selecionada, o estado antes do início tinha zero eventos. Após iniciar a observação e recarregar manualmente, a mesma instância recebeu e aceitou um evento com os três headers presentes; `headersAvailable`, `tabIdAvailable` e `requestIdAvailable` eram verdadeiros e `documentIdAvailable` falso. Resultado: 3/3 tentativas válidas com captura nas condições testadas, com DevTools aberto.

**E5 instrumentado, tentativa válida 1:** na mesma instância de E4, com DevTools aberto, o responsável parou a observação, zerou os contadores e revogou o host. O painel indicou remoção concluída, `hostGranted: false` e `permissionEvents: ["host_removed"]`. Após novo gesto no ícone, probe `succeeded`, início da observação e reload manual, a mesma instância manteve `hostGranted: false` e `host_removed`, recebeu e aceitou um evento, sem rejeições, com CSP/HSTS/XFO presentes, `headersAvailable`, `tabIdAvailable` e `requestIdAvailable` verdadeiros e `documentIdAvailable` falso. A captura após o gesto é compatível com `activeTab` e não contradiz a revogação do host opcional. Resultado: revogação e captura após novo gesto comprovadas nessa tentativa, não comportamento após negação.

**E6 instrumentado, tentativa válida 1:** em perfil Chrome novo, o responsável relatou que o diálogo foi apresentado e a permissão opcional foi negada. O painel indicou `Optional local host permission: denied` e `hostGranted: false`. Após abrir DevTools e novo gesto no ícone, o responsável relatou probe `succeeded`, host ainda não concedido e, após reload manual, um evento recebido e aceito com CSP/HSTS/XFO presentes; `headersAvailable`, `tabIdAvailable` e `requestIdAvailable` verdadeiros e `documentIdAvailable` falso. O diagnóstico após o reload era de outra instância do worker; o resultado demonstra captura após negação no mesmo perfil, não continuidade da instância. A ausência de `permissionEvents` não significa falha, pois a permissão não foi concedida nem removida. Resultado: 1/1 tentativa válida de negação e captura após novo gesto, nas condições relatadas.

### Validação adicional de E1 sem DevTools — GO condicionado

Após o GO condicionado do responsável, foi solicitada uma verificação manual adicional com DevTools do service worker fechado, sem polling automático, host opcional não concedido, gesto real no ícone e apenas o listener principal. A primeira preparação apresentada não tinha aba selecionada nem observação ativa e foi inconclusiva; o responsável selecionou novamente a aba da fixture pelo ícone.

Na tentativa válida, o diagnóstico anterior ao reload mostrou `hostGranted: false`, probe `succeeded`, listener principal registrado, adicional ausente, aba selecionada, observação ativa, zero eventos e `observation: null`. Após reload manual de `/with-headers`, o diagnóstico apresentou a mesma instância, um evento recebido e aceito, nenhuma rejeição e os três headers presentes; `headersAvailable`, `tabIdAvailable` e `requestIdAvailable` verdadeiros e `documentIdAvailable` falso. A versão manual informada é Google Chrome 157.0.8103.78, versão oficial x86_64. Esta é **uma** tentativa válida adicional sem DevTools; não demonstra suspensão natural do worker nem elimina a divergência preliminar.

### Demais cenários manuais

- **E5 — revogação**: em instância com host `true`, clicar **Revoke optional local host**, atualizar e verificar `false` e eventual `host_removed`; sem reiniciar worker, clicar no ícone da fixture, executar probe, iniciar observação e recarregar. Registrar evento e limites: o gesto pode conceder `activeTab` apesar da revogação.
- **E6 — negação**: em perfil limpo sem host, solicitar host e negar no diálogo. Confirmar `hostGranted: false`, e depois executar gesto, probe, iniciar e recarregar. Se não houver diálogo ou não for possível negar, cenário inconclusivo; o Chrome pode reconceder sem novo diálogo uma permissão previamente aprovada.
- **E7 — abas**: selecionar aba A, reiniciar contadores e iniciar observação. Abrir B e recarregá-la sem clicar no ícone; atualizar diagnósticos e verificar rejeição `different_tab` se o evento for entregue, sem observação aceita. Voltar à A, recarregar e atualizar; só ela pode produzir observação aceita. Repita com e sem host concedido; eventos não entregues não provam filtragem.
- **E8 — headers ausentes**: em condição que capturou a fixture, abrir `/no-headers`, clicar no ícone, iniciar observação e recarregar. Atualizar: resposta observada, `headersAvailable: true` e as três flags `false` são esperadas.
- **E9 — término do worker**: iniciar observação, copiar diagnósticos, fechar painel e DevTools e parar o worker pelo controle de teste; confirmar parada. Reabrir o painel e atualizar. Novo `instanceId`, ausência de aba selecionada e observação inativa são esperados; não tratar como retomada segura do produto. Registrar impossibilidade de confirmação como inconclusiva.

Registrar resultados e divergências para revisão humana. Nenhum cenário manual novo foi considerado aprovado somente pela automação.

## Decisões, limitações e impacto em T021

A presença dos headers foi demonstrada no cenário automatizado local com host obrigatório na cópia de teste e nas tentativas manuais relatadas de E1–E4. Em E1, a captura com `activeTab` sem host opcional ocorreu em três instâncias independentes, com DevTools aberto; nenhuma decisão de permissão mínima de produto está aprovada. Uma origem real pode exigir padrão distinto e consentimento explícito; não generalizar o host de fixture.

O listener observado não trouxe `documentId` no cenário testado. T021 não pode supor associação por esse campo nesse evento; a correspondência segura com navegação/commit e descarte de eventos não associáveis precisa do SPIKE-004 e T024. Para T021, resposta não observada ou headers indisponíveis devem manter cobertura insuficiente e `NOT_EVALUATED` quando necessário; resultado com três flags falsas e headers disponíveis representa resposta observada sem os headers, não ausência de resposta. A avaliação efetiva dos valores de CSP/HSTS/XFO ainda não foi implementada nem comprovada. T021 permanece condicionada às aprovações de T009 e T013 e às demais dependências em `tasks.md`.

## Consolidação para revisão humana

**Parecer anterior: NO-GO temporário**, registrado antes das repetições e da validação de negação/revogação. **Parecer final: GO técnico limitado para T009, aprovado pelo responsável em 2026-11-27.** Os percentuais abaixo são descritivos de cenários e amostras pequenos, não estimativas de confiabilidade. Tentativas inválidas ou inconclusivas são informadas separadamente e não entram no denominador.

| Cenário | Tentativas válidas / êxitos | Escopo da evidência e limitações |
|---|---:|---|
| E1 — `activeTab`, host opcional ausente | 3 / 3 (100%) | Manual, DevTools aberto; probe e captura positivos. Há relatos anteriores sem captura ou com condições iniciais incompletas. Não comprova suspensão natural. |
| E2 — concessão depois do registro | 3 / 3 (100%) | Manual nas mesmas instâncias das respectivas tentativas de E1; captura com host `true`. Na terceira tentativa, `host_added` também foi observado. |
| E3 — listener adicional | 3 / 3 (100%) | Três comparações manuais com captura pelo principal tanto com quanto sem o adicional, com DevTools aberto; divergem da sequência preliminar. |
| E4 — nova instância, host concedido | 3 / 3 (100%) | Manual; a primeira com estado anterior confirmado verbalmente e as demais com instantâneos antes e depois, com DevTools aberto. Houve tentativa inconclusiva com mudança adicional de instância e perda de seleção. |
| E5 — revogação | 1 / 1 (100%) | Manual, na mesma instância, com `host_removed`, host `false` e captura após novo gesto no ícone; DevTools aberto. |
| E6 — negação | 1 / 1 (100%) | Manual, em perfil novo: diálogo negado, host `false` e captura após novo gesto; ocorreu mudança de instância entre a negação e a captura. |
| E7 — isolamento entre abas | 3 / 3 (100%) | Automatizado com host obrigatório somente na cópia descartável e seleção de aba por mecanismo de teste; sem gesto nativo. Não prova isolamento integral de navegações. |
| E8 — resposta sem headers | 3 / 3 (100%) | Automatizado na mesma condição restrita; tentativa manual relatada foi inconclusiva, sem resposta aceita. |
| E9 — término do worker | 3 / 3 (100%) | Automatizado por encerramento forçado: comprovada perda de estado e nova instância. Não demonstra suspensão natural nem interrupção segura do produto. |

Há evidência de `activeTab` sem host opcional em três tentativas independentes com DevTools aberto; isso não explica as divergências anteriores nem valida suspensão natural. A estratégia de menor privilégio a continuar avaliando é `activeTab` após gesto, observação passiva com `webRequest` e listener único registrado sincronamente, solicitando host exato opcional somente se necessário e mediante consentimento. A alternativa com host local obrigatório foi reproduzível apenas no manifesto temporário de teste e não é recomendação de permissão obrigatória para o produto. Nenhuma estratégia de permissão mínima de produto está comprovada como reproduzível em todas as condições aprovadas.

O manifesto experimental declara `activeTab`, `scripting`, `sidePanel` e `webRequest`, além do host local opcional; `scripting` viabiliza o probe e `sidePanel` a interface. Os experimentos não isolaram a necessidade de cada permissão nem permitem concluir que todas sejam mínimas para T021. A concessão opcional teve três capturas manuais positivas, com evento `host_added` observado na terceira. A revogação teve uma tentativa positiva com `host_removed`; na negação em perfil novo houve captura após novo gesto, com mudança de instância. A adição de um segundo listener não foi necessária nas três comparações controladas de E3, embora elas não eliminem o resultado preliminar divergente. Não adotar listener adicional nem reload de extensão como solução definitiva.

Critérios com evidência: resposta principal com headers observada e estado inicial não observado distinto em ensaios controlados; sem reload automático ou requisição ativa no código experimental; eventos sanitizados e filtragem exercitados dentro dos limites acima; uma revogação com evento sanitizado e captura após novo gesto; uma negação em perfil novo seguida de captura após novo gesto. A versão manual foi confirmada pelo responsável. A sequência preliminar divergente permanece sem causa comprovada; o resultado em três tentativas com DevTools aberto é reproduzível somente nessas condições, e o teste de E9 não comprova interrupção segura ou suspensão natural. O GO não elimina essas limitações nem aprova implementação definitiva. T009 foi aprovada pelo responsável; T021 permanece sujeita à aprovação de T013 e às demais dependências; T024/T025 e SPIKE-004 são responsáveis pela identidade e isolamento do ciclo real.

## Decisões aprovadas após a validação adicional

O responsável concedeu GO condicionado à validação adicional sem DevTools, que teve resultado positivo na tentativa acima. Para planejamento da coleta de headers, respeitando os checkpoints e dependências existentes:

- Priorizar `activeTab` após gesto real no ícone e usar um único listener `webRequest` registrado sincronamente durante a inicialização do service worker.
- Não exigir host obrigatório para essa coleta nem solicitar host opcional preventivamente. Se o acesso necessário não estiver disponível, manter a cobertura insuficiente; qualquer eventual solicitação de host exato depende de necessidade demonstrada e consentimento do usuário.
- Não adotar o listener adicional de diagnóstico nem depender de recarregamento da extensão. A página continua sujeita apenas a reload manual solicitado ao usuário quando necessário.
- Manter `NOT_EVALUATED` quando faltar evidência necessária e não presumir disponibilidade de `documentId` no evento de headers.
- Deixar a associação segura entre navegação, documento e evidências, e a interrupção segura após suspensão/reinício do worker, ao SPIKE-004 e às tarefas de integração correspondentes.

**Limitações preservadas:** amostras reduzidas; E1–E4 originais executados com DevTools aberto; uma única tentativa adicional sem DevTools; E7/E8 automatizados com manifesto descartável de host local obrigatório; E9 apenas com término forçado, não suspensão natural. Revogação do host opcional não equivale à revogação de `activeTab`. Presença de CSP, HSTS ou X-Frame-Options não comprova efetividade da política. A causa da divergência preliminar permanece desconhecida, e a estratégia não comprova identidade entre navegações ou comportamento em todas as origens e versões do Chrome.

**Verificação final após a validação manual:** na raiz, `pnpm test` passou com 61 testes, `pnpm run typecheck` e `pnpm run build` passaram. No spike, Vitest passou com 5 testes, `tsc --noEmit` e `wxt build` passaram. `tests/browser.mjs` repetiu três perfis por condição e passou nos controles, E7/E8 e término forçado de E9 com Chrome for Testing. A instrumentação de E7/E8 não equivale a gesto nativo ou permissão opcional. A aprovação explícita final do responsável foi concedida em 2026-11-27 e T009 foi marcada como concluída.

## Aprovação humana definitiva

Em 2026-11-27, após revisar os resultados consolidados E1–E9 e a validação adicional de E1 sem DevTools, o responsável concedeu GO definitivo para a conclusão de T009. A aprovação preserva todas as limitações e decisões acima, não autoriza distribuição ou implementação antecipada, e não substitui o checkpoint T013 nem os gates dos demais spikes.
