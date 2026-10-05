# Glossary Map

## Contexts

- [Site Builder](./apps/site/GLOSSARY.md): Payload, the Admin with its Visual Editor, and the public Site in one app, deployed once per Site. Decisions: `apps/site/docs/adr/`.

## History

- **Multi-Site CMS** (apps/cms): the multi-site MVP that came before the Site Builder. It was removed; its code, GLOSSARY.md and ADRs are at tag `archive/mvp-2026-09`. Citations like "apps/cms ADR-0015" refer to that tag.
- **Same word, different meaning**: in the Multi-Site CMS a Site was one of many tenants of one deployment. In the Site Builder each deployment serves one Site, and the shared Registry (apps/site ADR-0015) lists them all.
