# Packaging and Publication

Last verified: 2026-11-01. Publication status: not published by this workflow.

## Identity and license

The user chose MIT. LICENSE credits Project Execution Visualizer contributors for 2026. package.json declares MIT, the configured GitHub repository, its homepage, and its issue tracker. The existing publisher value lockitech was preserved; account ownership and Marketplace publisher registration have not been verified.

## Package boundaries

The package.json files allowlist includes src JavaScript, Node runtime CJS/MJS, Python runtime source, the compiled JS/CSS, the Activity Bar icon, generated third-party notices, README, LICENSE, and CHANGELOG. Do not also add .vscodeignore: current VSCE treats the strategies as alternatives.

Tests, samples, scripts, reports, raw webview source, development documentation including local_only, and node_modules are excluded. The host uses VS Code and Node built-ins; frontend dependencies are bundled by esbuild. The build gathers license text for packages actually present in the webview bundle and fails if a bundled package has no license text available.

## Commands

1. Run npm run vscode:prepublish. This builds and verifies the npm package candidate list without creating an archive or publishing anything.
2. Inspect reports/package-files.json. npm run check:package rejects missing runtime files and forbidden development/private directories.
3. Run npx @vscode/vsce package when ready to obtain the packaging tool and create a VSIX. This also runs vscode:prepublish. No packaging-tool dependency was installed by the preparation work.
4. Inspect and install the VSIX using VS Code's Install from VSIX action, then complete the desktop smoke checklist in 07_testing_and_delivery.md.
5. Only after explicit approval, upload the VSIX through the registered Marketplace publisher or configure an approved publication workflow.

The verified local preview is npm's candidate list, not a completed VSCE archive inspection. VSIX creation, desktop installation, publisher authentication, and Marketplace upload remain unverified. Generating a package does not authorize publishing it.

## Verification

Tests cover rejection of leaked local-only files and missing Python runtime adapters. Actual contents are reviewed by the package-preview command against every source file under src and runtime. The earlier CI workflow is absent from the current working tree; it was not recreated as part of packaging preparation.

The generated preview cache and file list remain in ignored reports/. VSIX files are also ignored. No credentials or publication token belong in package metadata, documentation, or the archive.

References: [official packaging guide](https://code.visualstudio.com/api/working-with-extensions/publishing-extension), [VSCE package collection](https://github.com/microsoft/vscode-vsce/blob/main/src/package.ts), and [MIT license text](https://opensource.org/license/mit).

## Icon update (0.0.2)

The Marketplace icon is media/icon.png (512 by 512 pixels). The manifest and distribution allowlist include it; package validation requires it. Version 0.0.2 was packaged locally with the cached VSCE tool. Archive inspection verified the version, exact icon bytes, and exclusion of private documentation. Marketplace upload and installed appearance remain unverified.

## Marketplace presentation update (0.0.3)

The display name is Code Execution Visualizer; the update identity remains lockitech.visualized-code. The README starts with the demo link and prioritizes installed-user setup, capabilities, requirements, and limitations. The video is hosted through the repository and excluded from the VSIX; its GitHub link requires the supplied MP4 to be committed and pushed to main. The local 0.0.3 archive was built and inspected; no Marketplace upload was performed.
