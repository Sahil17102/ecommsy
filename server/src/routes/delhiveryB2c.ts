import { Router } from "express";
import { body, oneOf, param, query } from "express-validator";
import { handleDelhiveryB2c } from "../controllers/delhiveryB2c.controller.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { requireSuperadminAuth } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

const router = Router({ mergeParams: true });
router.use(requireSuperadminAuth);
router.use(param("providerId").isUUID(), validate);
const run = asyncHandler(handleDelhiveryB2c);

router.get("/serviceability", query("pincode").isPostalCode("IN"), validate, run);
router.get("/heavy-serviceability", query("pincode").isPostalCode("IN"), validate, run);
router.get("/tat", query("origin_pin").isPostalCode("IN"), query("destination_pin").isPostalCode("IN"), query("mot").isIn(["S", "E", "N"]), validate, run);
router.get("/waybills", query("count").isInt({ min: 1, max: 10000 }), validate, run);
router.get("/waybill", run);
router.post("/shipments", body("shipments").isArray({ min: 1 }), body("pickup_location.name").isString().notEmpty(), validate, run);
router.post("/edit-shipment", body("waybill").isString().notEmpty(), validate, run);
router.post("/cancel-shipment", body("waybill").isString().notEmpty(), validate, run);
router.put("/ewaybill", body("waybill").isString().notEmpty(), body("data").isArray({ min: 1 }), validate, run);
router.get("/tracking", oneOf([query("waybill").isString().notEmpty(), query("ref_ids").isString().notEmpty()]), validate, run);
router.get("/rates", query("md").isIn(["E", "S"]), query("ss").isIn(["Delivered", "RTO", "DTO"]), query("pt").isIn(["Pre-paid", "COD"]), query("o_pin").isPostalCode("IN"), query("d_pin").isPostalCode("IN"), query("cgm").isInt({ min: 1 }), validate, run);
router.get("/label", query("waybill").isString().notEmpty(), query("pdf_size").optional().isIn(["A4", "4R"]), validate, run);
router.post("/pickup", body("pickup_time").matches(/^\d{2}:\d{2}:\d{2}$/), body("pickup_date").isISO8601(), body("pickup_location").isString().notEmpty(), body("expected_package_count").isInt({ min: 1 }), validate, run);
router.post("/warehouses", body("name").isString().notEmpty(), body("phone").isMobilePhone("en-IN"), body("pin").isPostalCode("IN"), body("return_address").isString().notEmpty(), validate, run);
router.patch("/warehouses", body("name").isString().notEmpty(), body("pin").optional().isPostalCode("IN"), validate, run);
router.get("/document", query("waybill").isString().notEmpty(), query("doc_type").isIn(["SIGNATURE_URL", "RVP_QC_IMAGE", "EPOD", "SELLER_RETURN_IMAGE"]), validate, run);
router.post("/ndr", body().custom((v) => Array.isArray(v.data) || (typeof v.waybill === "string" && ["RE-ATTEMPT", "PICKUP_RESCHEDULE"].includes(v.act))), validate, run);
router.get("/ndr-status", query("request_id").isString().notEmpty(), validate, run);

export default router;
