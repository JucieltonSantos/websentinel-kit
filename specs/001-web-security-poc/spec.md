# Especificação funcional: primeira versão do WebSentinelKit

**Diretório da funcionalidade**: `specs/001-web-security-poc`

**Criada em**: 2026-11-26

**Estado**: Rascunho para revisão

**Entrada**: descrição da PoC fornecida pelo usuário; constituição versão 2.1.0.

## Esclarecimentos

### Sessão 2026-11-26

- P: Como tratar o recarregamento manual durante a análise? → R: Quando necessário, aguardar o
  recarregamento manual e coletar apenas o novo documento, descartando evidências anteriores; outras
  navegações durante a coleta interrompem a análise.
- P: Qual lista inicial identifica potenciais cookies de sessão? → R: Correspondência exata, sem
  distinção entre maiúsculas e minúsculas, com `session`, `sessionid`, `jsessionid`, `phpsessid`,
  `asp.net_sessionid`, `sid`, `sess` e `connect.sid`.
- P: Como ocorre eventual download inicial do modelo local? → R: Somente após solicitação explícita
  do usuário; até sua disponibilidade, usar fallback determinístico. Inferência permanece local e
  dados da aplicação não são transmitidos durante download ou inicialização.
- P: Como apresentar a confiança de cada finding? → R: Exibir níveis separados de confiança na
  evidência e na interpretação do risco.
- P: Qual critério reconhece valor semelhante a JWT? → R: Três partes separadas por pontos; as duas
  primeiras são Base64URL decodificável contendo objetos JSON; a terceira pode estar vazia ou conter
  caracteres Base64URL. Não se verificam assinatura, validade ou finalidade de autenticação.
- P: Qual capacidade de IA é necessária para concluir a PoC? → R: Seu uso é opcional para o usuário;
  recuperação semântica e inferência local devem ser demonstradas para concluir US3 e a PoC integral.
  O fallback determinístico não substitui o RAG, e o scanner funciona sem IA.

## Cenários de usuário e testes

Público: desenvolvedores frontend e full stack, profissionais de Application Security e Web Security.
A PoC identifica riscos potenciais; ela não confirma vulnerabilidades nem comprova exploração.

### História 1 — Analisar uma aplicação (Prioridade: P1)

Como profissional de desenvolvimento ou segurança, quero iniciar uma análise passiva da aplicação
web que estou visitando para identificar riscos potenciais e entender o que não pôde ser avaliado.

**Por que esta prioridade**: entrega o objetivo central sem depender de IA.

**Teste independente**: iniciar uma análise na aplicação de demonstração e conferir resultados,
justificativas e estados das dez regras, inclusive com evidências indisponíveis.

**Cenários de aceitação**:

1. **Dado** que uma aplicação está aberta e as permissões necessárias foram concedidas, **quando**
   inicio uma análise no Side Panel, **então** acompanho seu andamento e recebo um resumo dos estados
   das dez regras e dos findings detectados.
2. **Dado** que um header necessário não foi observado, **quando** a respectiva regra é avaliada,
   **então** ela é marcada `NOT_EVALUATED` com justificativa, sem inferir segurança ou falha.
3. **Dado** um finding, **quando** o seleciono, **então** vejo evidência sanitizada, severidade,
   confiança, justificativa técnica e recomendação, apresentada como risco potencial.
4. **Dado** que uma permissão necessária foi negada ou uma evidência está indisponível, **quando**
   a análise termina, **então** os resultados possíveis permanecem visíveis e as regras afetadas
   informam `NOT_EVALUATED` e o motivo.
5. **Dado** que a resposta principal ainda não foi observada, **quando** a extensão solicitar
   recarregamento, **então** o usuário pode recarregar manualmente e a resposta da navegação e o novo
   documento são observados sem aproveitar evidências do anterior; a extensão não recarrega automaticamente.

### História 2 — Compreender riscos combinados (Prioridade: P2)

Como profissional de segurança, quero ver relações entre findings do mesmo contexto para entender
riscos combinados sem confundir correlação com comprovação de exploração.

**Por que esta prioridade**: contextualiza os resultados determinísticos da análise.

