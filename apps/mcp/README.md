# Experimental Superbee MCP app

Use this standalone stdio server with an MCP Apps host to display a workspace document,
run a registered or temporary View, and approve individual field changes. The plugin owns
the MCP tools, presentation resources and confirmation screens. The installed Superbee
CLI library selects the working copy and enforces launch, approval and document-version checks.

This source installation supports macOS and Linux with Node 24 and npm. Each registration
selects a directory or an existing catalog ID or label. The catalog-wide discovery and
hosted-operation tools on the unbound bundled server remain part of the migration work.

## Build the compatible pair

Use a clean OSS checkout at `73acbce045d17c3fc97296901518c1b4ed2ae2f6` and this plugin checkout.
The published CLI library with the same prerelease number predates the required
`@superbee/cli/view-workspace/v1` export. Build the compatible CLI tarball from source.
The following commands use absolute paths so the MCP host can start the app from any directory.

```sh
oss=/absolute/path/to/superbee
plugins=/absolute/path/to/superbee-plugins
artifacts=$(mktemp -d)
cd "$oss"
git checkout --detach 73acbce045d17c3fc97296901518c1b4ed2ae2f6
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

Add a separate entry to the MCP Apps host's server configuration. Substitute the absolute
installation and workspace paths for the example values. Choose the actor to attribute to
confirmed changes. Use `--workspace planning` in place of `--dir /absolute/path/to/bundle`
to pin the process to an existing catalog label.

```json
{
  "mcpServers": {
    "superbee-experimental": {
      "command": "/absolute/path/to/install/node_modules/.bin/superbee-mcp",
      "args": ["--dir", "/absolute/path/to/bundle", "--actor", "human:editor"]
    }
  }
}
```

Use `show_document` to display Markdown and `list_views` or `show_view` for a registered
View. A temporary View uses `show_view` with `mode: "transient"`, exact HTML and declared
access. The App shell collects local trust and a separate decision for each proposed edit.
To roll back, remove the `superbee-experimental` registration, restart the host and use
the bundled registration. Uninstall the two packages from the dedicated prefix when finished.

## Verify an installation

From this directory, run `node test/acceptance.mjs /absolute/path/to/cli.tgz` after building.
The test packs the plugin, installs both tarballs offline in a temporary directory and uses
a real MCP client over stdio. Add `--browser` after installing Playwright Chromium to run
both production App screens with a synthetic MCP Apps host. The test uses synthetic files
and a temporary home.
