# Lancer Briefings

Use `foundry-v13-dev` for the native module work. The initial target is Foundry VTT **13.351** with the **LANCER 3.1.3** game system. The module ID and installation folder are both `lancer-briefings`.

## Architecture

- `index.html` loads `src/main.js`, which mounts `App.vue` with Vue Router, Oruga, and the shared styles. `src/background.js` starts the existing Vanta effect with the bundled Three.js. The header and planet viewer also use Three.js.
- `src/router/index.js` defines Mission Status (`/status`), Pilots (`/pilots`), Events (`/events`), and Persons of Interest (`/persons`). The root redirects to Mission Status. Standalone uses browser history and a static-host rewrite for direct links. The Foundry build uses hash history so all navigation stays inside the iframe's `index.html`.
- `src/App.vue` loads mission and event Markdown, clocks and reserves JSON, and Comp/Con pilot JSON through Vite's `import.meta.glob`. Campaign settings, POI profiles, and planet locations live in `src/assets/info`. Planet briefing Markdown lives in `src/assets/planet-briefings`. Pilot equipment data comes from the bundled LANCER data packages and `src/assets/LCPs`. `briefing-drafts/` contains working drafts outside the runtime content directories.
- `public/` contains the raw media copied by Vite, including icons, insignia, portraits, textures, video, and audio. Static Vue and CSS references are rewritten by Vite. Resolve local public paths read from content or assembled at runtime with `src/utils/publicAssetUrl.js`. Bundle the theme fonts through Fontsource.
- `foundry/module.json` declares the target and `foundry/briefings.mjs` registers the Lancer Briefings button in the Token Controls tools. The button opens a resizable `ApplicationV2` window containing the local build in an iframe. `foundry/briefings.css` styles the window frame. Keep Foundry APIs under `foundry/`.
- The iframe receives a briefing store from the Foundry host. The `lancer-briefings.contentEdits` world setting stores the active operation and its archives. The host wraps legacy saved edits as the first operation. Vue merges that operation's edits with its bundled defaults and supplies the resolved briefing when the GM archives it. New operations start with the current pilot roster and their own content. Standalone uses the bundled files. Journal integration is deferred.
- The Foundry host opens the native image File Picker for GMs. Portrait overrides are saved by POI ID and one surface texture path feeds both globe views. The host resolves selected paths through the current Foundry route. Select files the players can read.
- The header uses a per-world override. Reserves and clocks merge world edits with bundled entries and entries derived from pilots. Edits to derived entries apply to the briefing and persist independently of the pilot sheet.
- `foundry/pilot-roster.mjs` publishes briefing fields from linked LANCER actors into the active operation. LANCER owns the COMP/CON sharecode import. The active GM updates a linked snapshot when a successful import updates the actor's `last_cloud_update`. Archived rosters retain the pilot records from the time of archiving.
- `vite.config.ts` uses the shared Vue entry for both builds. `foundry/package-module.mjs` copies the manifest, startup script, window stylesheet, and notices alongside the built site in `dist-foundry/lancer-briefings/`. The standalone output is `dist/`. Preserve the repository `LICENSE`, README credits, and bundled asset notices.

## Development commands

Run from the repository root with npm and a Node.js version supported by Vite 6. Node.js 22 is recommended.

| Command | Purpose |
| --- | --- |
| `npm ci` | Install the locked dependencies. |
| `npm run dev` | Start the standalone site with hot reload. |
| `npm run build` | Build the standalone site into `dist/`. |
| `npm run preview` or `npm run serve` | Preview the standalone production build locally. |
| `npm run build:foundry` | Build the installable module in `dist-foundry/lancer-briefings/`. |
| `npm run format` | Run the repository-wide Prettier formatter. |

Run both production builds to check a change. The repository has no automated test or lint script.

## Install locally and test on Foundry

1. Launch Foundry **13.351**. Right-click its Windows taskbar icon and choose **Browse User Data** to find that instance's user data folder. The portable build defaults to the folder containing `App`, `Config`, and `Data`. In Foundry Setup, make sure **LANCER 3.1.3** is installed and use a test LANCER world with an active scene.
2. In PowerShell at the repository root, run the following and paste the v13 folder from step 1 when prompted.

   ```powershell
   npm.cmd ci
   npm.cmd run build:foundry
   $dataRoot = (Read-Host 'Paste the v13 user data folder').Trim('"')
   if (-not (Test-Path -LiteralPath (Join-Path $dataRoot 'Data') -PathType Container)) {
       throw 'Enter the v13 user data folder that contains Data.'
   }
   $modules = Join-Path $dataRoot 'Data\modules'
   New-Item -ItemType Directory -Path $modules -Force | Out-Null
   Copy-Item -LiteralPath '.\dist-foundry\lancer-briefings' -Destination $modules -Recurse -Force
   Test-Path (Join-Path $modules 'lancer-briefings\module.json')
   ```

   The last command should return `True`. Restart Foundry so Setup discovers the package. **Add-on Modules** should list **Lancer Briefings**.
