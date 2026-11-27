# SPIKE-001 — Compatibilidade da stack

**Data**: 2026-11-26  
**Estado**: critérios do SPIKE-001 atendidos; T008 concluída com as limitações documentadas. A validação manual foi informada pelo responsável pelo projeto e a revisão técnica das licenças foi registrada em `docs/dependencies.md`. O protótipo está isolado em `spikes/001-stack/` e não implementa análise de segurança nem RAG. A distribuição requer a inclusão e verificação dos avisos de terceiros identificados.

## Ambiente e dependências

- Node.js 24.14.0; npm 11.9.0; pnpm 11.1.2.
- Google Chrome instalado: 157.0.8103.78. Chrome for Testing do Playwright: 159.0.8154.6, em diretório temporário `/tmp/websentinel-playwright-browsers`.
- WXT 0.21.5; `@wxt-dev/module-react` 1.2.2; React e React DOM 19.3.1; TypeScript 7.0.2; Tailwind CSS e `@tailwindcss/vite` 4.3.5; Zod 4.6.7; Vitest 5.1.2; `@playwright/test` 1.65.1; tipos de Chrome 0.3.8, Node 26.6.11, React 19.3.3 e React DOM 19.3.0.
- Versões exatas constam no `package.json` e no `pnpm-lock.yaml` do spike. As licenças declaradas dos pacotes diretos estão em `docs/dependencies.md`; o inventário transitivo automatizado apontou MIT (124), Apache-2.0 (8), ISC (9), BSD-2-Clause (8), BSD-3-Clause (3), BlueOak-1.0.0 (1) e MPL-2.0 (2). Os dois pacotes MPL-2.0 são `lightningcss` e `lightningcss-linux-x64-gnu` 1.33.0. São declarações de metadados, não conclusão jurídica ou de conformidade de distribuição.
- A instalação foi local no spike, com store pnpm em `/tmp/websentinel-spike-pnpm-store`. O download do Chrome for Testing e auxiliares ficou em `/tmp`, sem instalação global. A disponibilidade desses diretórios temporários não é garantida após reinício.

## Comandos e resultados

Executados em `spikes/001-stack/`, salvo indicação contrária:

| Comando | Resultado |
|---|---|
| `npm view <pacote> version license --json` | Consulta ao registro das versões e licenças diretas. A tentativa inicial no sandbox falhou por DNS; consulta posterior com rede autorizada passou. |
| `pnpm install --store-dir /tmp/websentinel-spike-pnpm-store` | Passou; dependências instaladas localmente e `wxt prepare` executado. Repetido após incluir os tipos necessários. |
| `pnpm run typecheck` | Passou no estado final. Foram corrigidas configurações iniciais ausentes de JSX e tipos Chrome/Node. |
| `pnpm test` | Passou: um arquivo, dois testes Vitest de validação Zod. Inicialmente, a seleção ampla de testes incluiu indevidamente o arquivo Playwright; o script foi corrigido. |
| `pnpm run build` | Passou para Chrome MV3, com WXT 0.21.5 e Vite 8.3.8; saída `.output/chrome-mv3/`. |
| Dois builds seguidos e comparação de `sha256sum` | Os cinco arquivos gerados tiveram hashes idênticos nas duas execuções no mesmo ambiente. Isso não comprova reprodutibilidade em máquina ou ambiente limpo. |
| `pnpm install --offline --frozen-lockfile --store-dir /tmp/websentinel-spike-pnpm-store` e `pnpm run build` em cópia limpa sob `/tmp` | Passaram; os cinco hashes coincidiram com o build original. A cópia usou o mesmo sistema, versões e store já populado, portanto não demonstra reprodução em outra máquina ou reconstrução do store. |
| `pnpm licenses list --json --config.store-dir=/tmp/websentinel-spike-pnpm-store` | Inventário dos metadados de licenças diretas e transitivas concluído; revisão das obrigações permanece pendente. |
| `PLAYWRIGHT_BROWSERS_PATH=/tmp/websentinel-playwright-browsers pnpm exec playwright install chromium` | Chrome for Testing, FFmpeg e headless shell baixados para `/tmp`. |
| `PLAYWRIGHT_BROWSERS_PATH=/tmp/websentinel-playwright-browsers pnpm run test:browser` | Passou: um teste em Chromium headless detectou o Service Worker e renderizou `sidepanel.html` diretamente. O teste não abre o Side Panel na interface do navegador nem cobre navegação de aplicações. |

Na primeira tentativa automatizada com Google Chrome instalado, o sandbox bloqueou o processo (`setsockopt: Operation not permitted`); com acesso ao sistema o navegador iniciou, mas o Service Worker não foi observado antes do timeout de 20 segundos. Isso não identifica a causa do timeout. O sucesso posterior usa o Chrome for Testing do Playwright, não prova compatibilidade do Google Chrome instalado com o mesmo fluxo automatizado. O Playwright usou o navegador em modo headless e suas opções de teste incluem `--no-sandbox`; isso não é configuração proposta para produção.

A tentativa `pnpm licenses list --json` sem o store correto falhou por índice de pacote ausente; a tentativa com opção de store não suportada também falhou. A consulta posterior com `--config.store-dir` produziu o inventário resumido acima; ela não verifica por si só as obrigações das licenças.

