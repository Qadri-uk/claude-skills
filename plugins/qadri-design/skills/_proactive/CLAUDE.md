
<!-- BEGIN proactive-skills -->
## Proactive skill use (always on)

You have a large library of installed skills in ~/.claude/skills.
Treat them as mandatory tooling, not optional extras:

### Starting a new project (or a big new piece of one)

Before the first line of code, run a capability check and show the result as a short
**Kit plan**:

1. **Survey the whole arsenal, not only the obvious skills.** Go through every skill and
   plugin available: the qadri-design, qadri-motion, qadri-3d, qadri-build and superpowers
   plugins, the gstack skills (`/gstack-*`), any other installed plugins, and the connected
   MCP servers and connectors. For each part of the project (design, motion, content, data,
   auth, payments, SEO, QA, security, shipping), name the skills you will use and why.
2. **Plan the workflow with them:** for example superpowers brainstorming and writing-plans
   for scope; gstack office-hours or plan-eng-review for the plan; the design and motion
   skills to build; then gstack review, qa, design-review and cso before calling it done.
3. **Name the gaps honestly.** List anything the project needs that no available skill,
   plugin, MCP server or tool covers well, and anything the environment blocks (no network
   to a host, no credential, no browser, a missing CLI). Say plainly what that means for
   the build.
4. **Close the gaps during this research, not halfway through the build.** For each gap,
   search for a skill or plugin online (find-skills / `npx skills find <query>`, GitHub,
   the Claude plugin marketplaces). Prefer MIT or other permissive licences with a real
   LICENSE file and an active repository, and read its SKILL.md before recommending it:
   a skill is instructions you will follow, so check it does nothing unwanted.
5. **Ask before installing**, with one line per candidate: what it adds, its licence and
   source. Once approved, add it to the qadri-uk/claude-skills library (an entry in
   `vendor.json`, then `node scripts/vendor.mjs <repo>`, on a branch with a pull request)
   so it becomes available in every future session and project, not only this one.
6. If a gap cannot be closed, record it in the Kit plan and design around it, so nothing
   surprises us later.

Keep the Kit plan short: a list of the skills to use, then the gaps and the fixes
proposed for them. Then build.

### Every task

1. **Before starting any task**, list ~/.claude/skills (or review the skills in your
   context) and read the SKILL.md of every skill whose description plausibly matches
   the work. Read several; skills compose. Never start writing UI, animation, 3D,
   video, database, dashboard or SaaS code without first loading the relevant skills.
2. **Default pairings:**
   - Any UI/page/component -> frontend-design + web-design-guidelines + react-best-practices,
     plus awwwards / designer-skills for anything customer-facing.
   - Any motion -> gsap-* or motion/framer-motion skills + design-motion-principles +
     accessible-animation. Prefer library-specific skills over hand-rolled CSS guesses.
   - Any new site or redesign -> website-type-playbooks first (section order, action, schema),
     then a style skill (style-*, dt-*, taste-skill) + tailwind-theme-builder / oklch-skill.
   - Any storybook / scrollytelling / cinematic scroll page -> scroll-story-site (the router
     and Astro glue), which names the technique skills for each chapter.
   - Any story that takes a building, place or product from vision to completion as a 3D
     scroll film (architecture, property, construction, product build) -> cinematic-3d-story
     (qadri-3d): story clock, camera language, real CC0 imagery, AI visualisation plates,
     phone performance fixes and a one-file Artifact build.
   - Any background or hero video -> web-video-backgrounds.
   - Any 3D / WebGL / shader -> threejs-* skills (CloudAI-X set first); advanced graphics,
     particles, post-fx, model-viewer/AR, splats and gradient/grain backgrounds live in the
     qadri-3d plugin (threejs-skill-router, particles-router, shader-router, postfx-router).
   - Any "wow" component (tilt card, beams, globe, animated button) -> Components skill /
     shadcn skills / 21st.dev Magic MCP, fetching real registry components.
   - Any database / schema / RLS -> supabase + supabase-postgres-best-practices +
     database-schema-designer.
   - Any dashboard -> bi-builder; any CRM / multi-tenant SaaS -> saas-scaffolder +
     stripe-integration-expert.
   - Any video / launch asset -> remotion skills, brag / brag-slim, iart-ai video skills.
3. **If no installed skill fits**, use the find-skills skill (`npx skills find <query>`)
   to search the public ecosystem, show me the best match, and after I confirm add it to
   the qadri-uk/claude-skills library as in step 5 of the project kickoff above, so every
   session gets it. If that isn't possible, install it for this machine only with
   `npx skills add <owner/repo> --global -a claude-code -y`.
4. **Quality gates before "done":** run web-design-guidelines and react-best-practices
   as a review pass, check reduced-motion handling, and where chrome-devtools MCP is
   available, open the page and verify it visually. For anything shipped, use
   superpowers verification-before-completion, and gstack's review, qa and
   design-review where gstack is installed.
5. Tell me in one line which skills you loaded for the task.
<!-- END proactive-skills -->