**Teste independente**: fornecer evidências de um dos pares previstos e verificar a correlação,
repetindo com contextos distintos e com uma condição ausente.

**Cenários de aceitação**:

1. **Dado** que as condições de uma correlação foram detectadas no mesmo contexto analisado,
   **quando** consulto os resultados, **então** vejo a relação, suas evidências sanitizadas e uma
   explicação do risco combinado.
2. **Dado** que uma condição está ausente, não foi avaliada ou pertence a outro contexto, **quando**
   os resultados são correlacionados, **então** essa relação não é apresentada como detectada.

### História 3 — Consultar remediação contextualizada (Prioridade: P3)

Como usuário, quero solicitar uma explicação de um finding e consultar suas fontes para avaliar o
impacto e as possíveis medidas de remediação, inclusive quando a IA estiver indisponível.

**Por que esta prioridade**: enriquece a interpretação sem condicionar a análise de segurança à IA.

**Teste independente**: solicitar uma explicação para um finding conhecido com IA disponível e
indisponível e conferir as referências, o fallback e a preservação do finding original.

**Cenários de aceitação**:

1. **Dado** um finding e IA local disponível, **quando** solicito explicação, **então** recebo
   contexto, impacto potencial, remediação e referências rastreáveis às fontes utilizadas.
2. **Dado** que a IA ou as fontes necessárias estão indisponíveis, **quando** solicito explicação,
   **então** recebo fallback determinístico com referências disponíveis e indicação da limitação.
3. **Dado** conteúdo da aplicação que contém instruções, **quando** uma explicação é solicitada,
   **então** esse conteúdo é tratado como dado não confiável e não como instrução à IA.
4. **Dado** que o modelo não está disponível, **quando** o usuário ainda não autorizou seu download,
   **então** a análise e o fallback funcionam sem iniciar download ou enviar dados da aplicação.
5. **Dado** que uma referência gerada não corresponde a fonte e versão utilizadas, **quando** a
   recomendação é validada, **então** a afirmação não é apresentada como fundamentada e o fallback
   apresenta a limitação e referências verificáveis disponíveis.

### Casos extremos

- Headers necessários não observados, incompletos ou inacessíveis: `NOT_EVALUATED`, com motivo.
- Contexto fora da aplicabilidade da regra: `NOT_APPLICABLE`, com motivo; isso não indica segurança.
- Permissão negada ou coleta parcial: avaliar apenas o que possui evidência suficiente e justificar
  as avaliações não realizadas. Não solicitar acesso além do necessário para a operação.
- Navegação não esperada durante a coleta interrompe a análise; resultados disponíveis são
  identificados como incompletos, sem combinar evidências de documentos ou navegações diferentes.
- Múltiplas evidências ou políticas: avaliar somente o comportamento efetivamente demonstrável;
  se a efetividade necessária não puder ser estabelecida, usar `NOT_EVALUATED`.
- Valores com formato semelhante a JWT, mas inválidos, não autenticadores ou não verificáveis:
  relatar apenas a estrutura observada, sem alegar validade criptográfica ou finalidade.
- Cookie com nome fora da lista: finalidade desconhecida, inclusive possível autenticação; não é
  classificado como candidato pela heurística, e essa limitação é informada ao usuário.
- Ausência de recurso aplicável, de fonte local ou de IA: indicar inaplicabilidade ou limitação
  conforme o caso; usar fallback para remediação quando necessário.

## Requisitos

### Requisitos funcionais

- **RF-001**: A extensão DEVE oferecer um único Chrome Side Panel, em inglês, para iniciar e
  acompanhar análise voluntária, visualizar resumo, findings, correlações e regras não avaliadas.
- **RF-002**: A análise DEVE ser passiva e não intrusiva, iniciada pelo usuário, limitada às
  evidências disponíveis nas permissões concedidas e ao contexto analisado. NÃO DEVE explorar
  vulnerabilidades nem enviar payloads de ataque.
- **RF-002a**: A observação de respostas começa após a solicitação do usuário. Se necessário, a
  extensão orienta o recarregamento manual e aguarda a nova navegação, descartando evidências do
  documento anterior, observando a resposta dessa navegação. Após iniciada a coleta do documento,
  outra navegação a interrompe e o resultado
  é indicado como incompleto. A extensão NÃO DEVE recarregar a página nem realizar requisições
  adicionais para testes de segurança.
