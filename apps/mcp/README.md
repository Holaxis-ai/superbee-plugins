# Experimental Superbee MCP app

Use this standalone stdio server with an MCP Apps host to display a workspace document,
run a registered or temporary View, and approve individual field changes. The plugin owns
the MCP tools, presentation resources and confirmation screens. The installed Superbee
CLI library selects the working copy and enforces launch, approval and document-version checks.

This source installation supports macOS and Linux with Node 24 and npm. Starting the server without a
workspace argument enables catalog mode. Use `list_workspaces` to find the ID or label for
displaying documents, searching or opening Views. A checkout can also
list and run the reads its host offers. Only a temporary View explicitly requesting
`access: none` can open without a selected workspace. Its lifetime stays independent of
all workspaces. Pass `--dir` or `--workspace` to pin the server to one bundle.

## Claude Desktop on macOS

Open the preview `.mcpb` file with Claude Desktop. Review the extension, choose the local
Superbee bundle folder and enter the actor for confirmed edits, such as `human:editor`.
Alternatively, enable **Use the workspace catalog** to choose a workspace per tool call.
The extension includes the compatible workspace library and runs with Desktop’s Node runtime.
The manifest requires Node 22.14+ in the 22 series, 24.x or 26.x. This is an unsigned local
preview. Installation depends on the extension policy for your Desktop installation.

In a new chat, ask Claude to use **Superbee (experimental)** to show an existing document by
its bundle-relative ID (for example, `tasks/first-task`). Check that the document renders.
Remove **Superbee (experimental)** under **Settings → Extensions**, then start a new chat
and confirm another configured server is usable. The Desktop extension and the manual
`superbee-mcp install` below have separate registrations. Use one for each workspace in
Desktop to avoid showing duplicate tools.

Maintainers can build the file after installing the compatible CLI tarball from the next
section. From `apps/mcp`, run `npm run desktop:pack`, then `node test/desktop.mjs`. The
output is `out/superbee-experimental.mcpb`. Pull request CI provides the same file inside
the `superbee-desktop-preview` artifact and exercises it on macOS with the MCPB resolver
and a stdio client. Live Desktop acceptance also requires opening the file in the app.

## Build the compatible pair

Use a clean OSS checkout at `051a0b4204799c6fc2fbb7eefc067ab2f7c91fa2` and this plugin checkout.
The published CLI library with the same prerelease number predates the required
catalog and bundleless View exports in `@superbee/cli/view-workspace/v1`. Build the
compatible CLI tarball from source.
The following commands use absolute paths so the MCP host can start the app from any directory.

```sh
oss=/absolute/path/to/superbee
plugins=/absolute/path/to/superbee-plugins
artifacts=$(mktemp -d)
cd "$oss"
git checkout --detach 051a0b4204799c6fc2fbb7eefc067ab2f7c91fa2
npm ci
npm run build
npm pack -w @superbee/cli --ignore-scripts --pack-destination "$artifacts"

cd "$plugins/apps/mcp"
npm ci
npm install --no-save --package-lock=false --ignore-scripts "$artifacts"/superbee-cli-*.tgz
npm run build
npm run typecheck
npm pack --ignore-scripts --pack-destination "$artifacts"
```

## Install and select a workspace

Install both tarballs under a dedicated prefix. A package install starts no server and adds
no host registrations.

```sh
prefix="$HOME/.local/share/superbee-experimental-mcp"
npm install --prefix "$prefix" --ignore-scripts --no-audit --no-fund \
  "$artifacts"/superbee-cli-*.tgz "$artifacts"/superbee-experimental-mcp-*.tgz
"$prefix/node_modules/.bin/superbee-mcp" --help
```

Register the installed executable in the client you use. For example, with Codex:

```sh
mcp="$prefix/node_modules/.bin/superbee-mcp"
"$mcp" install --host codex --dir /absolute/path/to/bundle --actor human:editor
"$mcp" status --host codex
```

Choose `codex`, `claude-code`, `claude-desktop` (macOS), or `opencode`. You can replace
`--dir` with `--workspace planning` for a registered catalog label or ID. Omit both selectors to
register the catalog-mode server and call `list_workspaces`. A fixed-workspace install checks
that the workspace can open with the supplied actor. Keep this prefix and its Node installation
available to the client. Restart the client after a changed registration.

The plugin manages the user-level entry named `superbee-experimental`. The bundled CLI
uses the separate name `superbee`. Repeating the same install is safe. To switch workspace
or actor, uninstall the experimental entry and install it again. A same-name entry with
custom settings needs manual review in the client. OpenCode reads either its v1 or v2
configuration, including JSONC. If multiple standard files exist, select the intended file
with an absolute `OPENCODE_CONFIG`. Manage inline OpenCode configuration directly.

Use `show_document` to display Markdown and `list_views` or `show_view` for a registered
View. A temporary View uses `show_view` with `mode: "transient"`, exact HTML and declared
access. The App shell collects local trust and a separate decision for each proposed edit.
To roll back, run the following before removing the dedicated installation. Restart
the client and use its existing bundled registration if configured.

```sh
"$mcp" uninstall --host codex
"$mcp" status --host codex
```

Repeat uninstall for each client where you installed the plugin, then remove the packages
from the dedicated prefix.

## Verify an installation

From this directory, run `node test/acceptance.mjs /absolute/path/to/cli.tgz` after building.
The test packs the plugin, installs both tarballs offline in a temporary directory and uses
a real MCP client over stdio. Add `--browser` after installing Playwright Chromium to run
both production App screens with a synthetic MCP Apps host. The test uses synthetic files
and a temporary home.

To compare the installed plugin with the bundled CLI, run the following from this directory.
The test creates isolated workspaces and a local hosted-service fixture.

```sh
node test/catalog-parity.mjs "$artifacts"/superbee-cli-*.tgz "$oss/packages/superbee/dist/superbee.mjs"
```
