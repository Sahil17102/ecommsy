import type { Request, Response } from "express";
import { fetchRate, ShipmentMode } from "../services/delhivery.js";

export async function handleGetDelhiveryRate(req: Request, res: Response) {
  const { o_pin, d_pin, cgm, md } = req.query;

  const data = await fetchRate({
    originPin: o_pin as string,
    destinationPin: d_pin as string,
    weightGrams: Number(cgm),
    mode: (md as ShipmentMode) ?? ShipmentMode.Surface,
  });

  res.json(data);
}