- **RF-002b**: O contexto compreende somente o documento principal da aba escolhida, seu localStorage
  da origem principal, sessionStorage da aba e origem, cookies aplicáveis à URL e recursos externos
  por ele referenciados ou carregados. Documentos internos de iframes, outras abas e aplicações de
  outras origens NÃO DEVEM ser analisados. Recursos externos do documento principal permanecem no
  escopo sem que suas aplicações ou documentos sejam analisados. Evidências de análises, documentos
  ou navegações distintos NÃO DEVEM ser combinadas.
- **RF-003**: A análise DEVE avaliar exatamente as dez regras SEC-001 a SEC-010 e atribuir a cada
  uma `PASSED`, `FAILED`, `NOT_APPLICABLE` ou `NOT_EVALUATED`, com justificativa para os dois
  últimos estados. Uma regra com resultado misto DEVE ser `FAILED` se houver evidência suficiente
  de ao menos uma ocorrência; a cobertura parcial DEVE ser explicitada.
- **RF-004**: `FAILED` significa que uma condição de risco definida foi observada; `PASSED`, que as
  evidências necessárias e suficientes da cobertura disponível satisfazem a regra; `NOT_APPLICABLE`,
  que seu pré-requisito não se aplica; `NOT_EVALUATED`, que falta evidência ou capacidade necessária.
  Dados ausentes nunca comprovam ausência de risco. Headers necessários não observados exigem
  `NOT_EVALUATED`, salvo quando a regra for comprovadamente inaplicável.
  A precedência é: (1) `NOT_APPLICABLE` quando a inaplicabilidade é comprovada; (2) `FAILED` quando
  uma condição de risco aplicável é comprovada, mesmo com cobertura parcial; (3) `NOT_EVALUATED`
  quando faltam evidências para decidir; (4) `PASSED` somente com cobertura suficiente e nenhuma
  condição de risco prevista identificada. Cobertura parcial não impede `NOT_APPLICABLE` se as
  evidências ausentes forem irrelevantes para comprovar a inaplicabilidade.
- **RF-005**: Cada finding DEVE apresentar regra, evidência sanitizada, severidade, confiança,
  justificativa técnica e recomendação; deve ser descrito como risco potencial, não vulnerabilidade
  confirmada. Resultados idênticos sobre a mesma evidência DEVEM produzir a mesma classificação.
- **RF-005a**: Cada finding DEVE exibir separadamente o nível de confiança na evidência observada e o
  nível de confiança na interpretação do risco. A IA NÃO DEVE alterar qualquer dessas classificações
  nem a severidade.
- **RF-005b**: A severidade inicial é fixa por regra: baixa para SEC-010 e média para as demais. A
  confiança na evidência é alta quando a condição é diretamente observada e validada nos limites
  definidos pela regra; é média quando depende de interpretação de comportamento efetivo. A confiança
  na interpretação é baixa para SEC-005 a SEC-008, pois estrutura ou nome não provam finalidade; é
  média para as demais, pois o impacto depende do contexto. Essas classificações são determinísticas,
  não comprovam exploração e não são alteradas pela IA. Quando o comportamento necessário não puder
  ser estabelecido, aplicar `NOT_EVALUATED`, sem inventar nível de confiança de finding.
- **RF-006**: A coleta DEVE ser minimizada e dados sensíveis DEVEM ser sanitizados na origem, antes
  de comunicação entre componentes, armazenamento, exibição, logging ou processamento por IA.
  Credenciais, tokens e valores brutos de cookies NÃO DEVEM ser persistidos nem circular entre
  componentes. Dados sensíveis NÃO DEVEM ser transmitidos a serviços externos.
- **RF-006a**: As regras de cookie DEVEM identificar candidatos exclusivamente por correspondência
  exata do nome, sem distinção entre maiúsculas e minúsculas, à lista fechada `session`, `sessionid`,
  `jsessionid`, `phpsessid`, `asp.net_sessionid`, `sid`, `sess` e `connect.sid`. NÃO DEVEM usar IA
  nem valores de cookies para classificação. Nomes desconhecidos não são considerados seguros ou sem
  finalidade de autenticação; a limitação e os possíveis falsos positivos DEVEM ser informados.
