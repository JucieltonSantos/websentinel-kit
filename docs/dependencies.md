# Dependências candidatas para o SPIKE-001

Consulta ao registro npm em 2026-11-26; as licenças abaixo são declarações dos pacotes diretos no registro. A análise do build e das obrigações de distribuição está registrada abaixo. Estas versões são candidatas para o spike, não decisões definitivas para T014.

| Pacote | Versão candidata | Licença declarada | Justificativa |
|---|---:|---|---|
| WXT | 0.21.5 | MIT | Build e entrypoints de extensão MV3. |
| @wxt-dev/module-react | 1.2.2 | MIT | Integração React com WXT. |
| React / React DOM | 19.3.1 | MIT | Interface do Side Panel. |
| TypeScript | 7.0.2 | Apache-2.0 | Tipagem estática em modo strict. |
| Tailwind CSS / @tailwindcss/vite | 4.3.5 | MIT | CSS utilitário gerado no build. |
| Zod | 4.6.7 | MIT | Validação de dados em runtime. |
| Vitest | 5.1.2 | MIT | Testes unitários. |
| pnpm | 11.1.2 | MIT | Gerenciador de dependências e lockfile. |
| @playwright/test | 1.65.1 | Apache-2.0 | Candidato experimental para Chrome real. |
| @types/react | 19.3.3 | MIT | Tipos de desenvolvimento do React. |
| @types/react-dom | 19.3.0 | MIT | Tipos de desenvolvimento do React DOM. |
| @types/chrome | 0.3.8 | MIT | Tipos das APIs de extensão Chrome. |
| @types/node | 26.6.11 | MIT | Tipos para os testes executados em Node. |

Compatibilidade conjunta, permissões, CSP, build reproduzível e testes de navegador dependem do resultado de `docs/spikes/001-stack.md`. O responsável aprovou a stack para desenvolvimento da PoC e autorizou T014; Playwright é aprovado para os cenários automatizados comprovados, com validação manual dos demais. A distribuição pública permanece pendente da auditoria T060.

## Revisão das licenças e da distribuição

### Inventário e evidências

`pnpm licenses list --json --config.store-dir=/tmp/websentinel-spike-pnpm-store` identificou, nos
metadados dos pacotes instalados, MIT (124), Apache-2.0 (8), ISC (9), BSD-2-Clause (8), BSD-3-Clause
(3), BlueOak-1.0.0 (1) e MPL-2.0 (2). Essas contagens descrevem o ambiente instalado, inclusive
ferramentas de desenvolvimento, não provam que cada pacote está presente no produto distribuído.
É necessário repetir a análise para cada lockfile e artefato de release, inclusive fontes e assets.

`pnpm why lightningcss` identifica `lightningcss@1.33.0` na cadeia de `@tailwindcss/node`/`@tailwindcss/vite`
e Vite; `pnpm why lightningcss-linux-x64-gnu` o identifica como dependência nativa de lightningcss.
Ambos têm licença declarada MPL-2.0. No spike, são utilizados pela cadeia de ferramentas de build,
não são importados pelo código de runtime. A inspeção dos cinco arquivos de `.output/chrome-mv3`
identificou apenas manifesto, HTML, JavaScript, CSS e service worker: não há arquivo `.node`, `.wasm`,
arquivo de licença MPL ou correspondência textual `lightningcss`/`MPL-2.0`. Isso é evidência de que
os pacotes e seus binários nativos não foram distribuídos como arquivos nesse build; não é prova
formal de ausência de trechos transformados no bundle minificado sem mapa de proveniência completo.
CSS gerado foi inspecionado como artefato de saída, não presumido como código do compilador.

O JavaScript de saída contém React/React DOM e scheduler; suas licenças instaladas são MIT com
copyright de Meta Platforms, Inc. and affiliates. O CSS contém aviso `tailwindcss v4.3.5 | MIT
License`, mas o pacote não contém licença ou aviso de terceiros separado. Esse banner não substitui
automaticamente o texto de licença e aviso de copyright completos exigidos para cópias ou partes
substanciais de código MIT. O projeto também ainda não possui arquivo `LICENSE` próprio. O Zod foi
utilizado nos testes do spike; não se infere sua presença ou ausência no bundle apenas pela lista de
dependências. Para release, gerar inventário de módulos efetivamente incluídos, revisar os arquivos
de licença e avisos upstream e conferir o pacote final.

