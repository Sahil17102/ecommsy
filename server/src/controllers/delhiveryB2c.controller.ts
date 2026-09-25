import type { Request, Response } from "express";
import { DelhiveryB2cApi } from "../services/delhiveryB2cApi.js";

type Operation =
  | "serviceability" | "heavy-serviceability" | "tat" | "waybills" | "waybill"
  | "shipments" | "edit-shipment" | "cancel-shipment" | "ewaybill" | "tracking"
  | "rates" | "label" | "pickup" | "warehouses" | "edit-warehouse" | "document"
  | "ndr" | "ndr-status";

export async function handleDelhiveryB2c(req: Request, res: Response) {
  const api = await DelhiveryB2cApi.forAccount(req.params.providerId);
  const routeName = req.path.replace(/^\//, "").split("/")[0];
  const op = (routeName === "warehouses" && req.method === "PATCH" ? "edit-warehouse" : routeName) as Operation;
  let data: unknown;
  switch (op) {
    case "serviceability": data = await api.serviceability(String(req.query.pincode)); break;
    case "heavy-serviceability": data = await api.heavyServiceability(String(req.query.pincode)); break;
    case "tat": data = await api.expectedTat(req.query); break;
    case "waybills": data = await api.bulkWaybills(Number(req.query.count)); break;
    case "waybill": data = await api.singleWaybill(); break;
    case "shipments": data = await api.createShipment(req.body); break;
    case "edit-shipment": data = await api.editShipment(req.body); break;
    case "cancel-shipment": data = await api.cancelShipment(req.body.waybill); break;
    case "ewaybill": data = await api.updateEwaybill(req.body.waybill, req.body.data); break;
    case "tracking": data = await api.track(req.query); break;
    case "rates": data = await api.rates(req.query); break;
    case "label": data = await api.label(String(req.query.waybill), String(req.query.pdf_size || "A4"), req.query.pdf !== "false"); break;
    case "pickup": data = await api.pickup(req.body); break;
    case "warehouses": data = await api.createWarehouse(req.body); break;
    case "edit-warehouse": data = await api.editWarehouse(req.body); break;
    case "document": data = await api.document(String(req.query.waybill), String(req.query.doc_type)); break;
    case "ndr": data = await api.ndr(req.body); break;
    case "ndr-status": data = await api.ndrStatus(String(req.query.request_id), req.query.verbose !== "false"); break;
    default: res.status(404).json({ error: "Unknown Delhivery B2C operation" }); return;
  }
  res.json({ success: true, data });
}
