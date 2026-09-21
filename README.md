# Desktop Habitats

![Riverscape running as a live macOS wallpaper, behind desktop icons and widgets](docs/images/riverscape-desktop.png)

Have you always wanted an aquarium? Now you can have it, right on your desktop :)

The fish react to your cursor and compete for food, while the plants sway in a slow current. I plan to add more environments soon. For now, there is only Riverscape, a planted freshwater aquarium.

The scene is rendered live with Three.js and WebGL2. Everything runs locally, with no account or internet connection needed after setup. Desktop wallpaper support is provided by the native macOS app and a local Windows Wallpaper Engine project; you can also try Riverscape in a browser. The app opens Riverscape directly.

## Install on Mac

You need macOS 13 or newer and the Xcode command line tools. To install the tools, open Terminal and run:

```sh
xcode-select --install
```

Wait for that installation to finish. Download and unzip this repository, or clone it, then open Terminal in the project folder and run:

```sh
sh wallpaper/install.sh
```

The script builds the app for your Mac, installs it at `~/Applications/Desktop Habitats.app`, and starts it. It also adds a login item so the aquarium starts when you sign in. Allow about 20 seconds for the first frame to appear.

During installation, macOS may ask whether Terminal can control System Events. This lets the installer set a still image of the aquarium as your desktop picture, underneath the animation. You can decline; the live wallpaper will still work.

You don't need Node.js for the wallpaper. If you already have it, `npm run wallpaper` runs the same installer.

## Install on Windows with Wallpaper Engine

Windows uses the included web-wallpaper project. It does not replace or modify Wallpaper Engine's Workshop data, and it does not require Steam Workshop publishing.

Requirements:

- Windows 10 or newer
- Wallpaper Engine installed
- Node.js 20 or newer only if you plan to edit and rebuild the source

Clone this repository, then copy the Riverscape project into Wallpaper Engine's local projects folder. In PowerShell from the repository root:

```powershell
$wallpaperEngine = Join-Path ${env:ProgramFiles(x86)} 'Steam\steamapps\common\wallpaper_engine'
$source = Join-Path $PWD 'scenes\riverscape'
$target = Join-Path $wallpaperEngine 'projects\myprojects\desktop-habitats-riverscape'
New-Item -ItemType Directory -Force -Path $target | Out-Null
Copy-Item -Path (Join-Path $source '*') -Destination $target -Recurse -Force
```

Open Wallpaper Engine, select **Riverscape • Desktop Habitats** from the local projects, and assign it only to the display you want to use. The Windows entry point is `scenes/riverscape/wallpaper-engine.html`. Move the pointer to the bottom center of the portrait display to reveal the tank-view slider and drag it left or right.

To edit the source, rebuild the bundled Windows entry after changing `scenes/riverscape/src/`:

```powershell
npm run build:windows
node --check scenes/riverscape/riverscape-wallpaper.bundle.js
npm test
```

Copy the updated `scenes/riverscape/` directory to the local Wallpaper Engine project again, then reload the wallpaper. The source project does not edit other monitor assignments.

## Use the wallpaper

Click the fish icon in the menu bar:

- **Feed** drops ten pellets into each screen's tank. Uneaten pellets dissolve after 20–40 seconds of running simulation time, measured from when they touch the water.
- **Pause / Resume** controls the animation. Your choice is remembered across restarts.
- **Quit** closes the app until you open it again or next sign in.

Move your cursor near the fish to see them react. Desktop icons, clicks and dragging work as usual. To feed the fish, use the menu; clicking the desktop does not drop food.

## FAQ

### Does it work on Windows or Linux?

Windows is supported through the local Wallpaper Engine web project described above. The native desktop app supports macOS. Linux can use the browser preview, but there is no Linux wallpaper installer.

### Will it drain my battery?

It uses more power than a still wallpaper because it renders a 3D scene. The amount depends on your Mac, screen resolution and number of displays. There isn't a measured battery-life estimate yet.

The optimized build thins the rear rivergrass by about 30%, reduces oversampling and shadow work, and fully stops the render loop when paused or hidden. It keeps 4× multisampling, the HDR lighting, all 24 fish and the foreground planting. On an M5 Pro this halves the GPU time per frame; battery drain has not been measured.

The wallpaper keeps the same frame-rate limits, so rendering improvements are not spent on extra frames:

| Desktop state | Rendering |
| --- | --- |
| Clearly visible, plugged in | Up to 60 fps |
| Clearly visible, on battery | Up to 30 fps |
| Mostly covered by windows | Up to 20 fps |
| Almost entirely covered | Stopped |
| Low Power Mode, locked screen or sleeping display | Stopped |

