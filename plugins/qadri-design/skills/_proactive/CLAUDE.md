
<!-- BEGIN proactive-skills -->
## Proactive skill use (always on)

You have a large library of installed skills in ~/.claude/skills.
Treat them as mandatory tooling, not optional extras:

1. **Before starting any task**, list ~/.claude/skills (or review the skills in your
   context) and read the SKILL.md of every skill whose description plausibly matches
   the work. Read several; skills compose. Never start writing UI, animation, 3D,
   video, database, dashboard or SaaS code without first loading the relevant skills.
2. **Default pairings:**
   - Any UI/page/component -> frontend-design + web-design-guidelines + react-best-practices,
     plus awwwards / designer-skills for anything customer-facing.
   - Any motion -> gsap-* or motion/framer-motion skills + design-motion-principles +
     accessible-animation. Prefer library-specific skills over hand-rolled CSS guesses.
   - Any 3D / WebGL / shader -> threejs-* skills (CloudAI-X set first) + open-3d-skills.
   - Any "wow" component (tilt card, beams, globe, animated button) -> Components skill /
     shadcn skills / 21st.dev Magic MCP, fetching real registry components.
   - Any database / schema / RLS -> supabase + supabase-postgres-best-practices +
     database-schema-designer.
   - Any dashboard -> bi-builder; any CRM / multi-tenant SaaS -> saas-scaffolder +
     stripe-integration-expert.
   - Any video / launch asset -> remotion skills, brag / brag-slim, iart-ai video skills.
3. **If no installed skill fits**, use the find-skills skill (`npx skills find <query>`)
   to search the public ecosystem, show me the best match, and install it with
   `npx skills add <owner/repo> --global -a claude-code -y` after I confirm.
4. **Quality gates before "done":** run web-design-guidelines and react-best-practices
   as a review pass, check reduced-motion handling, and where chrome-devtools MCP is
   available, open the page and verify it visually.
5. Tell me in one line which skills you loaded for the task.
<!-- END proactive-skills -->