- **RF-007**: A extensão DEVE avaliar as duas correlações definidas abaixo deterministicamente e
  somente com evidências do mesmo contexto; deve explicar os fatores relacionados e o risco potencial,
  sem afirmar exploração ou existência de XSS.
- **RF-008**: O usuário DEVE poder solicitar explicação contextualizada de um finding, incluindo
  impacto potencial, remediação e referências rastreáveis. A análise e a recomendação determinística
  DEVEM funcionar sem IA, com fallback quando a IA local ou as fontes necessárias não estiverem
  disponíveis; a limitação e quaisquer referências disponíveis DEVEM ser apresentadas.
- **RF-009**: O RAG local DEVE usar fontes confiáveis, versionadas e rastreáveis da base definida
  nesta especificação. Recomendações geradas por IA DEVEM identificar as fontes utilizadas. A IA NÃO
  DEVE criar findings, alterar sua severidade ou confiança, processar credenciais, tokens ou valores
  brutos de cookies, nem depender de serviços externos de inferência. Conteúdo de aplicações analisadas
  DEVE ser tratado como dado não confiável, nunca como instrução à IA.
  O uso da IA é opcional para o usuário, mas a capacidade de recuperação semântica e inferência local
  DEVE ser demonstrada para concluir US3 e a PoC integral; o fallback não substitui essa entrega.
- **RF-009a**: O eventual download inicial de modelo DEVE ocorrer somente mediante solicitação
  explícita do usuário. A análise central e o fallback determinístico DEVEM funcionar sem download
  ou modelo disponível. Inferência DEVE ser local; dados da aplicação NÃO DEVEM ser transmitidos
  durante download ou inicialização do modelo.
- **RF-009b**: O contexto do RAG DEVE conter apenas evidências sanitizadas e os cinco documentos
  confiáveis previstos. Antes da apresentação, cada referência gerada DEVE ser validada quanto à
  existência e à correspondência com documento e versão efetivamente utilizados. Se a referência
  não puder ser validada, NÃO apresentar a afirmação gerada como fundamentada; apresentar o fallback
  determinístico e a limitação, com referências verificáveis disponíveis.
- **RF-010**: A PoC DEVE incluir testes automatizados positivos, negativos e de borda para cada regra
  de segurança e testes automatizados das duas correlações, além de aplicação vulnerável mínima,
  executada localmente, para demonstração e validação.

### Catálogo das regras de segurança

As severidades abaixo são fixas para a PoC e as confianças seguem RF-005b; não afirmam impacto real.
A evidência descreve apenas metadados ou atributos sanitizados necessários; valores sensíveis nunca
são exibidos. `PASSED` só se aplica com evidência suficiente dentro da cobertura observada; `FAILED`
requer condição de detecção demonstrada. Os estados comuns de inaplicabilidade e falta de evidência
seguem RF-004. A cobertura não observada deve ser informada.

Para `PASSED`, a análise deve ter concluído a verificação de todas as evidências aplicáveis ao
documento principal disponíveis no instante da coleta, com permissões e leitura necessárias. Para
headers, exige-se observar a resposta principal correspondente; resposta observada sem header é
distinta de resposta não observada. Para armazenamento e cookies, exige-se leitura integral dos
itens aplicáveis e seus atributos necessários; para recursos, inspeção integral das referências
aplicáveis no documento durante a coleta. O resultado cobre essa observação, não recursos futuros,
outras origens ou uma garantia de ausência de risco. Falha de leitura ou cobertura parcial impede
`PASSED`; `NOT_APPLICABLE` continua possível quando a inaplicabilidade é comprovada e os dados
ausentes são irrelevantes. Uma ocorrência aplicável comprovada permite `FAILED` com cobertura parcial.

Para SEC-005 e SEC-006, a correspondência estrutural ocorre na origem sobre um valor completo com
exatamente três partes separadas por pontos: as duas primeiras são Base64URL decodificável para
objetos JSON; a terceira está vazia ou contém apenas caracteres Base64URL. Não se verifica assinatura,
validade ou finalidade. Apenas o resultado sanitizado dessa verificação pode sair da origem.

