import assert from "node:assert/strict";
import { createServer } from "node:http";
import { build } from "esbuild";
import { chromium } from "playwright";

// The test host transports the production App's requests to the installed stdio server.
export async function exerciseScreens({
  client,
  tool,
  tools,
  resources,
  docId,
  viewId,
  document,
  read,
}) {
  const browser = await chromium.launch();
  const host = createServer((_req, res) => {
    res.setHeader("content-type", "text/html");
    res.end(
      '<!doctype html><iframe id="app" width="800" height="700"></iframe>',
    );
  });
  try {
    await new Promise((resolve) => host.listen(0, "127.0.0.1", resolve));
    const hostScript = (
      await build({
        stdin: {
          contents: `
      import {AppBridge, PostMessageTransport} from "@modelcontextprotocol/ext-apps/app-bridge";
      const app = document.querySelector("#app");
      const bridge = new AppBridge(null, {name:"Acceptance host", version:"1"}, {serverTools:{}},
        {hostContext:{displayMode:"inline", availableDisplayModes:["inline"], containerDimensions:{width:780,height:650}}});
      bridge.oncalltool = ({name,arguments:args}) => window.hostCall(name,args);
      bridge.oninitialized = async () => {
        await bridge.sendToolInput({arguments:window.toolInput});
        await bridge.sendToolResult(window.toolResult);
      };
      bridge.connect(new PostMessageTransport(app.contentWindow, app.contentWindow));
    `,
          resolveDir: process.cwd(),
        },
        bundle: true,
        platform: "browser",
        format: "iife",
        write: false,
      })
    ).outputFiles[0].text;
    async function screen(name, input) {
      const page = await browser.newPage();
      const uri = tools.find((t) => t.name === name)._meta.ui.resourceUri;
      const result = await tool(name, input);
      await page.goto(`http://127.0.0.1:${host.address().port}/`);
      await page.exposeBinding("hostCall", ({ frame }, name, args) => {
        assert.equal(frame, page.mainFrame());
        assert.ok(
          tools.some(
            (t) => t.name === name && t._meta?.ui?.visibility?.includes("app"),
          ),
        );
        return client.callTool({ name, arguments: args });
      });
      await page.evaluate(
        ({ input, result }) => {
          window.toolInput = input;
          window.toolResult = result;
        },
        { input, result },
      );
      await page.addScriptTag({ content: hostScript });
      await page.locator("#app").evaluate((el, html) => {
        el.srcdoc = html;
      }, resources.get(uri));
      return { page, shell: page.frameLocator("#app") };
    }
    const reader = await screen("show_document", { docId });
    await reader.shell.locator("#document strong").waitFor();
    assert.equal(
      await reader.shell.locator("#document strong").textContent(),
      "formatted",
    );
    await reader.page.close();
    const registered = await screen("show_view", { viewId });
    await registered.shell
      .frameLocator("#active-view")
      .getByText("Registered editor")
      .waitFor();
    await registered.page.close();

    const { version } = await document();
    const action = {
      kind: "document.set-field",
      docId,
      expectedVersion: version,
      field: "status",
      value: "done",
    };
    const html = `<!doctype html><button id="propose">Mark done</button><output id="receipt"></output><script>
      document.querySelector('#propose').onclick = () => parent.postMessage({bridge:'v1',type:'action.propose',requestId:'one',action:${JSON.stringify(action)}},'*');
      addEventListener('message',event=>{if(event.data?.type==='action.result')document.querySelector('#receipt').textContent=event.data.result.status});
    </script>`;
    const { page, shell } = await screen("show_view", {
      mode: "transient",
      title: "External editor",
      html,
      access: "bundle-propose",
    });
    await shell.locator("#authorization-apply").click();
    const child = shell.frameLocator("#active-view");
    await child.locator("#propose").click();
    await shell.locator("#confirmation-apply").waitFor();
    assert.equal(
      await shell.locator("#confirmation-before").textContent(),
      "todo",
    );
    assert.equal(
      await shell.locator("#confirmation-after").textContent(),
      "done",
    );
    assert.match(await read(), /^status: todo$/m);
    await shell.locator("#confirmation-apply").click();
    await child.getByText("committed", { exact: true }).waitFor();
    assert.match(await read(), /^status: done$/m);
    await page.close();
    console.log(
      "Passed production document and registered View screens and an explicit temporary View edit in Chromium.",
    );
  } finally {
    await browser.close();
    if (host.listening) await new Promise((resolve) => host.close(resolve));
  }
}
