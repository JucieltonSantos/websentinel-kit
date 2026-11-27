# Avisos de terceiros

Este inventário inicial refere-se ao bundle experimental de `spikes/001-stack/`; não é auditoria do
bundle definitivo. Os textos abaixo foram obtidos dos arquivos `LICENSE` dos pacotes instalados.

## Componentes incorporados ou associados ao bundle experimental

O bundle inclui React e React DOM; scheduler integra sua cadeia de runtime. Os três pacotes instalados
contêm o mesmo texto e aviso de copyright reproduzidos abaixo: `react@19.3.1`, `react-dom@19.3.1` e
`scheduler@0.28.0`.

```text
MIT License

Copyright (c) Meta Platforms, Inc. and affiliates.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

O CSS gerado possui o aviso do Tailwind CSS 4.3.5. O arquivo de licença do pacote informa:

```text
MIT License

Copyright (c) Tailwind Labs, Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Ferramentas de desenvolvimento e build

O grafo `pnpm why` mostra `lightningcss@1.33.0` e `lightningcss-linux-x64-gnu@1.33.0`, ambos
MPL-2.0, na cadeia de build via Tailwind/Vite. Nenhum arquivo nativo `.node` ou `.wasm` desses
pacotes aparece no pacote experimental inspecionado; não há importação explícita em runtime.
WXT, TypeScript, Vitest e Playwright são usados para desenvolvimento, build ou testes.

## Presença não determinada e limites

A inspeção textual de bundle minificado não demonstra ausência de trechos transformados de
lightningcss ou de outras dependências transitivas. A presença de Zod no bundle não foi comprovada;
foi usada nos testes do spike. A auditoria da proveniência, licenças, avisos e eventual código MPL
no pacote definitivo é obrigatória na T060. A distribuição do build deve incluir este arquivo e a
licença do projeto, atualizados conforme a auditoria do artefato efetivo. A stack está aprovada para
desenvolvimento, não para publicação.
