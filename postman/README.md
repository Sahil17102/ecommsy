# Delhivery B2C Postman checks

Import the collection and local environment, then set:

- `adminToken`: access token returned by `POST /api/admin/auth/login`
- `providerId`: active Delhivery row from Admin → Service Providers
- `warehouseName`: exact, case-sensitive Delhivery warehouse name
- `waybill` and `ndrRequestId` when testing shipment-specific APIs

Set `DELHIVERY_BASE_URL=https://staging-express.delhivery.com` on the API server
for staging tests. The default host is production.

Run the **Read-only APIs** folder first. The **Mutating APIs - staging only**
folder can allocate waybills, create/cancel shipments, create pickup requests,
or modify warehouse data and must only be run with intentional sample data.

All integration endpoints are superadmin-only and use this prefix:

`/api/admin/service-providers/:providerId/delhivery-b2c`

The shipment endpoint accepts the documented Delhivery payload unchanged, so
standard forward, reverse (`payment_mode: Pickup`), replacement (`REPL`), MPS,
and RVP QC (`qc_type` / `custom_qc`) manifestations use the same request.
