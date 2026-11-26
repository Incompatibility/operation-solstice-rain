[![Netlify Status](https://api.netlify.com/api/v1/badges/55d0e9f5-8e0d-422e-a3d0-38a79ecf2413/deploy-status)](https://app.netlify.com/sites/lancer-briefings/deploys)

# Lancer Briefings

**[Live Demo](https://lancer.kuenaimaku.com/)**

Go over mission briefings within the LANCER Universe in style by showing your players a fully animated mission briefing screen, with a Mirrorsmoke Mercenary Company theme.

## Credits

- Alkyama#2737 (discord) for the original [Figma Template](figma.com/community/file/983540597915480981) used as reference.
- [VantaJS](https://www.vantajs.com/) for the slick 3d openGL backgrounds.

## Requirements

- Node.js (v22 recommended)
- Light Text Editor (VSCode Recommended)
- Recommended VSCode extensions:
  - Color Info
  - Color Vision
  - IntelliCode
  - npm Intellisense
  - Path Intellisense
  - JSON Tools
  - SVG
  - TypeScript Vue Plugin (Volar)
  - Vue Language Features (Volar)

## Setup

`npm install`

## Build Scripts

`npm run dev` - Serve the webapp with hot reloads (for development work)  
`npm run build` - Build for production  
`npm run build:foundry` - Build the installable Foundry module\
`npm run serve OR npm run preview` - Locally preview production build  
`npm run format` - Format all code files using `prettier` based on rules set in `.prettierrc.json` (for development work)  

## Customization

Customization is handled in a couple of places.

### _base.css

This file holds a majority of the colors, fonts, and sizes of the webapp. Play around with the values in the marked customization section.

### Background

`src/background.js` configures the bundled VantaJS globe background. Adjust the `VANTA.GLOBE` options there to customize it.

### /public folder

This folder holds all of the local image, audio and video assets.

- `/faction-logos` - SVG files for the logos of each major faction, currently used for mapping icons to mech manufacturers.
- `/icons` - If you want to replace the icons used across the application, this is where you'd swap them.
- `/pilots` - This is where the images of pilots and their bios are held. Filenames MUST match the `callsign` property on pilots.
- `/mechs` - This is where the images of mechs are held. Filenames MUST match the `mech` property on pilots.
- `bullet.webp` - This replaces the default bullet point in Markdown areas.
- `planet.webm` - This is the planet rotation video used in the header.
- `startup.ogg` - This is the sound that plays on page load.

### src/assets folder
- `/clocks` - This is where the json for relevant mission or overarching story Clocks are held. You can add and configure clocks by adding or modifying json objects to the list.
- `/events` - This is where the json for relevant mission or overarching story Clocks are held. You can add and configure clocks by adding or modifying json objects to the list.
- `/LCPs` - This is where unzipped LCPs will be expected to be read from. I have kept an example of how to create a proper import via `wallflower-data`.
- `/missions` - This is where the summaries of missions are held. The filename MUST match the `slug` property within the App's data.
- `/pilots` - This is where the json of pilots (exported from Comp/Con) are held. Filenames MUST match the `callsign` property on pilots.
- `/reserves` - This is where the json of reserves for the pilots are held. Any reserves on each individual pilot's exported data will also be added to the reserves.
- `/info/general-config.json` - Edit this to change which mission loads initially, set the pilot information, and other ease-of-use options that have been introduced to modify how the site works. Below are the values you might have to change.
  - `initialSlug` - Controls what mission file is selected on startup. This MUST match the slug of a markdown file within the `/public/missions/` directory.
  - `planetPath` - The path (relative to the root directory of this repository) to the .webm or .gif file to use for the planet video element.
  - `defaultTitle` - Sets the prefix for the title of each page (the text that shows up in your browser tab).
  - `icon` - The public asset path for the default header icon and browser favicon.
  - `theme` - The default briefing color theme. Use `union`, `cobalt`, `emerald`, or `amber`.
  - `header` - Reads from the `header` JSON object to determine what text to place on each element of the `Header.vue` Component.

### /src/components/pilot.vue

This file contains all the import of lcp-related material. Look at line 150 for an example of how to extract and import LCPs into this website.


## Hosting Recommendations

I would strongly recommend using [Netlify](https://www.netlify.com/) for hosting, as there's no cost for hosting, has Continuous Deployment, and they'll provide a url. Register for an account, and click the `New Site from Git` button.
On the next page, pick the git service you used to fork this repo with, and authenticate. On the next page, select the `lancer-briefings` repository. If you can't see the repository listed on the page, click the `Can’t see your repo here? Configure the Netlify app on <git site>` link at the bottom of the page.
Finally, make sure the branch being deployed is `master`, the `base directory` field is blank, the `build command` is `npm run build`, and the publish directory is `dist`.

Once the site builds remotely, click on the link provided in the `site overview` tab and make sure everything looks right.

Alternatively, if you use github, you can probably rely on github-pages. Take a look at the [vite documentation](https://vitejs.dev/guide/static-deploy.html#github-pages) for more info.

## Usage within FoundryVTT

The native module targets Foundry VTT 13.351 with LANCER 3.1.3. Build it with `npm run build:foundry`, then copy `dist-foundry/lancer-briefings/` into the v13 instance's `Data/modules/` folder. On Windows, use **Browse User Data** from that instance's taskbar menu to find the folder. Enable **Lancer Briefings** in your LANCER world and open it from **Token Controls**. See [AGENTS.md](AGENTS.md) for the installation commands and smoke test.

GMs can add, edit, and delete missions and logs, choose which logs appear in the player briefing, and edit the planetary description from the Cressidium viewer. Saves belong to the active world. Players see the latest visible content when they open the briefing.

On **POIs**, GMs can use **New POI** and **Edit POI** to manage personnel records. Clear **Show to players** to hide a record, or select **Delete POI** and confirm removal. Use **Change portrait** on a saved record or **Change globe texture** in the planetary viewer to pick images through Foundry’s File Picker.

On **Status → Edit header**, GMs can pick a **Header icon** with Foundry’s File Picker and preview a **Color theme** in the dropdown. **Save to world** applies both choices to the active world. GMs can also edit reserves and clocks on **Status**. On **Pilots**, link a LANCER pilot actor to publish its briefing details and pick up later COMP/CON imports from its **RM-4://SYNC** tab.

Use the **Operation** dropdown to browse the active briefing or an archive. **New operation** archives the current briefing and starts a fresh one with the current pilot roster. To resume a saved operation, open the active briefing and select **Switch active**. The selected operation becomes editable again with its saved roster, and the previous operation becomes read-only.