CSP Report-Only não é política aplicada. Políticas aplicadas de headers e meta tags são consideradas
somente nos limites em que cada mecanismo pode produzir efeito; múltiplas políticas aplicadas são
restritivas em conjunto. A PoC avalia somente os efeitos necessários às regras abaixo, sem pretensão
de analisar CSP completamente. Se sintaxe, interação, momento de aplicação ou suporte impedir a
determinação do efeito, usar `NOT_EVALUATED`.

#### SEC-001 — Ausência de Content Security Policy efetiva

- **Objetivo**: identificar ausência de proteção CSP efetiva no documento analisado.
- **Aplicabilidade e evidência**: documento web aplicável; políticas CSP observadas e seu efeito
  sobre o documento, apresentados de forma sanitizada.
- **Detecção**: com resposta principal e meta tags aplicáveis observadas, `FAILED` se não houver CSP
  aplicada; `PASSED` se houver ao menos uma política aplicada reconhecível. Uma política Report-Only
  não conta. A existência de política não certifica sua qualidade ou abrangência. Se sua aplicação
  não puder ser determinada, `NOT_EVALUATED`.
- **Severidade**: média; confiança conforme RF-005b.
- **Falsos positivos e limitações**: outras proteções podem reduzir impacto; política não observada
  ou cuja efetividade não possa ser determinada impede conclusão.
- **Aceitação**: documento com política efetiva resulta em `PASSED`; ausência demonstrada resulta
  em `FAILED`; efetividade indeterminável resulta em `NOT_EVALUATED`.

#### SEC-002 — CSP permitindo unsafe-eval

- **Objetivo**: identificar política efetiva que permita avaliação dinâmica de código.
- **Aplicabilidade e evidência**: documento com CSP efetiva avaliada; diretivas aplicáveis e presença
  sanitizada de `unsafe-eval` e seu efeito.
- **Detecção**: em cada política aplicada, usar `script-src` ou, quando ausente, `default-src`.
  `FAILED` quando o efeito conjunto das políticas permite `unsafe-eval`; `PASSED` quando ao menos
  uma política aplicada o bloqueia. Quando todas as políticas não restringem scripts, a ausência de
  diretiva não é tratada como ocorrência explícita de `unsafe-eval`: `NOT_APPLICABLE`. Sem CSP
  aplicada, `NOT_APPLICABLE`; comportamento indeterminado é `NOT_EVALUATED`.
- **Severidade**: média; confiança conforme RF-005b.
- **Falsos positivos e limitações**: permissões e múltiplas políticas podem interagir; o contexto pode
  ter proteções adicionais. Efeito não determinável resulta em `NOT_EVALUATED`.
- **Aceitação**: diretiva efetiva que permite em todas as políticas falha; uma política que bloqueia
  passa; somente Report-Only, ausência de CSP aplicada ou ausência de restrição de scripts resulta
  em `NOT_APPLICABLE`; efeito indeterminado não é avaliado.

#### SEC-003 — Ausência de Strict-Transport-Security

- **Objetivo**: identificar ausência de HSTS em contexto HTTPS aplicável.
- **Aplicabilidade e evidência**: resposta HTTPS aplicável observada e header HSTS sanitizado.
- **Detecção**: `FAILED` se a resposta observada não contém HSTS efetivo; `PASSED` se contém HSTS
  efetivo; contexto não HTTPS é `NOT_APPLICABLE`.
- **Severidade**: média; confiança conforme RF-005b.
- **Falsos positivos e limitações**: políticas herdadas ou pré-carregamento podem oferecer proteção;
  a resposta ausente ou efetividade indeterminada exige `NOT_EVALUATED`.
- **Aceitação**: resposta HTTPS com HSTS efetivo passa; ausência demonstrada falha; resposta não
  observada não é avaliada; contexto não HTTPS é inaplicável.

#### SEC-004 — Proteção contra clickjacking

