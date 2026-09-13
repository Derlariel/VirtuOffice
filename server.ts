import { createServer } from "node:http";
import next from "next";
import { attachPresenceServer } from "@/server/realtime/presence-server";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME ?? "localhost";
const port = Number(process.env.PORT ?? 3000);
async function main() {
  const app = next({ dev, hostname, port });
  const handle = app.getRequestHandler();
  await app.prepare();
  const server = createServer((request, response) => handle(request, response));
  const io = await attachPresenceServer(server, process.env.APP_URL ?? `http://${hostname}:${port}`);
  const shutdown = () => io.close();
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
  server.listen(port, hostname, () => {
    console.log(`> VirtuOffice ready on http://${hostname}:${port}`);
  });
}

void main().catch((error) => {
  console.error("VirtuOffice server failed to start", error);
  process.exitCode = 1;
});
