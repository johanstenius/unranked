## Related SDKs

- In all interactions and commit messages, be extremely concise and sacrifice grammar for the sake of concision.
- At the end of each plan, give me a list of unresolved questions to answer, if any. Make the questions extremely concise. Sacrifice grammar for the sake of concision.
- Rather refactor than adding dept/work around what we have.
- Use migrations for database
- **ALWAYS run when a feature or phase is fully implemented**: `pnpm build && pnpm test:run && pnpm lint`. Make sure it passes and no errors.
- Only add comments if they bring a lot of value, rather refactor to make code readable
- Make sure code compiles and test pass after changes
- Types over interfaces
- **Use named function declarations, not arrow function constants**: `function foo(): Bar {}` not `const foo = () => {}`
- No classes
-

## Frameworks

- Hono + @hono/zod-openapi
- Prisma
- Vitest
- **Biome** for linting/formatting (always, all projects)

## Gotchas

**Hono `/**`wildcard breaks dynamic routes**: Using`/**`(double asterisk) in routes like`/api/auth/**`causes 404s on other routes with path params. Use`/\*` instead. See [Hono Issue #4124](https://github.com/honojs/hono/issues/4124).

## Architecture Pattern: Service Models & Type Flow

**CRITICAL: Follow this pattern for all services/mappers/types**

**Rules:**

1. **OpenAPI schemas** export API types: `export type TaskResponse = z.infer<typeof taskResponseSchema>`
2. **Services** define domain models: `export type TaskModel = { id: string; createdAt: Date; ... }`
3. **Mappers** use both: `function map(model: TaskModel): TaskResponse { ... }`
4. **NO DB types outside repositories** - Services transform repository data to domain models
5. **NO duplicate type definitions** - Use exported OpenAPI types, don't redefine with `z.infer`

## Repository Pattern (CRITICAL)

**NEVER access Prisma directly from services. Zero exceptions.**

- **Repository layer**: Only place for Prisma/DB access
- **Service layer**: Calls repositories, returns domain models (not DB models)
- **Controllers**: Call services, map domain models to API responses
- **Exception**: Middlewares may access DB directly if needed

Flow: `Controller → Service (domain models) → Repository (DB access)`

## Type Safety

**NEVER use `any` type. Zero exceptions.**

Use instead:

- `unknown` - when type is truly unknown, forces type narrowing
- `Record<string, unknown>` - for objects with unknown shape
- Generic types `<T>` - for reusable functions
- Union types - `string | number | null` for known possibilities
- `as const` - for literal types
- Type assertions `as Type` - only when you have proof it's safe

If stuck, ask for help. Never resort to `any`.