- **Objetivo**: identificar ausência de proteção efetiva contra enquadramento indevido.
- **Aplicabilidade e evidência**: documento enquadrável aplicável; CSP `frame-ancestors` e
  `X-Frame-Options` observados e seu efeito, sanitizados.
- **Detecção**: `frame-ancestors` efetivo de CSP aplicada por header prevalece sobre
  `X-Frame-Options`; `frame-ancestors` em meta tag ou Report-Only não oferece essa proteção. Na
  ausência de `frame-ancestors` efetivo, avaliar `X-Frame-Options`. `FAILED` se o mecanismo aplicável
  não restringir enquadramento; `PASSED` se restringir; efeito indeterminado é `NOT_EVALUATED`.
- **Severidade**: média; confiança conforme RF-005b.
- **Falsos positivos e limitações**: enquadramento pode ser intencional; políticas, compatibilidade
  e respostas intermediárias podem alterar efeito. Evidência insuficiente exige `NOT_EVALUATED`.
- **Aceitação**: `frame-ancestors` efetivo prevalece mesmo se `X-Frame-Options` divergir; na sua
  ausência, `X-Frame-Options` efetivo restringindo enquadramento passa; ausência demonstrada de
  proteção falha; headers necessários não observados não são avaliados.

#### SEC-005 — Estrutura de JWT em localStorage

- **Objetivo**: indicar possível exposição a JavaScript de conteúdo com estrutura de JWT.
- **Aplicabilidade e evidência**: localStorage acessível no contexto; presença estrutural e localização
  sanitizada, sem valor ou partes do token.
- **Detecção**: `FAILED` se houver conteúdo com estrutura de JWT; `PASSED` se a área acessível e
  avaliada não contiver essa estrutura; indisponibilidade exige `NOT_EVALUATED`.
- **Severidade**: média; confiança conforme RF-005b.
- **Falsos positivos e limitações**: conteúdo pode não ser JWT válido nem token de autenticação;
  assinatura e finalidade não são verificadas; somente armazenamento acessível é coberto.
- **Aceitação**: estrutura presente falha; área avaliada sem estrutura passa; área inacessível não é
  avaliada; nenhuma parte do valor circula ou aparece na evidência.

#### SEC-006 — Estrutura de JWT em sessionStorage

- **Objetivo**: indicar possível exposição a JavaScript de conteúdo com estrutura de JWT.
- **Aplicabilidade e evidência**: sessionStorage acessível no contexto; presença estrutural e
  localização sanitizada, sem valor ou partes do token.
- **Detecção**: `FAILED` se houver conteúdo com estrutura de JWT; `PASSED` se a área acessível e
  avaliada não contiver essa estrutura; indisponibilidade exige `NOT_EVALUATED`.
- **Severidade**: média; confiança conforme RF-005b.
- **Falsos positivos e limitações**: conteúdo pode não ser JWT válido nem token de autenticação;
  assinatura e finalidade não são verificadas; somente armazenamento acessível é coberto.
- **Aceitação**: estrutura presente falha; área avaliada sem estrutura passa; área inacessível não é
  avaliada; nenhuma parte do valor circula ou aparece na evidência.

#### SEC-007 — Potencial cookie de sessão sem HttpOnly

- **Objetivo**: indicar possível acesso de scripts a cookie de sessão.
- **Aplicabilidade e evidência**: cookies observáveis e metadados suficientes para identificar um
  potencial cookie de sessão e verificar `HttpOnly`; sem valores brutos.
- **Detecção**: `FAILED` se um potencial cookie de sessão não tiver `HttpOnly`; `PASSED` se todos os
  candidatos observados o tiverem; ausência comprovada de candidatos é `NOT_APPLICABLE`.
- **Severidade**: média; confiança conforme RF-005b.
- **Falsos positivos e limitações**: a classificação de sessão é heurística e pode estar errada;
  cookies não observados e classificação ou atributo indetermináveis limitam a conclusão.
- **Aceitação**: candidato sem atributo falha; candidatos com atributo passam; nenhum candidato
  comprovado é inaplicável; evidência insuficiente não é avaliada.

#### SEC-008 — Potencial cookie de sessão sem Secure