## Manifesto gerado

Arquivo `.output/chrome-mv3/manifest.json`:

```json
{
  "manifest_version": 3,
  "name": "WebSentinelKit Stack Spike",
  "description": "Isolated stack compatibility experiment.",
  "version": "0.0.0",
  "action": { "default_title": "Open stack spike" },
  "permissions": ["sidePanel"],
  "background": { "service_worker": "background.js" },
  "side_panel": { "default_path": "sidepanel.html" }
}
```

Não há permissões de host nem permissões de coleta. O manifesto não define CSP própria: aplica-se a política padrão do Chrome para páginas de extensão MV3. O HTML gerado referencia JavaScript e CSS empacotados locais, sem script inline ou remoto. Uma busca textual no pacote não encontrou `eval(`, `new Function(` ou tag de script com origem HTTP; URLs presentes no bundle incluem mensagens de erro do React e namespaces, não demonstram por si só carregamento remoto. A verificação é limitada e não substitui auditoria do bundle, da CSP efetiva ou revisão da Chrome Web Store.

## Validação manual confirmada pelo responsável

O responsável informou que, no Google Chrome instalado, a extensão foi instalada sem erros, seu
ícone ficou disponível, o Side Panel abriu corretamente, a mensagem do protótipo foi exibida, o
Service Worker funcionou e nenhum erro de CSP foi observado. Trata-se de evidência manual informada
pelo responsável; a versão exata usada nessa verificação não foi informada. A versão instalada
observada no ambiente durante o spike era 157.0.8103.78.

O teste automatizado, em contraste, apenas detectou o Service Worker no Chrome for Testing e abriu o
documento do painel como página. **A automação da abertura do Side Panel nativo não foi comprovada.**

Para reproduzir a validação manual:

1. Abrir Google Chrome e acessar `chrome://extensions`.
2. Ativar **Developer mode** e selecionar **Load unpacked**.
3. Escolher o diretório absoluto `spikes/001-stack/.output/chrome-mv3` dentro do repositório.
4. Fixar a extensão se necessário e clicar em seu ícone. Confirmar que o Side Panel efetivamente abre com o título **Stack spike** e a mensagem **Side Panel prototype is running.**
5. Em `chrome://extensions`, conferir o manifesto/permissão `sidePanel`, abrir a inspeção do Service Worker e verificar a mensagem `Stack spike service worker started.` e eventuais erros de CSP.
6. Registrar versão do Chrome, resultado e erros observados. A abertura de `sidepanel.html` como aba não substitui esta verificação.

A confirmação acima cobre somente os resultados relatados. Testes de navegação, comportamento após
suspensão do Service Worker, permissões de coleta e APIs de segurança pertencem a outros spikes e não
foram executados aqui.

## Decisões e limitações

- WXT, React, TypeScript strict, Tailwind, Zod e Vitest são candidatos com build e testes locais bem-sucedidos neste ambiente; versões definitivas e a revisão do pacote de distribuição pertencem a T014 e à validação de release.
- Recomenda-se Playwright como candidato para testes automatizados de extensão no Chrome for Testing, com base no worker e na página validados. A [documentação do Playwright](https://playwright.dev/docs/chrome-extensions) descreve o uso do Chromium fornecido para carregar extensões; a automação do Side Panel nativo não foi demonstrada e continua exigindo validação manual. Navegação, permissões e suspensão do worker ficam nos spikes correspondentes. Não usar `--no-sandbox` como configuração de produção.
- O build foi reproduzido em cópia limpa usando lockfile e store pré-existente no mesmo sistema. Repetição em outra máquina permanece recomendada. A revisão técnica de licenças e os avisos necessários para distribuição constam em `docs/dependencies.md`.
- O protótipo não demonstra conformidade geral de MV3 ou da Chrome Web Store e não testa modelos de IA, WASM ou WebGPU.

## Recomendações para T014

- Alinhar a versão principal de `@types/node` ao runtime Node.js 24; a versão 26.6.11 do spike não é recomendação para a configuração definitiva.
- Definir `engines` em `package.json` conforme versões de Node e pnpm comprovadas; manter versões exatas e lockfile.
- Configurar descoberta de todos os testes unitários pelo Vitest, sem fixar um único arquivo; separar diretórios ou padrões de testes Playwright para evitar coleta cruzada.
- Manter `node_modules`, `.output`, `.wxt`, `dist`, `build`, cobertura, relatórios e caches fora do versionamento; verificar padrões e artefatos efetivos após configuração.
- Incluir avisos de terceiros e revisar o pacote e as licenças para distribuição, conforme `docs/dependencies.md`.

## Aprovação humana para desenvolvimento

O responsável Jucielton Santos aprovou WXT, MV3, React, TypeScript strict, Tailwind CSS, Zod, Vitest, pnpm, Node.js 24 e Playwright nos cenários comprovados para desenvolvimento da PoC. A validação manual e os limites automatizados acima permanecem válidos. Não há incompatibilidade de licenciamento conhecida; avisos e auditoria do bundle definitivo são obrigatórios antes de distribuição pública, que não está aprovada. T014 está autorizada.