Pause it from the menu when you want a still aquarium, or quit to close the app completely. These power controls belong to the wallpaper app; the browser preview does not have the same battery-aware limits.

### Does it monitor my keystrokes?

No. The wallpaper does not listen to typing in other apps or record keystrokes. The browser preview handles Space and F only while that page has focus, for pause and fullscreen.

The wallpaper reads your cursor position so the fish can react. It also checks window positions and sizes to estimate how much of the desktop is visible. It does not capture the contents of those windows, store cursor history, or send this information anywhere.

### Does it need internet access or special permissions?

Once installed, the aquarium works offline. Its code, textures and Three.js library are bundled with the app. There are no analytics or external services.

The app does not request Accessibility, Input Monitoring or Screen Recording access. The optional System Events prompt during installation is for changing the still desktop picture.

### Why have the fish stopped moving?

Open the fish menu to see the current status. The wallpaper stops when it is almost entirely covered, in Low Power Mode, and while the screen is locked or asleep.

If Reduce Motion is enabled in macOS, the aquarium starts paused unless you have already saved a different choice. Choose **Resume** to animate it. Low Power Mode must be turned off before animation can resume.

### Can I use multiple monitors?

Yes. Each display gets its own aquarium, and **Feed** drops food on every display. Each tank renders separately, so more displays can increase power use.

### Do I need to leave Terminal open?

No. The installed app has its own copy of the scene and runs independently. You can close Terminal once installation finishes.

### How do I update it?

Download or pull the latest source, then rerun `sh wallpaper/install.sh` from the project folder. Editing the source alone does not update the installed app. If you installed the earlier Aquatica version, the installer removes its app and login item before starting Desktop Habitats. Its old still image and saved preference are left behind; the new app starts with its own preference.

### How do I remove it and get my old wallpaper back?

From the project folder, run:

```sh
sh wallpaper/uninstall.sh
```

Or use `npm run unwallpaper`. This stops the app, removes its login item and deletes the installed app.

The still image at `~/Pictures/Desktop Habitats.png` stays behind, along with the desktop picture setting. Choose your previous wallpaper in System Settings, then delete the image if you no longer want it. The saved pause preference is also retained.

## Try it in a browser

With Node.js 20 or newer, run this from the project folder:

```sh
npm start
```

