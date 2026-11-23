// A loopback sync/v1 host for real CLI checkout. The static replies are synthetic OSS
// hosted-sync-v1 exchanges. We exercise plugin behavior through public commands and stdio.
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { once } from "node:events";

const exchanges = JSON.parse(
  await readFile(new URL("./catalog-host.json", import.meta.url), "utf8"),
);
const token = "synthetic-loopback-fixture";
export const hostedWorkspace = "notes.a";
export const history = "documents.history.v1";

function descriptor(operationId) {
  return {
    operationId,
    title: "Fixture document operation",
    description: "Fixture read",
    maximumOutputBytes: 1048576,
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputJsonSchema: {
      type: "object",
      properties: {
        bundleId: { type: "string" },
        documentId: { type: "string" },
      },
      required: ["bundleId", "documentId"],
      additionalProperties: false,
    },
    resultJsonSchema: { type: "object" },
  };
}

export async function startHostedFixture() {
  const requests = [];
  let offersOperations = true;
  const server = createServer(async (request, response) => {
    const send = (status, body, headers = {}) => {
      response.writeHead(status, {
        "content-type": "application/json",
        ...headers,
      });
      response.end(typeof body === "string" ? body : JSON.stringify(body));
    };
    const resourcePrefix = "/.well-known/oauth-protected-resource";
    if (request.url.startsWith(resourcePrefix + "/"))
      return send(200, {
        resource: origin + request.url.slice(resourcePrefix.length),
        authorization_servers: [origin + "/issuer/"],
        superbee_cli_client_id: "fixture-client",
        scopes_supported: [
          "bundles:discover",
          "documents:read",
          "documents:write",
        ],
        bearer_methods_supported: ["header"],
      });
    if (request.url === "/issuer/.well-known/openid-configuration")
      return send(200, {
        issuer: origin + "/issuer/",
        authorization_endpoint: origin + "/issuer/authorize",
        token_endpoint: origin + "/issuer/token",
        device_authorization_endpoint: origin + "/issuer/device",
      });
    if (request.url === "/issuer/device")
      return send(200, {
        device_code: "fixture-device",
        user_code: "ABCD-EFGH",
        verification_uri: origin + "/activate",
        verification_uri_complete: origin + "/activate?user_code=ABCD-EFGH",
        expires_in: 600,
        interval: 5,
      });
    if (request.headers.authorization !== `Bearer ${token}`)
      return send(401, { error: "unauthenticated" });
    const parts = [];
    for await (const chunk of request) parts.push(chunk);
    const raw = Buffer.concat(parts).toString();
    const body = raw ? JSON.parse(raw) : null;
    const route = request.url;
    requests.push({ route, body });
    if (!route.startsWith("/sync/v1/"))
      return send(404, { error: "not_found" });
    const name = route.slice("/sync/v1/".length);
    if (!offersOperations && ["operations", "run"].includes(name))
      return send(404, { error: "not_found" });
    if (name === "operations")
      return send(200, {
        operations: [descriptor("documents.read.v1"), descriptor(history)],
      });
    if (name === "run" && body?.operationId !== history)
      return send(400, { error: { code: "unknown_operation" } });
    const exchange = exchanges[name];
    if (!exchange) return send(404, { error: "not_found" });
    send(200, exchange.body, exchange.headers);
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const origin = `http://127.0.0.1:${server.address().port}`;
  return {
    setOperationsAvailable(value) {
      offersOperations = value;
    },
    origin,
    requests,
    env: { SUPERBEE_ACCESS_TOKEN: token, SUPERBEE_HOST: origin },
    close: () =>
      new Promise((resolve) => {
        server.close(resolve);
        server.closeAllConnections();
      }),
  };
}