- **Objetivo**: indicar potencial envio inseguro de cookie de sessão.
- **Aplicabilidade e evidência**: cookies observáveis e metadados suficientes para identificar um
  potencial cookie de sessão e verificar `Secure`; sem valores brutos.
- **Detecção**: `FAILED` se um potencial cookie de sessão não tiver `Secure`; `PASSED` se todos os
  candidatos observados o tiverem; ausência comprovada de candidatos é `NOT_APPLICABLE`.
- **Severidade**: média; confiança conforme RF-005b.
- **Falsos positivos e limitações**: a classificação de sessão é heurística e pode estar errada;
  cookies não observados e classificação ou atributo indetermináveis limitam a conclusão.
- **Aceitação**: candidato sem atributo falha; candidatos com atributo passam; nenhum candidato
  comprovado é inaplicável; evidência insuficiente não é avaliada.

#### SEC-009 — Mixed Content

- **Objetivo**: identificar exposição a conteúdo inseguro em página segura.
- **Aplicabilidade e evidência**: página HTTPS e referências ou carregamentos observados de recursos
  HTTP; identificar recurso de forma sanitizada e distinguir tentativa de carregamento efetivo quando
  observável. Links comuns de navegação não são recursos desta regra.
- **Detecção**: `FAILED` se houver referência ou tentativa observada de conteúdo HTTP em contexto
  HTTPS; `PASSED` se a cobertura necessária estiver disponível e não houver ocorrência;
  contexto não HTTPS é `NOT_APPLICABLE`. A evidência DEVE distinguir referência, tentativa,
  carregamento efetivo, bloqueio ou atualização quando observados, sem inferir estados desconhecidos.
- **Severidade**: média; confiança conforme RF-005b.
- **Falsos positivos e limitações**: o navegador pode bloquear ou atualizar o recurso; referência não
  comprova carregamento nem exploração. Recursos não observados ficam fora da cobertura.
- **Aceitação**: ocorrência observada falha com seu estado quando conhecido; cobertura suficiente
  sem ocorrência passa; contexto não HTTPS é inaplicável; cobertura insuficiente não é avaliada.

#### SEC-010 — Script externo sem Subresource Integrity

- **Objetivo**: identificar scripts externos aplicáveis sem verificação de integridade declarada.
- **Aplicabilidade e evidência**: elementos de script do documento principal com `src` HTTP ou
  HTTPS de origem diferente da origem principal e presença de atributo de integridade, identificados
  de forma sanitizada. Scripts inline, de mesma origem e de documentos em iframes estão fora da regra.
- **Detecção**: `FAILED` se um script externo aplicável não declarar integridade; `PASSED` se todos
  os scripts aplicáveis observados a declararem; ausência comprovada de scripts aplicáveis resulta
  em `NOT_APPLICABLE`. Presença significa atributo `integrity` não vazio; isso não comprova que o
  navegador validou a integridade nem que o valor corresponde ao recurso.
- **Severidade**: baixa; confiança conforme RF-005b.
- **Falsos positivos e limitações**: integridade pode não ser viável para recurso mutável; declaração
  não comprova conteúdo seguro ou validação efetiva; scripts não observados não são cobertos.
- **Aceitação**: script aplicável sem atributo falha; todos com atributo passam; nenhum aplicável é
  inaplicável; cobertura ou aplicabilidade indeterminada não é avaliada.

### Correlações determinísticas

- **COR-001**: `FAILED` em SEC-001 ou SEC-002 associado a `FAILED` em SEC-005 ou SEC-006 no mesmo
  contexto gera correlação de CSP ausente ou enfraquecida com conteúdo de estrutura JWT acessível a
  JavaScript. A explicação indica os dois fatores e o possível impacto combinado, sem afirmar XSS,
  validade do token ou exploração.
- **COR-002**: `FAILED` em SEC-001 ou SEC-002 associado a `FAILED` em SEC-007 no mesmo contexto gera
  correlação de CSP ausente ou enfraquecida com potencial cookie de sessão sem HttpOnly. A explicação
  indica os dois fatores e o possível impacto combinado, sem afirmar XSS ou exploração.
