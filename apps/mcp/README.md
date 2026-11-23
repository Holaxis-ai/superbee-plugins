# Use Superbee in your AI client

Install this optional, experimental MCP app to open a Superbee document in chat, run an interactive View, or confirm a proposed field edit. You can use a local bundle folder or choose a workspace from your Superbee catalog. The normal Superbee browser UI and CLI work independently.

| Client | Installation | Platform |
| --- | --- | --- |
| Claude Desktop | Open the self-contained Desktop extension | macOS |
| Codex | Install the offline pair and register `--host codex` | macOS, Linux |
| Claude Code | Install the offline pair and register `--host claude-code` | macOS, Linux |
| OpenCode | Install the offline pair and register `--host opencode` | macOS, Linux |
| Claude Desktop with a manual MCP configuration | Install the offline pair and register `--host claude-desktop` | macOS |

The offline pair requires Node 24 and npm. Claude Desktop supplies its own Node runtime for the extension. Clients with MCP Apps support can display the document and View screens. A client that exposes tools only can verify the connection with `list_views`.

## Get the preview

Open a successful **CI** run for the revision you want. In the run summary, scroll to **Artifacts** and download **superbee-desktop-preview** for the Desktop extension or **superbee-mcp-offline-preview** for the two npm tarballs. Extract the downloaded ZIP. GitHub requires sign-in to download workflow artifacts and removes them when the run's retention expires. The source build below also works after an artifact expires. [CI runs](https://github.com/Holaxis-ai/superbee-plugins/actions/workflows/ci.yml) · [Preview pull request checks](https://github.com/Holaxis-ai/superbee-plugins/pull/58/checks)

Both previews are built from source. The npm pair contains the plugin and the matching CLI workspace library from the same CI run. Its `SOURCES` file records both Git commits. The public CLI prerelease with the same version number predates the required library exports.

## Claude Desktop on macOS