### Obrigações aplicáveis e condições

- **MIT**: ao distribuir código coberto ou parte substancial, incluir o aviso de copyright e o texto
  de permissão aplicáveis. Para o bundle observado, preservar os textos de licença e copyright de
  React, React DOM e scheduler; verificar também o CSS e os avisos de Tailwind. A [licença MIT](https://opensource.org/license/mit)
  permite licenciar o código próprio do projeto em MIT sem apagar as licenças de terceiros.
- **Apache-2.0**: se código sob essa licença for distribuído, incluir uma cópia da licença, preservar
  avisos aplicáveis e incluir atribuições de `NOTICE` quando exigido; alterações em arquivos devem
  ser indicadas. Isso não é uma exigência de distribuir automaticamente os arquivos de ferramentas
  apenas instaladas para build. Ver [Apache License, seção 4](https://www.apache.org/licenses/LICENSE-2.0).
- **ISC e BSD-2/3-Clause**: quando seus componentes forem distribuídos, preservar os avisos de
  copyright, condições e isenção aplicáveis, inclusive na documentação ou materiais de distribuição
  para binários quando exigido; a BSD-3 também restringe uso de nomes para endosso. Consultar
  [ISC](https://spdx.org/licenses/ISC.html), [BSD-2](https://spdx.org/licenses/BSD-2-Clause.html) e
  [BSD-3](https://spdx.org/licenses/BSD-3-Clause.html).
- **BlueOak-1.0.0**: caso seja distribuída parte de software coberto, fornecer aos destinatários o
  texto da licença ou o link exigido; o inventário apontou `graceful-fs@4.2.12`, sem demonstrar sua
  inclusão no bundle. Ver [Blue Oak, Notices](https://blueoakcouncil.org/license/1.0.0).
- **MPL-2.0**: se código coberto ou sua forma executável for distribuído, preservar as obrigações da
  MPL para esse código, inclusive disponibilizar a forma-fonte correspondente e informar como
  obtê-la ao distribuir executáveis. A obra maior pode ter termos próprios, desde que não restrinjam
  direitos sobre o código MPL. Ver [MPL 2.0, seção 3](https://www.mozilla.org/en-US/MPL/2.0/) e
  [FAQ da Mozilla](https://www.mozilla.org/en-US/MPL/2.0/FAQ/). No build inspecionado, não há
  evidência de distribuição de lightningcss como arquivo ou binário; se ele ou seus trechos forem
  incluídos em distribuição futura, aplicar essa análise ao artefato específico.

**Conclusão para MIT pretendida**: a análise deste spike não identificou impedimento à licença MIT
para o código próprio, desde que os componentes distribuídos mantenham seus próprios direitos,
licenças e avisos. Não é possível certificar a distribuição final a partir de um bundle de spike
minificado. Antes de publicar, adicionar `LICENSE` do projeto com titular apropriado e incluir no
pacote um arquivo como `THIRD_PARTY_NOTICES.md` com os textos e copyrights efetivamente aplicáveis,
incluindo os de React/React DOM/scheduler e os demais identificados na auditoria do artefato. Incluir
licenças completas e arquivos `NOTICE` quando aplicáveis, verificar se o empacotador os preserva e
revisar a proveniência de CSS e módulos transformados. Não escolher titular de copyright por
suposição. Esta é uma análise técnica das licenças consultadas, sujeita à revisão apropriada para a
forma concreta de distribuição.

A licença MIT do projeto e o inventário inicial dos avisos estão em `LICENSE` e `THIRD_PARTY_NOTICES.md`. O build deve empacotar ambos; T060 deve auditar a proveniência e atualizar os avisos antes de qualquer distribuição. Nenhuma incompatibilidade conhecida inviabiliza a stack para desenvolvimento; os limites da análise experimental permanecem.