3. Launch the test world as GM. Open **Game Settings → Manage Modules**, enable **Lancer Briefings**, and save. After the world reloads, select **Token Controls** and click the clipboard button labeled **Lancer Briefings**.
4. Confirm that Mission Status opens. Check the mission text and status icon, open the Cressidium viewer from the header, and check the globe textures and location markers. Switch to **Pilots**, **Logs**, and **POIs**. Open a pilot or mech detail, read an event, and change the selected person to check the bundled images and data.
5. Resize and minimize the window, then click the toolbar button to restore it. Close it and click the button again. Check the browser's console and network panel for missing module assets. The iframe should navigate with hashes, while the parent Foundry page stays on its game URL.
6. Join the same world as a player and verify that **Token Controls → Lancer Briefings** opens a separate local window. Opening or navigating it should leave the GM's window where it was.

After rebuilding, repeat the copy command and reload the Foundry client to pick up changes.

## Edit briefing content

1. As GM, open **Status → New mission**. Enter a unique mission number, title, status, and Markdown briefing, then select **Save to world**. Choose a mission card and select **Edit mission** to revise it. **Show to players** controls visibility in both the mission list and Current Assignment.
2. Open **Logs → New log** to add a log. The thumbnail field accepts a URL or a bundled path such as `/icons/orbital.svg`. Select **Read More**, then **Edit log**, to revise an existing log. Use **Show to players** in either form and save. Hidden logs stay in the GM's list with a visibility label.
3. To remove an entry, open its edit form, select **Delete mission** or **Delete log**, and confirm. The deletion applies to the active world.
4. Open the Cressidium globe and select **Edit planetary description**. Save the Markdown description to update the planetary viewer.
5. Close and reopen the briefing or reload Foundry to verify your changes. As a player, verify that the new description and shown logs appear, and that hidden and deleted entries are absent.

Mission visibility updates in open player briefings after saving. Players can reopen the window to pick up changes to event logs. The header subtitle is edited separately under **Edit header**. Visibility applies to the briefing interface. Foundry world settings and bundled Markdown remain readable by clients.

On **POIs**, choose **New POI**, or select a person and choose **Edit POI**. Use **Show to players** to control visibility and **Delete POI** to remove the record after confirmation. Open player briefings update when the GM saves.

## Edit the header, reserves, and clocks

- On **Status**, choose **Edit header** to update the title, subtitle, and deployment fields.
- On **Status**, use **New reserve** or **Edit reserve** to manage a reserve. Use **New clock** or **Edit clock** to set the name, description, segment count, filled segments, and color. The edit forms also offer confirmed deletion.

## Switch operations

1. As GM, view the active operation and select **New operation**. Enter its name and optionally its planet, then choose **Start operation**.
2. The current briefing becomes a read-only archive. The active briefing starts with the current pilot roster, and linked pilots continue to receive COMP/CON updates in the active operation.
3. Choose any archive or the active briefing from the **Operation** dropdown. The selection is local to each briefing window.
4. To resume an archive, view the active operation as GM, select **Switch active**, choose an operation, and select **Switch operation**. The selected briefing becomes active with its saved pilot roster and the previous one is archived.

## Link pilots from COMP/CON

1. Create or select a LANCER pilot actor. Use its **RM-4://SYNC** tab to enter and download a COMP/CON sharecode. The **Open pilot sheet** button in Briefing **Pilots** opens the selected actor.
2. As GM, select the actor under **Pilots** and choose **Link pilot** to publish its briefing fields. A linked callsign takes the place of its matching bundled pilot. Choose **Refresh pilot** to publish the current actor fields on demand.
3. Later sharecode downloads update the roster while a GM is connected. **Unlink pilot** removes the published snapshot from the briefing and leaves the Foundry actor available.
4. To remove any pilot from the roster, use **Remove pilot** on its card and confirm. This also removes the matching bundled card if the pilot was linked to one. Foundry actors remain available to link again.

## Change portraits and the globe texture

1. As GM, open **POIs**, select a person, and click **Change portrait**. In Foundry’s File Picker, select an image or upload one to your world’s assets, then click **Select File**.
2. Open the Cressidium globe and click **Change globe texture**. Pick a surface image. A 2:1 equirectangular map fits the sphere. The header globe and the full viewer use the same surface texture.
3. Choose **Use default portrait** or **Use default texture** to restore the bundled image. Reopen the briefing as a player to verify the world’s selections.
