# Manual do Usuário — EFVM360 Gestão de Troca de Turno
## Estrada de Ferro Vitória a Minas — Pátio do Fazendão
### Versão 3.2

---

## Capítulo 1: Primeiros Passos

### 1.1 Como Acessar o Sistema
Abra o navegador (Chrome ou Edge recomendados) e acesse o endereço fornecido pela TI. O sistema funciona em computadores, tablets e celulares.

### 1.2 Tela de Login
1. Digite sua **matrícula** no primeiro campo
2. Digite sua **senha** no segundo campo
3. Toque no botão **Entrar**

Se disponível, use **"Entrar com Vale SSO"** para login com sua conta corporativa.

Se esqueceu a senha, procure o supervisor ou administrador do sistema.

### 1.3 Primeiro Acesso (Cadastro)
1. Na tela de login, toque em **Criar Conta**
2. Preencha: nome completo, matrícula, função, turno e horário
3. Crie uma senha forte (mínimo 8 caracteres, com letras e números)
4. Aceite os termos de uso e privacidade
5. Toque em **Cadastrar**

---

## Capítulo 2: Tela Inicial (Dashboard)

Após o login, você verá a Visão Geral com:

- **Turno Atual**: Letra do turno (A, B, C, D), janela horária e tempo decorrido
- **Linhas do Pátio**: Quantas livres, ocupadas e interditadas
- **DSS**: Tema do Diálogo de Segurança e Saúde do turno
- **Alertas**: Indicações visuais se há pontos de atenção

### Navegação
Use a barra inferior para acessar:
- 🏠 **Inicial** — Dashboard/Visão Geral
- 📊 **BI+** — Painel de indicadores operacionais
- 📝 **Passagem** — Formulário de troca de turno
- 🔧 **Pátio** — Layout visual das linhas
- 📜 **Histórico** — Registros anteriores
- ⚙️ **Configurações** — Perfil, tema, acessibilidade

---

## Capítulo 3: Gestão de Troca de Turno

### 3.1 Preenchimento do Formulário
O formulário possui seções em ordem:

1. **Cabeçalho** — Data, turno, horário, DSS
2. **Linhas do Pátio** — Status de cada linha (livre, ocupada, interditada)
3. **Postos** — Informações de postos específicos
4. **Turno Anterior** — Referência do turno que está saindo
5. **Segurança e Manobras** — Checklist de segurança operacional
6. **Equipamentos** — Condição dos equipamentos do pátio
7. **Visualização** — Resumo geral antes de assinar
8. **Assinaturas** — Validação e assinatura digital

### 3.2 Preenchendo o Cabeçalho
- Selecione o **turno** (Diurno 07-19 ou Noturno 19-07)
- O sistema preenche automaticamente a data e calcula o tempo de turno
- Selecione o **tema DSS** abordado na troca de turno

### 3.3 Linhas do Pátio
Para cada linha, indique:
- **Status**: Livre (verde), Ocupada (amarelo) ou Interditada (vermelho)
- **Trem**: Se ocupada, informe o prefixo do trem
- **Observação**: Qualquer informação relevante

⚠️ Linhas interditadas exigem motivo obrigatório.

### 3.4 Segurança e Manobras
- Indique se houve manobras no turno
- Se sim: tipo de manobra, freios informados, condição de AMVs
- Indique restrições operacionais ativas
- Confirme comunicação com CCO/CPT e OOF

### 3.5 Assinaturas
Para assinar:
1. Confirme que revisou todos os dados
2. Digite sua senha para confirmação
3. O sistema valida se todos os campos obrigatórios estão preenchidos
4. ⚠️ Não é possível assinar com linhas interditadas sem motivo ou intervenções VP sem descrição

---

## Capítulo 4: Dashboard BI+

O painel BI+ mostra indicadores operacionais do pátio:
- Ocupação de linhas por turno
- Frequência de alertas críticos
- Tempo médio de preenchimento de trocas de turno
- Comparativo entre turnos

Estes indicadores ajudam na tomada de decisão operacional. **BI é suporte, não vigilância** — os dados são agregados e focam na operação, não no indivíduo.

---

## Capítulo 5: Histórico

### 5.1 Resumo
Veja suas estatísticas: total de trocas de turno, dias ativos, último login.

### 5.2 Atividades Recentes
Lista cronológica de todas as ações no sistema.

### 5.3 DSS por Temas
Veja quais temas de DSS foram abordados, agrupados por categoria.

### 5.4 Rankings
Visão comparativa de atividade (sem caráter punitivo).

---

## Capítulo 6: Configurações

### 6.1 Perfil
Edite nome e função. Altere sua senha.

### 6.2 Aparência
- **Tema Claro**: Ideal para turnos diurnos
- **Tema Escuro**: Recomendado para turnos noturnos (reduz fadiga visual)
- **Automático**: Alterna conforme horário do dispositivo

### 6.3 Acessibilidade
- Aumente o tamanho da fonte
- Alto contraste para melhor legibilidade
- Compatível com leitores de tela

### 6.4 Privacidade (LGPD)
- Consulte seus dados pessoais armazenados
- Exporte seus dados em formato JSON
- Solicite anonimização (registros operacionais preservados por lei)

---

## Capítulo 7: Perguntas Frequentes

**P: O sistema funciona sem internet?**
R: Sim, parcialmente. O formulário funciona offline e sincroniza quando a conexão retornar.

**P: Posso alterar uma troca de turno já assinada?**
R: Não. Trocas de turno assinadas são registros imutáveis. Crie uma nova troca de turno com as correções.

**P: O que fazer se esquecer a senha?**
R: Procure o supervisor ou administrador do sistema para reset.

**P: O que significa o indicador de risco vermelho?**
R: Há condições que exigem atenção imediata (linha interditada sem motivo, restrição ativa, equipamento fora de condição).

**P: Meus dados estão seguros?**
R: Sim. Senhas são criptografadas, dados trafegam com TLS, e apenas gestores autorizados acessam informações do seu perfil.

---

## Suporte
- **Problemas técnicos**: Contate o administrador do sistema
- **Dúvidas operacionais**: Supervisor de turno
- **Privacidade**: dpo@vale.com
