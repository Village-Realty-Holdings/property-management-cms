# Glossary Map

## Contexts

- [Site Builder](./apps/site/GLOSSARY.md): the single-Site builder being built now. Payload, the Admin with its Visual Editor, and the public Site in one app. Decisions: `apps/site/docs/adr/`.
- [Multi-Site CMS](./apps/cms/GLOSSARY.md) (reference only): the multi-site MVP from tag `archive/mvp-2026-09`, together with the packages it uses (`packages/content`, `packages/cms-types`, `packages/site-views`). It is kept while its code is ported into apps/site, then removed. Decisions: `apps/cms/docs/adr/`. Design: `apps/cms/docs/module-layout.md`. Plans: `apps/cms/docs/plans/`.

## Relationships

- **Multi-Site CMS → Site Builder**: code is ported by copying it and removing tenancy. apps/site never imports apps/cms or its packages (apps/site ADR-0001).
- **Same word, different meaning**: in the Multi-Site CMS a Site is one of many tenants, and Admin is a Staff User role. In the Site Builder each deployment serves one Site (several Sites run as separate deployments, apps/site ADR-0005), and the Admin is the place staff edit it.
- **ADR numbers are per context.** Cite them with the app, such as "apps/cms ADR-0010".
