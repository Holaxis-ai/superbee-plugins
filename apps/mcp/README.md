# Use Superbee in your AI client

Install this optional, experimental MCP app to open a Superbee document in chat, run an interactive View, or confirm a proposed field edit. You can use a local bundle folder or choose a workspace from your Superbee catalog. The normal Superbee browser UI and CLI work independently.

| Client | Installation | Platform |
| --- | --- | --- |
| Claude Desktop | Open the self-contained Desktop extension | macOS |
| Codex | Install the offline pair and register `--host codex` | macOS, Linux, Windows |
| Claude Code | Install the offline pair and register `--host claude-code` | macOS, Linux |
| OpenCode | Install the offline pair and register `--host opencode` | macOS, Linux |
| Claude Desktop with a manual MCP configuration | Install the offline pair and register `--host claude-desktop` | macOS |

The offline pair requires Node 24 and npm. Claude Desktop supplies its own Node runtime for the extension. Clients with MCP Apps support can display the document and View screens. A client that exposes tools only can verify the connection with `list_views`.

## Get the preview

Open a successful **CI** run for the revision you want. In the run summary, scroll to **Artifacts** and download **superbee-desktop-preview** for the Desktop extension or **superbee-mcp-offline-preview** for the two npm tarballs. Extract the downloaded ZIP. GitHub requires sign-in to download workflow artifacts and removes them when the run's retention expires. The source build below also works after an artifact expires. [CI runs](https://github.com/Holaxis-ai/superbee-plugins/actions/workflows/ci.yml)

The offline download contains the plugin built by CI and the published workspace library it uses. Its `SOURCES` file records the plugin commit and the library version.

## Claude Desktop on macOS

1. Open `superbee-experimental.mcpb` from the extracted **superbee-desktop-preview** download in Claude Desktop. Review the unsigned extension and install it if your Desktop policy allows it.
2. Choose the folder containing your Superbee bundle, or enable **Use the workspace catalog** to choose a workspace per tool call. Enter the actor to record for confirmed edits, such as `human:editor`.
3. Click **Save**. In **Settings → Extensions → Superbee (experimental)**, switch **Disabled** to **Enabled**. Start a new chat and follow [Verify in your client](#verify-in-your-client). To remove it, open **Settings → Extensions**, remove **Superbee (experimental)**, and start a new chat.

The macOS CI check extracts the finished extension archive and starts separate servers for the tool call and the reader. It verifies the original revision after a document edit, concurrent redemption, and refusal from a different actor, workspace or installation. It also fills one workspace’s receipt allowance while a reader in another workspace is waiting. The signed-in macOS test used the source-built extension from [revision `930e576`](https://github.com/Holaxis-ai/superbee-plugins/commit/930e576b884a819a22be9d2a4f2e4fb90475bbf2). Its unpacked files match the [download for revision `ebf1dcc`](https://github.com/Holaxis-ai/superbee-plugins/actions/runs/45241812570/artifacts/14851393409). In standard Claude Chat with a fixed local bundle, the reader displayed the document body and the registered read-only View displayed its content after approval. Uninstalling that extension left the existing Superbee server running.

The Desktop reader keeps up to 16 pending document receipts per installation, workspace setting and actor. Each receipt expires after ten minutes. The encrypted snapshot lives in a private temporary folder for your OS account and profile. Redemption removes the snapshot. Creating a receipt also removes expired snapshots across settings, including settings you have stopped using. The empty folder is removed after its last snapshot is gone.

For a registered View in Claude Desktop, choose the bundle folder containing its root `index.md`. The model identifies the registration and entry revision. The panel opens those exact bytes on its own connection and shows **Trust and run** when approval is required. If the registration, HTML or access changes, reopen the View. A View with edit access still requires a separate confirmation for each proposed change. The packaged two-process check exercises stale registration and HTML, trust, reads, cancellation and confirmed edits.

Catalog-mode Views and temporary Views currently require a client that routes the tool call and panel actions to the same server process. Use the fixed-folder extension mode for registered Views in Claude Desktop. Catalog document reads continue to use the Desktop reader.

The extension includes both screens and the compatible workspace library. Its manifest accepts Node 22.14+ in the 22 series, 24.x, or 26.x. Choose one Desktop installation method per workspace to avoid duplicate tools.

## Codex on Windows

Use Node 24.2 or newer in the Node 24 series and a working Codex installation. In PowerShell, open the extracted offline preview folder and verify its checksums:

```powershell
$archives = foreach ($line in Get-Content -LiteralPath SHA256SUMS -ErrorAction Stop) {
    $hash, $file = $line -split '  ', 2
    if ((Get-FileHash -Algorithm SHA256 -LiteralPath $file -ErrorAction Stop).Hash -ne $hash) {
        throw "Checksum differs for $file"
    }
    if ($file -match '^superbee-(cli|experimental-mcp)-[a-z0-9.-]+\.tgz$') {
        (Get-Item -LiteralPath $file -ErrorAction Stop).FullName
    }
}
if (@($archives).Count -ne 2) { throw "Expected two verified npm archives" }
```

Install the two packages into a dedicated prefix. Replace the bundle path and actor with your own.

```powershell
$prefix = Join-Path $env:LOCALAPPDATA 'Superbee MCP Preview'
npm install --prefix $prefix --offline --ignore-scripts --no-audit --no-fund @archives
if ($LASTEXITCODE -ne 0) { throw "Offline install failed" }
$mcp = Join-Path $prefix 'node_modules/.bin/superbee-mcp.cmd'
& $mcp install --host codex --dir 'C:\path with spaces\bundle' --actor human:editor
& $mcp status --host codex
```

Use `--workspace <label>` for a registered workspace or omit both selectors to choose from the catalog per call. Run `superbee catalog add <label> --dir <bundle>` with a CLI release that supports the Windows catalog to add a local workspace. Restart Codex and follow [Verify in your client](#verify-in-your-client). To roll back, run `& $mcp uninstall --host codex` and restart Codex again.

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

Use Git, Node 24 and npm. From a checkout of the plugin revision you want to try, run:

```sh
cd apps/mcp
artifacts=$(mktemp -d)
npm ci
npm run build
npm run typecheck
npm pack --ignore-scripts --pack-destination "$artifacts"
npm pack --offline "$(node -p "require('./package-lock.json').packages['node_modules/@superbee/cli'].resolved")" --ignore-scripts --pack-destination "$artifacts"
node test/acceptance.mjs "$artifacts"/superbee-cli-*.tgz
```

To register the locally built preview, open the artifacts folder and follow **Install the offline pair**, starting at the `prefix` assignment. CI supplies the checksum manifest for its downloads.

For Claude Desktop, run `npm run desktop:pack`, then `node test/desktop.mjs`. Open `out/superbee-experimental.mcpb` in Claude Desktop to try the signed-in flow.

For browser checks, install Playwright Chromium and pass `--browser` to the acceptance command. For catalog and fixed-workspace parity, run `node test/catalog-parity.mjs "$artifacts"/superbee-cli-*.tgz "$PWD/node_modules/superbee/dist/superbee.mjs"` from the app directory.