1. Open `superbee-experimental.mcpb` from the extracted **superbee-desktop-preview** download in Claude Desktop. Review the unsigned extension and install it if your Desktop policy allows it.
2. Choose the folder containing your Superbee bundle, or enable **Use the workspace catalog** to choose a workspace per tool call. Enter the actor to record for confirmed edits, such as `human:editor`.
3. Click **Save**. In **Settings → Extensions → Superbee (experimental)**, switch **Disabled** to **Enabled**. Start a new chat and follow [Verify in your client](#verify-in-your-client). To remove it, open **Settings → Extensions**, remove **Superbee (experimental)**, and start a new chat.

The macOS CI check installs the finished extension archive and starts separate servers for the tool call and the reader. It verifies the original revision after a document edit, concurrent redemption, and refusal from a different actor, workspace or installation. Check the title and body in a signed-in Desktop chat to verify the host itself.

The extension includes both screens and the compatible workspace library. Its manifest accepts Node 22.14+ in the 22 series, 24.x, or 26.x. Choose one Desktop installation method per workspace to avoid duplicate tools.

## Install the offline pair

Open a terminal **inside the extracted superbee-mcp-offline-preview folder** and verify the download.

```sh
shasum -a 256 -c SHA256SUMS
```

On Linux you can also use `sha256sum -c SHA256SUMS`. After all checks pass, install the two files in a dedicated location. Keep this prefix and its Node installation available to your client.

```sh
prefix="$HOME/.local/share/superbee-experimental-mcp"
npm install --prefix "$prefix" --offline --ignore-scripts --no-audit --no-fund \
  "$PWD"/superbee-cli-*.tgz "$PWD"/superbee-experimental-mcp-*.tgz
mcp="$prefix/node_modules/.bin/superbee-mcp"
"$mcp" --help
```

Installing the files and registering a server with a client are separate steps. If you already have a Superbee MCP entry, follow [Move from an existing `superbee mcp` entry](#move-from-an-existing-superbee-mcp-entry) before registering the preview.

Choose the host ID from the table above, your actor, and **one** workspace mode. For example, register a single folder in Codex like this. Substitute the actual path and the identity that should appear on confirmed edits.

```sh
host=codex
actor=human:editor
"$mcp" install --host "$host" --dir /absolute/path/to/bundle --actor "$actor"
"$mcp" status --host "$host"
```

- For a single registered workspace, replace `--dir /absolute/path/to/bundle` with `--workspace planning`, using its exact catalog label or ID.
- To choose from the private catalog in chat, omit both selectors. Use `list_workspaces` to select the workspace for subsequent tool calls. A hosted checkout can list and run the reads offered by its host. A temporary View with explicit `access: none` can run without a workspace.
- Registration uses the user-level name `superbee-experimental`. Repeating the same command is safe. For a different workspace or actor, uninstall the existing experimental registration before installing again. Customized same-name entries require manual review.
- OpenCode accepts v1 and v2 JSON/JSONC configurations. If both standard files exist, select the intended one with an absolute `OPENCODE_CONFIG`. Manage inline OpenCode configurations in the client.

## Move from an existing `superbee mcp` entry

Keep the existing `superbee` entry while you try the preview. In the client's server settings, check its complete launch command, working directory, arguments, environment and tool permissions. Read the existing `--actor` there, or the client's `SUPERBEE_ACTOR` if it supplies attribution through the environment.

- For an ordinary `superbee mcp --dir … --actor …` entry, run the new registration command above with the same folder and actor. Resolve any relative folder against the old launch's working directory.
- For an ordinary `superbee mcp --actor …` entry, use `"$mcp" install --host "$host" --actor "$actor"`. This preserves selection from the catalog. If the original entry inherits its actor or uses the default, keep that behavior with the manual route below.
- For a customized entry, make a **second** user-level registration in the client's settings named `superbee-experimental`. Duplicate the old entry's environment, working directory, approvals and restrictions. Change the server executable to the absolute installed `superbee-mcp` path. For a normal direct `superbee mcp` launch remove only the `mcp` subcommand and retain its remaining arguments exactly. If a wrapper launches the CLI, keep its setup and replace the wrapped server invocation in the duplicate. Keep inherited attribution inherited. Use the same restrictions for any client permission rules keyed by server name.

After restarting the client, select the experimental server explicitly and verify it below. If you prefer one set of tools, disable the old registration in the client after verifying the new one. Keep its settings so you can re-enable it.

## Verify in your client

Restart the client or start a new session, then select the experimental server. Ask it to **“Use Superbee experimental to show document `tasks/first-task`.”** Replace that ID with a Markdown document you know exists in the selected bundle. For example, `tasks/first-task.md` has the ID `tasks/first-task`. In catalog mode, also name the workspace label or ID. Check the expected title and content in the client. In a tool-only client, ask it to list registered Views for the same workspace and check that the tool succeeds.

Interactive clients can open a registered View with `show_view`. The View screen asks for trust and a separate confirmation for each proposed edit.

## Roll back

For a registration created with the command, run these from the installation shell. In a new shell, set `mcp="$HOME/.local/share/superbee-experimental-mcp/node_modules/.bin/superbee-mcp"` and `host` to the client you registered.

```sh
"$mcp" uninstall --host "$host"
"$mcp" status --host "$host"
```

Check for `"state":"absent"`. For a manually duplicated or customized entry, remove just `superbee-experimental` in the client. For the Desktop extension, use **Settings → Extensions**. Re-enable the original `superbee` entry if you disabled it, restart the client, and show the same document with the original server. Remove the dedicated package installation only after removing its registrations in every client.

## Build from source

Use Git, Node 24 and npm in a new directory. These commands fetch the preview PR explicitly and the pinned compatible OSS commit, including on a checkout made before the plugin PR merges.

```sh
work=$(mktemp -d)
artifacts="$work/artifacts"
mkdir "$artifacts"
git clone --no-checkout https://github.com/Holaxis-ai/superbee.git "$work/superbee"
git -C "$work/superbee" fetch origin refs/pull/767/head
git -C "$work/superbee" checkout --detach f68f62c533261467fb7c029fdc20283e3ef690ed
git clone --no-checkout https://github.com/Holaxis-ai/superbee-plugins.git "$work/superbee-plugins"
git -C "$work/superbee-plugins" fetch origin refs/pull/58/head
git -C "$work/superbee-plugins" checkout --detach FETCH_HEAD

cd "$work/superbee"
npm ci
npm run build
npm pack -w @superbee/cli --ignore-scripts --pack-destination "$artifacts"

cd "$work/superbee-plugins/apps/mcp"
npm ci
npm install --no-save --package-lock=false --ignore-scripts "$artifacts"/superbee-cli-*.tgz
npm run build
npm run typecheck
npm pack --ignore-scripts --pack-destination "$artifacts"
node test/acceptance.mjs "$artifacts"/superbee-cli-*.tgz
cd "$artifacts"
```

Continue at **Install the offline pair**, starting with the `prefix` assignment. The checksum manifest is provided with the CI download. To reproduce a particular download, check out the two revisions recorded in its `SOURCES` before building.

For the Desktop extension, run `npm run desktop:pack` then `node test/desktop.mjs` from the plugin's `apps/mcp` directory. Open the resulting `out/superbee-experimental.mcpb` in Desktop. CI exercises the extracted extension on macOS with the official MCPB resolver and a stdio client. Live Desktop acceptance requires opening the file in the app.

Maintainers can run the packaged browser test with `node test/acceptance.mjs "$artifacts"/superbee-cli-*.tgz --browser` after installing Playwright Chromium. To compare the packed plugin's fixed and catalog modes with the bundled CLI, run `node test/catalog-parity.mjs "$artifacts"/superbee-cli-*.tgz "$work/superbee/packages/superbee/dist/superbee.mjs"` in the same directory. These tests use synthetic workspaces and a local hosted-service fixture.
