# Lancer Briefings — Foundry VTT

**A Foundry VTT adaptation of [Lancer Briefings](https://github.com/Kuenaimaku/lancer-briefings), originally developed by [Kuenaimaku](https://github.com/Kuenaimaku).**

Bring animated, interactive mission briefings directly into your **LANCER** campaign in Foundry Virtual Tabletop.

Lancer Briefings is designed to provide GMs with a customizable military-style briefing interface for presenting missions, intelligence reports, personnel profiles, and campaign information to their players.

This adaptation aims to integrate the original briefing interface directly into Foundry VTT, replacing external website hosting with native Foundry functionality while preserving the original project's visual identity and customization options.

**Current Status:** Work in Progress — Foundry V13 Development

**Supported Foundry Version:** V13

## Features

The existing briefing interface includes:

- Animated, military-themed mission briefing interface.
- Customizable faction branding, colors, and header information.
- Mission logs and mission-specific briefings.
- Event and intelligence logs.
- Pilot and personnel profiles.
- Mission reserves and progression clocks.
- Markdown-based briefing content.
- Interface sound effects.
- Interactive Three.js planetary viewer.
  - Custom planetary surface textures.
  - Atmospheric effects and independently rotating cloud layers.
  - Mouse-controlled rotation and zoom.
  - Pause and resume controls.

### Planned Foundry Integration

The following features are planned for the Foundry module:

- Native Foundry application window.
- Direct access to briefings from the Foundry interface.
- GM-controlled campaign progression.
- Synchronized briefing states for connected players.
- Persistent campaign data stored within the Foundry world.
- Integration with Foundry Journal Entries.
- In-Foundry editing of mission briefings and intelligence reports.
- GM-only editing and publishing controls.
- Configurable player access to campaign information.

These features will be introduced progressively throughout development.

## Credits

- **[Kuenaimaku](https://github.com/Kuenaimaku)** — Original [Lancer Briefings](https://github.com/Kuenaimaku/lancer-briefings) project.
- **Alkyama#2737 (Discord)** — Original [Figma template](https://www.figma.com/community/file/983540597915480981) used as reference for Lancer Briefings.
- **[VantaJS](https://www.vantajs.com/)** — Visual background effects used in the original web application.
- **[Three.js](https://threejs.org/)** — Interactive 3D planetary rendering.
- **[Massif Press](https://massifpress.com/)** — Creators of LANCER.

This project builds upon the original work and would not exist without its contributors.

## Requirements

### For Players and GMs

- Foundry Virtual Tabletop V13.
- A modern browser with WebGL support.
- A Foundry world with the module installed and enabled.

This project is developed with LANCER in mind, although the briefing interface is intended to remain largely independent of game-system-specific mechanics.

### For Development

- Node.js (current supported LTS version recommended).
- npm.
- A text editor (VS Code recommended).
- Foundry Virtual Tabletop V13.
- Git.

Recommended VS Code extensions:

- Vue - Official (Volar).
- ESLint.
- Prettier.
- Path Intellisense.
- JSON Tools.

## Setup

### Development Setup

Clone the repository and install dependencies:

`git clone <your-repository-url>`

`cd <repository-folder>`

`npm install`

The project is based on Vue 3, Vite, and Three.js.

The Foundry module integration is currently under development. Installation and build instructions will be updated as the module architecture is finalized.

## Build Scripts

The original web application provides the following npm scripts:

- `npm run dev` — Start the Vite development server.
- `npm run build` — Build the application for production.
- `npm run preview` — Preview a production build locally.

Foundry-specific build and packaging scripts will be documented once implemented.

## Customization

Customization is handled through the application's configuration files, Vue components, and static assets.

Future versions will aim to expose many of these options through Foundry's settings interface.

### _base.css

Located in `src/assets/styles/`.

This stylesheet contains many of the application's primary colors, fonts, and interface dimensions.

It can be modified to adjust the visual appearance of the briefing interface.

### /public Folder

Contains local image, audio, video, and other visual assets.

Depending on the project configuration, assets may include:

- `/faction-logos` — Faction and organization logos.
- `/icons` — Interface icons.
- `/pilots` — Pilot portraits and associated images.
- `/mechs` — Mech images.
- `/planets` — Planetary surface and cloud textures.
- `/pois` — Persons of Interest portraits.
- `startup.ogg` — Startup audio.
- `bullet.webp` — Custom Markdown bullet graphic.

### src/assets Folder

Contains the configuration files and campaign information used by the briefing application.

- `/missions` — Mission summaries and briefing Markdown.
- `/events` — Event logs and reports.
- `/clocks` — Mission and narrative progression clocks.
- `/reserves` — Available reserves.
- `/pilots` — Pilot information imported from COMP/CON.
- `/info` — General configuration and additional campaign data.
- `/planet-briefings` — Planetary intelligence reports written in Markdown, where configured.

### General Configuration

The original application's `general-config.json` controls settings such as:

- Initial mission selection.
- Header text and branding.
- Browser title and icon.
- Pilot information.
- Planetary media paths.

As Foundry integration progresses, relevant settings will be migrated to native Foundry configuration and persistent world data.

### Planetary Viewer

The interactive planetary viewer is built using Three.js.

It supports custom equirectangular planetary maps, independent cloud layers, atmospheric glow, and interactive camera controls.

Planetary textures and associated information can be customized to represent the worlds featured in your campaign.

## Foundry VTT Installation

**The Foundry module is currently in development and is not yet available as a stable release.**

Once a compatible release is available, installation will be supported through Foundry's module installation interface or a module manifest URL.

Planned installation process:

1. Download or install the module through Foundry's Add-on Modules interface.
2. Enable Lancer Briefings in your world.
3. Configure the module through its settings.
4. Open the briefing interface from within Foundry.

The final installation instructions and manifest URL will be provided when a release is available.

## Usage within Foundry VTT

Unlike the original web-based Lancer Briefings project, which relies on external hosting and the Inline Webviewer module, this adaptation aims to run directly inside Foundry.

The intended workflow is to allow GMs to prepare and display campaign briefings, share relevant information with players, and manage campaign progression without leaving Foundry.

### GM Campaign Management

Planned functionality includes the ability to define multiple campaign states, such as initial briefings, active missions, and post-mission reports.

The GM will be able to select the active state and control which information is available to players.

### Editing Briefing Content

Future development will explore using Foundry Journal Entries and document editing tools to manage briefing content without manually modifying source files.

### Player Synchronization

The intended design allows connected players to access the current campaign briefing, with relevant content and campaign-state changes synchronized through Foundry.

## Development

This project is being developed as a Foundry V13 adaptation of the original Lancer Briefings application.

Development focuses on preserving the existing interface while progressively integrating Foundry's document storage, permissions, and application APIs.

The development branch is maintained separately from the original web version so that Foundry integration can proceed without disrupting the existing website.

Contributions, feedback, bug reports, and suggestions are welcome as development progresses.

## License

This project is derived from [Lancer Briefings](https://github.com/Kuenaimaku/lancer-briefings), originally developed by Kyle Humphrey and distributed under the MIT License.

The original MIT copyright notice and license terms remain applicable to the original software.

Licensing terms for new contributions and separately distributed creative assets will be documented as development progresses. Any additional licensing terms will not revoke permissions granted under the original MIT License.

LANCER and its associated intellectual property belong to their respective rights holders.

This is an unofficial third-party project and is not affiliated with or endorsed by Massif Press.

No ownership of LANCER or its official published material is claimed.