Open [the local preview](http://127.0.0.1:8080). There is no `npm install` step; the library is included. Use `PORT=8081 npm start` if port 8080 is busy, and Ctrl+C to stop the server.

- Click the water to drop food.
- Move the pointer near the fish to interact.
- Press **Space** to pause or resume, and **F** for fullscreen.

Reduce Motion starts the preview paused. Serve the page over HTTP; opening `index.html` directly will not load its JavaScript modules. Any static server also works, such as `python3 -m http.server 8080 --bind 127.0.0.1` if you have Python installed.

## Development

One water model drives the plants, drifting particles, fish and underwater lighting. Fish alternate between swimming and coasting, explore the tank, avoid neighbours and compete for pellets. The scene uses raster rendering with custom GLSL shaders, shadows and depth effects.

Riverscape lives in `scenes/riverscape/`, including its textures and tests. Future scenes can live alongside it. The Mac app currently loads Riverscape directly; there is no scene picker or plugin system.

| Files | Purpose |
| --- | --- |
| `scenes/riverscape/index.html`, `wallpaper.html`, `style.css` | Riverscape's preview and wallpaper layouts |
| `scenes/riverscape/src/` | Fish, feeding, plants, water, terrain and rendering |
| `scenes/riverscape/assets/` | Rock, wood and sand textures |
| `scenes/riverscape/tests/` | Riverscape's headless simulation checks |
| `wallpaper/` | Mac app and install/uninstall scripts |
| `vendor/` | Bundled Three.js library and license |
| `index.html`, `serve.mjs` | Default preview entry and local server |

Run the checks with Node.js:

```sh
npm run check
npm test
```

These check JavaScript syntax; simulate swimming, spacing, startle responses and feeding; verify render budgets and frame pacing at 60/120 Hz; and confirm that rear-grass thinning leaves the foreground geometry and downstream random sequence unchanged. They also check that paused/hidden scenes have no scheduled render callbacks. They do not measure Mac battery use.

The default rendering profile is `balanced`. Append `?quality=reference&still=1` to a scene page for the original density/render budgets at simulation time zero, or `?still=1` for the optimized still. Append `diagnostics=1` to enable the local `habitatBenchmark()` function. Nothing is uploaded.

Browser errors appear in the developer console. Wallpaper errors and frame-rate changes go to `/tmp/desktop-habitats.log`. Sending `SIGUSR1` to the Desktop Habitats process saves a snapshot of its first tank to `/tmp/desktop-habitats.png`.

If you change the app's bundle ID, update `com.chaselean.desktop-habitats` in `wallpaper/install.sh`, `wallpaper/uninstall.sh` and `wallpaper/Info.plist` together.

## Work with GPT or Claude

This repository is intentionally structured so an AI coding assistant can extend it without rebuilding the aquarium from scratch. Give the assistant the repository, this README, and the exact change you want. Ask it to inspect the existing implementation before editing.

The main entry points are:

- `scenes/riverscape/src/main.js` — scene setup, camera, rendering, pointer input and wallpaper hooks
- `scenes/riverscape/src/fish.js` — the original fish movement, schooling, cursor response and feeding behavior
- `scenes/riverscape/src/imported-fish.js` — optional GLB fish loading, species counts and imported-fish motion
- `scenes/riverscape/src/environment.js`, `plants.js`, `water.js` — tank layout, plants and water effects
- `scenes/riverscape/wallpaper-engine.html` and `style.css` — Windows Wallpaper Engine UI and layout
- `scenes/riverscape/riverscape-wallpaper.bundle.js` — generated Windows bundle; rebuild it after source changes
- `THIRD_PARTY_ASSETS.md` — required attribution and asset-change record

For a code change, this prompt is a useful starting point:

```text
You are modifying the Desktop Habitats Riverscape repository.

First read README.md, scenes/riverscape/src/main.js, fish.js, imported-fish.js,
environment.js, plants.js, water.js, wallpaper-engine.html, style.css, and
THIRD_PARTY_ASSETS.md. Explain which existing functions and data structures you
will reuse before editing.

Implement only the requested change. Preserve the existing aquarium layout,
fish movement, schooling, cursor response, feeding, water, plants, lighting and
the macOS preview unless the request explicitly changes them. Do not replace the
scene with a new implementation. Keep Windows-specific behavior in the Windows
entry point where possible.

If you add a third-party model, texture or animation, use only a downloadable
free asset with a clear license. Reject paid, trial-only and unclear-license
assets. Record the author, source URL, license, attribution requirement,
animation status, files and modifications in THIRD_PARTY_ASSETS.md.

After editing, run node --check on changed JavaScript, rebuild
scenes/riverscape/riverscape-wallpaper.bundle.js when source code changed, and
run npm test. Report the files changed, tests run, licensing evidence and any
runtime limitation. Then follow the "Post-implementation feature walkthrough"
section below. Do not silently change other monitor settings or push to a
remote repository without explicit permission.
```

### Post-implementation feature walkthrough

After a successful implementation, the LLM should give the user a short, practical feature tour instead of ending at “implemented”. Use this order:

1. **Move the tank camera:** explain that hovering near the bottom center reveals the **Tank view** slider, and dragging its knob moves the camera horizontally without rebuilding the aquarium layout.
2. **Change the fish mix:** explain where the fish-count UI appears, what the `+` and `−` controls do, and that the shared total-fish limit protects performance.
3. **Feed the fish:** explain the actual feeding control for the current host. The browser preview feeds by clicking the water; the macOS wallpaper uses its menu-bar **Feed** command. For Windows Wallpaper Engine, state clearly whether click-to-feed was verified for that host and never present an unverified control as guaranteed.
4. **Show cursor interaction:** explain that fish read the pointer position and react or move away from a nearby/fast cursor, while normal desktop input should remain usable.
5. **Close with limitations and checks:** state which host was tested, which monitor was targeted if relevant, what tests passed, and any interaction that depends on the host delivering pointer events.

A concise final response can use this shape:

```text
Implemented and tested: [short change summary].

How to use it:
1. Tank camera — [hover location] → [drag action].
2. Fish mix — [UI location] → [plus/minus behavior and total limit].
3. Feeding — [host-specific verified action].
4. Cursor response — [what the fish do].

Verified on: [host/display]. Tests: [commands/results].
Limitations: [only if applicable].
```

## Credits and license

Desktop Habitats is [MIT licensed](LICENSE). Three.js 0.180.0 is bundled under its [MIT license](vendor/THREE-LICENSE.txt).

The rock, wood and sand textures come from Poly Haven under [CC0](https://polyhaven.com/license): [Rock Boulder Dry](https://polyhaven.com/a/rock_boulder_dry), [Rough Wood](https://polyhaven.com/a/rough_wood) and [Sand 01](https://polyhaven.com/a/sand_01).
