# Plantões+

App mobile-first para organização pessoal de plantões e controle financeiro operacional de profissionais da saúde.

## Primeira entrega

- Next.js 16 com TypeScript e Tailwind CSS.
- Estrutura inicial de rotas públicas e privadas.
- Layout base mobile-first com navegação inferior fixa.
- Páginas iniciais de login, cadastro, recuperação de senha, dashboard, agenda, plantões, unidades, gastos, finanças e perfil.
- Prisma configurado com schema inicial para usuários, unidades, plantões, recorrência e gastos.
- `.env.example` sem segredos reais.

## Getting Started

Instale as dependências e rode o servidor local:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Banco de dados

Configure `DATABASE_URL` em `.env` antes de executar migrations do Prisma.

```bash
npx prisma generate
npx prisma migrate dev
```

## Rotas iniciais

- `/login`
- `/cadastro`
- `/recuperar-senha`
- `/dashboard`
- `/agenda`
- `/plantoes`
- `/unidades`
- `/gastos`
- `/financas`
- `/perfil`

## Segurança

Não versionar `.env`, `DATABASE_URL`, `AUTH_SECRET` ou qualquer segredo. Todas as futuras consultas privadas devem filtrar por `userId` no servidor.

## Próximo bloco

Implementar cadastro de unidades, listagem, edição, inativação, unidade fixa e valores padrão.

## Autenticação

O Bloco 2 usa Auth.js com provider de credenciais, `bcryptjs` para hash de senha e Prisma para persistência do usuário.

- Cadastro: `POST /api/auth/register`
- Sessão Auth.js: `/api/auth/[...nextauth]`
- Usuário autenticado: `GET /api/auth/me`
- Perfil: `GET /api/users/me` e `PATCH /api/users/me`
- Rotas privadas protegidas por `proxy.ts`

As rotas privadas redirecionam para `/login` quando não há sessão ativa.