- Para ambas, somente evidências positivas de condições relacionadas no mesmo contexto contam;
  `PASSED`, `NOT_APPLICABLE` e `NOT_EVALUATED` não comprovam a condição. A correlação não substitui
  os findings de origem nem altera sua severidade ou confiança.

### Requisitos não funcionais e limites

- **RNF-001**: A operação central DEVE ser local-first, sem backend próprio, banco de dados externo
  ou infraestrutura obrigatória em nuvem; a inferência, quando usada, é local.
- **RNF-002**: A extensão DEVE solicitar somente permissões do navegador necessárias à operação.
- **RNF-003**: A PoC NÃO DEVE incluir autenticação de usuários, histórico persistente de análises,
  exportação de relatórios, análise de CVEs ou integração com pipelines CI/CD.
- **RNF-004**: A arquitetura DEVE ser transparente, os builds reproduzíveis e a documentação clara;
  limitações e compensações de segurança DEVEM ser documentadas. README em português e inglês.
- **RNF-005**: A aplicação de demonstração DEVE ser mínima e executada localmente; nenhuma
  funcionalidade adicional ou expansão do escopo é autorizada por esta especificação.

### Entidades principais

- **Contexto analisado**: aplicação e contexto da análise aos quais evidências e resultados pertencem.
- **Análise**: operação iniciada pelo usuário, com andamento, cobertura e resultados das dez regras.
- **Evidência sanitizada**: fato observado, sem dados sensíveis brutos, com origem e limitação úteis.
- **Avaliação de regra**: regra, estado, justificativa e evidências disponíveis no contexto.
- **Finding**: risco potencial detectado, com evidência, severidade, níveis separados de confiança na
  evidência e na interpretação do risco, justificativa e recomendação.
- **Correlação**: relação determinística entre condições de findings do mesmo contexto e sua explicação.
- **Fonte de conhecimento**: documento OWASP identificado por título e versão rastreável.
- **Recomendação**: remediação determinística ou explicação opcional por IA com referências.

## Critérios de sucesso

### Resultados mensuráveis

- **CS-001**: Em todos os cenários de aceitação da análise, o usuário consegue iniciar a operação,
  acompanhar seu andamento e consultar o estado de cada uma das dez regras.
- **CS-002**: Em 100% dos findings verificados nos testes de aceitação, estão disponíveis evidência
  sanitizada, severidade, confiança, justificativa e recomendação, sem alegação de vulnerabilidade
  confirmada.
- **CS-003**: Os testes positivos, negativos e de borda de cada uma das dez regras e os testes das
  duas correlações passam, incluindo evidência ausente e separação de contextos.
- **CS-004**: Nos cenários de IA disponível e indisponível, o usuário consegue consultar remediação
  para o finding; recomendações por IA apresentam fontes e o fallback informa suas limitações.
- **CS-005**: Nos cenários de privacidade testados, nenhum valor bruto de credencial, token ou cookie
  aparece nas evidências exibidas, em armazenamento, logs ou comunicação entre componentes.
- **CS-006**: A demonstração local permite observar ao menos um finding e uma correlação previstos,
  bem como consultar os motivos das regras não avaliadas quando suas evidências forem indisponíveis.

## Premissas, dependências e limitações

- A base contém exatamente os cinco documentos OWASP Cheat Sheet Series: Content Security Policy,
  Session Management, Cross Site Scripting Prevention, HTML5 Security e Third Party JavaScript
  Management. Suas versões e referências devem ser identificáveis; disponibilidade local é uma
  dependência do RAG e das recomendações que os utilizam.
- Um contexto analisado corresponde à mesma análise, aba, navegação e documento principal definidos
  em RF-002b. Evidências de outra análise, documento ou navegação nunca são correlacionadas.
- As classificações de severidade e confiança seguem RF-005b. `PASSED` limita-se
  à cobertura efetivamente observada e não representa certificação de segurança.
- A análise depende das permissões concedidas e da observação disponível durante a operação. Uma
  resposta anterior ao início da análise pode não estar disponível; não se presume sua observação.
- A lista de cookies é limitada: nomes desconhecidos podem ser de autenticação e nomes conhecidos podem
  não representar sessão. A cobertura de recursos é uma fotografia, não monitoramento contínuo.
