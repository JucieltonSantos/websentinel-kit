<!--
Relatório de impacto da sincronização (remover antes do commit)
Alteração de versão: 2.0.0 → 2.1.0
Princípios modificados: IV. Privacy by Design; IX. Independência de IA.
Seções adicionadas: nenhuma.
Seções removidas: nenhuma.
Outras alterações: plano de migração dos trabalhos existentes incluído.
Pendências de placeholders: nenhuma.
-->

# Constituição do WebSentinelKit

## Princípios Fundamentais

### I. Desenvolvimento Orientado por Especificações (SDD)

Toda funcionalidade DEVE ser especificada antes da implementação. Sua especificação DEVE descrever
comportamento pretendido, escopo e critérios de aceitação antes do início da implementação.

### II. Simplicidade em Primeiro Lugar

Os projetos DEVEM priorizar a solução mais simples e sustentável que atenda à especificação.
Abstrações desnecessárias, monorepos e otimizações prematuras NÃO DEVEM ser introduzidos.

### III. Secure by Design

Toda decisão arquitetural DEVE considerar suas implicações de segurança. Ameaças, limitações e
compensações de segurança relevantes DEVEM ser documentadas junto à decisão.

### IV. Privacy by Design

Dados sensíveis da aplicação NÃO DEVEM ser transmitidos a serviços externos. Credenciais, tokens e
valores de cookies em estado bruto NÃO DEVEM ser persistidos. Evidências DEVEM ser sanitizadas antes
de serem armazenadas ou exibidas.

Dados sensíveis DEVEM ser sanitizados na origem, antes da comunicação entre componentes da extensão,
armazenamento, exibição, logging ou processamento por inteligência artificial. A coleta de
informações DEVE respeitar o princípio da minimização de dados. Credenciais, tokens e valores brutos
de cookies NÃO DEVEM circular entre os componentes da extensão.

### V. Local First

O projeto DEVE operar localmente sem backend, banco de dados externo ou infraestrutura obrigatória
em nuvem.

### VI. Análise Passiva

Toda análise de segurança DEVE ser iniciada pelo usuário e permanecer não intrusiva. Exploração
ativa NÃO DEVE ser realizada.

### VII. Detecção Baseada em Evidências

Todo finding DEVE incluir evidência sanitizada, severidade, confiança e justificativa técnica. Riscos
potenciais DEVEM ser identificados como potenciais e NÃO DEVEM ser apresentados como vulnerabilidades
confirmadas.

### VIII. Mecanismo de Segurança Determinístico

A detecção de segurança e a correlação de riscos DEVEM ser determinísticas e NÃO DEVEM depender de
inteligência artificial.

### IX. Independência de IA

Todas as funcionalidades centrais de segurança DEVEM funcionar sem IA. A geração aumentada por
recuperação local (RAG) PODE oferecer remediação contextualizada como aprimoramento opcional e DEVE
ter um fallback determinístico.

O RAG DEVE utilizar fontes confiáveis, versionadas e rastreáveis. Recomendações geradas pela IA DEVEM
apresentar referências às fontes utilizadas. A IA NÃO DEVE criar findings nem alterar sua severidade
ou nível de confiança. Conteúdos provenientes das aplicações analisadas DEVEM ser tratados como dados
não confiáveis, nunca como instruções para a IA.

### X. Privilégio Mínimo

A extensão DEVE solicitar apenas as permissões de navegador necessárias para cada operação.

### XI. Testes

Toda regra de segurança DEVE ter testes automatizados de casos positivos, negativos e de borda. As
alterações DEVEM passar pelos testes automatizados aplicáveis antes da aceitação.

### XII. Código Aberto

O projeto DEVE manter arquitetura transparente, builds reproduzíveis e documentação clara. As
instruções de build DEVEM descrever os passos necessários para reproduzi-lo.

## Escopo e Restrições da PoC

O WebSentinelKit é uma extensão de código aberto para Chrome, local-first e uma pequena prova de
conceito, não uma plataforma comercial completa de segurança. Seu escopo aprovado compreende:

- 10 regras determinísticas de segurança.
- 2 regras de correlação de riscos.
- 5 documentos de conhecimento da OWASP.
- RAG local com fallback determinístico.
- Uma interface no Chrome Side Panel.
- Testes automatizados.
- Uma aplicação vulnerável mínima para demonstração.

Qualquer expansão desse escopo DEVE receber aprovação explícita do responsável pelo projeto antes da
implementação.

## Fluxo e Padrões de Engenharia

- A constituição, as especificações, o planejamento, as tarefas e as decisões arquiteturais DEVEM
  ser escritos em português brasileiro.
- A comunicação e as explicações do agente de desenvolvimento DEVEM ser em português brasileiro.
- Código-fonte, variáveis, funções, classes, testes automatizados e mensagens de commit DEVEM ser
  escritos em inglês.
- A interface da extensão DEVE ser em inglês.
- O README DEVE estar disponível em português brasileiro e em inglês.
- As mensagens de commit DEVEM seguir Conventional Commits.
- O código DEVE ser legível, sustentável e testável.
- As premissas técnicas DEVEM ser validadas antes da introdução de dependências, e a validação e o
  motivo de cada dependência DEVEM ser documentados.
- Especificações e revisões de implementação DEVEM documentar limitações arquiteturais e compensações
  de segurança relevantes.
- O trabalho em funcionalidades DEVE partir de uma especificação aprovada para um plano e sua
  implementação, com testes aplicáveis e conformidade com a constituição verificados antes da
  aceitação.

## Governança

Esta constituição rege especificações, planos, implementações e revisões do projeto. Práticas do
projeto conflitantes DEVEM ser adequadas a ela. Emendas DEVEM ser documentadas com sua justificativa
e aprovadas pelo responsável pelo projeto antes da adoção; emendas que afetem trabalhos existentes
DEVEM incluir um plano de migração. Expansões de escopo também exigem aprovação explícita do
responsável pelo projeto.

As versões da constituição DEVEM seguir versionamento semântico: MAJOR para remoções ou redefinições
incompatíveis de princípios ou regras de governança, MINOR para novos princípios ou orientações
materialmente ampliadas e PATCH para esclarecimentos ou outras mudanças sem alteração de significado.
A data de ratificação registra a adoção inicial; a data da última emenda DEVE ser atualizada quando
a constituição for alterada.

A migração para o padrão de idiomas da versão 2.0.0 consiste em adequar os artefatos existentes que
sejam abrangidos por ele ao serem criados ou revisados, incluindo as duas versões do README, antes de
sua aceitação sob esta constituição. Durante a migração, identificadores e formatos técnicos
necessários à operação das ferramentas DEVEM ser preservados.

Para a migração à versão 2.1.0, trabalhos existentes afetados DEVEM ser revisados e adequados aos
requisitos de privacidade e IA dos princípios IV e IX antes de sua aceitação sob esta constituição.

Especificações, planos e alterações DEVEM ser revisados quanto à conformidade com estes princípios e
com o escopo antes da aceitação. Revisores DEVEM registrar e resolver violações; qualquer exceção
proposta exige uma emenda aprovada à constituição, e não uma dispensa não documentada.

**Versão**: 2.1.0 | **Ratificada**: 2026-11-26 | **Última emenda**: 2026-11-26
