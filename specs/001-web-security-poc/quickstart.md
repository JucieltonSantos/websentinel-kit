# Guia de validação futura

Este é um roteiro para a validação integral futura. A Foundation foi aprovada com testes, typecheck e build registrados em `docs/checkpoints/foundation.md`; a demo e os cenários de ponta a ponta ainda não foram implementados ou verificados.

## Pré-requisitos e preparação futura

- Chrome desktop na versão mínima validada pelo projeto; versão 138+ é candidata para a Prompt API opcional, não garantia de hardware/modelo disponível.
- Node e pnpm nas versões documentadas e fixadas pelo projeto; utilizar o lockfile e as condições documentadas para instalação e licenças.
- Base dos cinco documentos OWASP incluída no pacote com versões, hashes e licenças verificáveis. A demo deve escutar apenas em endereço local; não utilizar aplicações reais sem permissão.
- Para teste de IA, hardware e espaço conforme documentação vigente do navegador ou modelo escolhido; medir tamanho do download, espaço, memória e latência. A análise central não depende de nenhum modelo.

## Comandos previstos após implementação

Na raiz, os comandos da Foundation validados em 2026-11-27 foram `pnpm test`, `pnpm run typecheck` e `pnpm run build`. A instalação offline com lockfile congelado também foi registrada em `docs/validation/foundation-tdd.md`. Para a validação integral futura, após conferir dependências e scripts, estão previstos:

```sh
pnpm install --frozen-lockfile
pnpm test
pnpm run typecheck
pnpm run build
pnpm run demo
```

O último comando pressupõe script de demonstração a ser criado; o caminho de saída da extensão e o endereço local da demo devem ser registrados na documentação real. Carregar o diretório resultante como extensão não empacotada em `chrome://extensions` em modo de desenvolvedor. O comando da demo ainda não está disponível; o resultado dos cenários futuros não foi demonstrado pela validação da Foundation.

## Cenários de ponta a ponta

1. Abrir a demo local, acionar a extensão e iniciar análise. Se a resposta não tiver sido observada, confirmar instrução para recarregar manualmente; verificar que não ocorre reload nem requisição de teste automática.
2. Após reload, verificar dez estados, pelo menos um finding e uma correlação na demo; conferir evidências sanitizadas, severidade, ambas as confianças e explicação de risco potencial. Detalhes dos contratos: [interfaces](contracts/interfaces.md).
3. Negar acesso a cookies ou impedir observação da resposta. SEC-007/008 ou regras dependentes de header devem informar `NOT_EVALUATED` e motivo; diferença entre resposta observada sem header e resposta não observada deve ser verificável.
4. Navegar durante a coleta, alterar aba ou encerrar worker. Conferir interrupção e ausência de mistura de evidências; repetir com duas abas, documentos e redirects. Não presumir que `tabId` comprova identidade do documento.
5. Verificar os testes automatizados positivos, negativos e de borda das dez regras e as duas correlações. Incluir CSP múltipla/Report-Only/meta, precedência de `frame-ancestors`, JWT apenas estrutural, cookies de nome desconhecido, HTTP bloqueado/atualizado, integridade declarada e recursos não observados.
6. Inserir segredos canário na demo e inspecionar mensagens, evidências, logs, resultados, armazenamento e contexto de IA: nenhum valor bruto deve atravessar fronteiras ou ser persistido. Inspecionar também URLs, chaves e headers. Testar limites e schemas malformados.
7. Sem rede e sem modelo, confirmar análise central e remediação determinística. Sem autorização explícita não deve ocorrer download. Para concluir US3 e a PoC integral, demonstrar recuperação semântica e inferência local reais; após consentimento explícito, verificar tráfego de inicialização/download sem dados da aplicação, fontes válidas e tratamento de referências inválidas. Mocks ou fallback não comprovam inferência local. Referências válidas não substituem revisão de sustentação do texto.
8. Conferir manualmente o pacote MV3, CSP, arquivos WASM/JS locais, permissões mínimas e políticas vigentes da Chrome Web Store. Repetir build em ambiente limpo com versões fixadas e comparar artefatos conforme procedimento documentado.

## Resultado esperado

Cada cenário registra versão do Chrome, permissões, limites, estado observado e evidência sanitizada. Falhas de cobertura ficam explícitas; não são contadas como `PASSED`. O resultado de testes não deve ser declarado até sua execução efetiva. Consulte [research.md](research.md) para gates de viabilidade e [data-model.md](data-model.md) para estados e dados.
