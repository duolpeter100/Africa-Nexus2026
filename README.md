# Africa-Nexus2026
Africa Nexus — A modern, responsive Pan-African news and media web application featuring dynamic category filtering, regional story tracking, an integrated podcast player, and dark mode support.

## Newsroom dashboard

The staff portal is available at `/admin/` through the site's Staff login link. Admins can create, edit, publish, unpublish, and delete articles. Owners have the same editorial tools plus team account creation and access management. Drafts are private; published stories appear on the public homepage. The six original stories are migrated into the database so they can be managed rather than remaining hardcoded examples.

### First owner setup

1. After deploying, open the site's **Project configuration > Identity** in Netlify. Identity activation is included in this project. Set registration to **Invite only**; public signup is not needed.
2. Invite the first owner using their email address, then assign the trusted `owner` role to that account in Netlify Identity. Roles must be set by a trusted operator, never through user-editable metadata or public registration. Use the built-in Identity invitation and recovery email links; custom templates must preserve the invitation/recovery token in the URL hash.
3. Open the invitation link and choose a password. The site forwards invitation and password recovery links to the staff portal. If an account already has a password, sign in using its email initially.
4. In **My account**, save a unique username. Future sign-ins accept that username and the account's password. Email sign-in remains available for initial setup and recovery.
5. In **Team & access**, create additional accounts with a display name, username, recovery email, initial password, and `admin` or `owner` role. Share initial credentials privately. New accounts can sign in immediately; no invitation email is sent by this account-creation flow.

The dashboard never creates a default privileged account or embeds login credentials. Only trusted Netlify Identity `app_metadata.roles` values grant access. Owners cannot remove themselves or another owner through the dashboard; removal of owner access is intentionally reserved for the trusted Netlify Identity operator. Admin access can be revoked by choosing **No access**. Access changes are checked against Identity on each protected request, including for existing sessions.

### Storage and deployment

Static files are published from `public/`, keeping server code and dependencies off the public site. Netlify Functions provide authentication, article operations, and owner-only team controls. Netlify Identity manages passwords and sessions; the database stores articles and username/profile mappings, never passwords.

Netlify Database uses Drizzle with `db/schema.ts` and migrations in `netlify/database/migrations/`. The included migration creates the schema and preserves the original articles. Migrations are applied during deployment. Generate a corresponding migration after any future schema change with `npm run db:generate -- --name descriptive_change_name`.

Install dependencies with `npm install`. For local development, use `netlify dev --port 8889` with the project linked to Netlify. Run `npm run check` for TypeScript validation. The homepage and dashboard need the Netlify runtime and a provisioned, migrated database for live content operations.

Article bodies use plain text with paragraph breaks. Saving a published story immediately makes it available through the public article feed; changing it back to Draft removes it from the feed. Concurrent edits are checked using article versions so another editor's changes are not silently overwritten. The dashboard shows up to 500 recently updated stories, and team accounts are paginated in groups of 50.
