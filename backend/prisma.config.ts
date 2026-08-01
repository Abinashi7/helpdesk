import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // env() from 'prisma/config' breaks when prisma resolves through Bun's
    // internal .bun/ module directory. process.env is always safe here.
    url: process.env.DATABASE_URL ?? '',
  },
});
