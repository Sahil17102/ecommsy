import { buildOpenApiDocument } from "../docs/openapi.js";

const EXPECTED_OPERATIONS = [
  "POST /auth/login",
  "GET /pickup-addresses",
  "POST /pickup-addresses",
  "GET /pickup-addresses/{id}",
  "PUT /pickup-addresses/{id}",
  "DELETE /pickup-addresses/{id}",
  "PATCH /pickup-addresses/{id}/primary",
  "GET /couriers",
  "POST /rates/available",
  "GET /orders",
  "POST /orders",
  "GET /orders/{id}",
  "POST /orders/{id}/cancel",
  "GET /orders/{id}/label",
  "GET /orders/{id}/invoice",
  "GET /orders/{id}/tracking",
  "POST /orders/manifest-orders",
  "GET /orders/ndr/list",
  "POST /orders/{id}/ndr-action",
  "GET /orders/rto/list",
  "GET /track",
  "GET /webhooks/events",
  "GET /webhooks",
  "POST /webhooks",
  "GET /webhooks/{id}",
  "PATCH /webhooks/{id}",
  "DELETE /webhooks/{id}",
  "POST /webhooks/{id}/rotate-secret",
  "POST /webhooks/{id}/test",
  "GET /webhooks/deliveries",
  "GET /webhooks/{id}/deliveries",
  "POST /webhooks/deliveries/{deliveryId}/redeliver",
].sort();

const METHODS = ["get", "post", "put", "patch", "delete"] as const;

const spec = buildOpenApiDocument();
const paths = spec.paths as Record<string, Record<string, unknown>>;

const actualOperations = Object.entries(paths)
  .flatMap(([path, item]) =>
    METHODS.filter((method) => item[method]).map((method) => `${method.toUpperCase()} ${path}`),
  )
  .sort();

const missing = EXPECTED_OPERATIONS.filter((operation) => !actualOperations.includes(operation));
const extra = actualOperations.filter((operation) => !EXPECTED_OPERATIONS.includes(operation));

if (missing.length || extra.length) {
  console.error("Public API spec drift detected.");
  if (missing.length) console.error(`Missing:\n${missing.map((op) => `  - ${op}`).join("\n")}`);
  if (extra.length) console.error(`Extra:\n${extra.map((op) => `  - ${op}`).join("\n")}`);
  process.exit(1);
}

console.log(`Public API spec verified: ${EXPECTED_OPERATIONS.length} documented operations.`);
