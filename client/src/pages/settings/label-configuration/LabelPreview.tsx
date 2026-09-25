import Barcode from "react-barcode";
import type { LabelSettings } from "./types";

/** Dummy data that mirrors a realistic shipping label */
const SAMPLE = {
  recipient: {
    name: "Rahul Sharma",
    line1: "42, Sector 18, Noida",
    line2: "Near Metro Station",
    city: "Noida",
    state: "Uttar Pradesh",
    pincode: "201301",
    phone: "9876543210",
  },
  order: {
    date: "2026-03-20",
    mode: "COD",
    amount: 2297,
    weight: "0.50 kg",
    dimensions: "20x15x10",
    /** Carrier brand, matching the PDF's formatted service-provider name. */
    courier: "Delhivery",
    awb: "DL2603201234567",
    customerOrderBarcode: "ORD-20260320-0042",
  },
  products: [
    { name: "Cotton Kurta (Blue, M)", hsn: "6109", sku: "KRT-BLU-M", qty: 2, total: 1498 },
    { name: "Silk Dupatta", hsn: "5007", sku: "DPT-SLK-01", qty: 1, total: 799 },
  ],
  pickup: {
    name: "Box and Beyond Warehouse",
    address: "Plot 12, DSIDC Complex",
    city: "New Delhi",
    state: "Delhi",
    pincode: "110020",
    phone: "9988776655",
    gst: "07AABCU9603R1ZP",
  },
  rto: {
    name: "Box and Beyond Returns",
    address: "Plot 12, DSIDC Complex",
    city: "New Delhi",
    state: "Delhi",
    pincode: "110020",
    phone: "9988776644",
  },
};

interface LabelPreviewProps {
  settings: Partial<LabelSettings>;
}

export default function LabelPreview({ settings }: LabelPreviewProps) {
  const s = settings as Record<string, boolean | string | undefined>;
  const { recipient: r, order: o, products, pickup: p, rto } = SAMPLE;
  const isCod = o.mode.toUpperCase().includes("COD");

  return (
    <div className="sticky top-6">
      <h3 className="text-sm font-bold text-foreground mb-3">Live Preview</h3>
      {/* Card mimicking the 4×6 inch shipping label PDF */}
      <div className="bg-white border border-border-light rounded-xl shadow-sm overflow-hidden">
        <div className="flex flex-col text-[10px] leading-tight text-slate-900 p-4">
          {/* Header: seller logo (left) + boxandbeyond wordmark (right) */}
          <div className="flex min-h-[40px] items-center justify-between gap-3">
            {s.showLogo !== false && s.logoUrl ? (
              <img
                src={s.logoUrl as string}
                alt="Seller logo"
                className="h-10 w-36 object-contain object-left"
              />
            ) : (
              <span />
            )}
            {/* Drawn as bold black type, matching the PDF: the brand artwork's
                orange/purple washes out to white on 1-bit thermal printers. */}
            <div className="shrink-0 text-right leading-none text-slate-900">
              <div className="text-[17px] font-bold tracking-[0.02em]">DREAMZ</div>
              <div className="mt-[3px] text-[6.5px] font-bold tracking-[0.42em]">SERVICES</div>
            </div>
          </div>

          <div className="my-2 border-b border-gray-300" />

          {/* Ship To (left) + Destination pincode box (right) */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="text-[7.5px] font-bold tracking-wide text-slate-500">SHIP TO</div>
              <div className="mt-1 space-y-0.5">
                <div className="text-[11px] font-bold">{r.name}</div>
                <div>{r.line1}</div>
                <div>{r.line2}</div>
                <div>
                  {r.city}, {r.state} - {r.pincode}
                </div>
                {!s.hideCustomerMobile && <div>Mobile: {r.phone}</div>}
              </div>
            </div>
            {/* Destination pincode box + payment badge stacked beneath it */}
            <div className="flex w-[92px] shrink-0 flex-col gap-1.5">
              <div className="border border-slate-900 px-3 py-1 text-center">
                <div className="text-[6px] font-bold tracking-wide text-slate-500">
                  DESTINATION
                </div>
                <div className="text-[18px] font-bold leading-tight">{r.pincode}</div>
              </div>
              {isCod ? (
                <span className="rounded bg-slate-900 px-2 py-1 text-center text-[10px] font-bold text-white">
                  COD Rs.{o.amount}
                </span>
              ) : (
                <span className="rounded border-[1.5px] border-slate-900 px-2 py-1 text-center text-[10px] font-bold text-slate-900">
                  PREPAID
                </span>
              )}
            </div>
          </div>

          <div className="my-2 border-b border-gray-300" />

          {/* AWB barcode — the hero element, full width & tall */}
          <div className="flex flex-col items-center [&_svg]:w-full [&_svg]:max-w-full">
            <Barcode
              value={o.awb}
              width={2}
              height={50}
              displayValue={false}
              margin={0}
            />
            <div className="mt-0.5 font-mono text-[15px] font-bold tracking-[0.15em]">
              {o.awb}
            </div>
            {/* Courier / service name sits directly under the AWB number */}
            <div className="mt-0.5 text-[9px] font-bold tracking-wide text-slate-900">
              {o.courier}
            </div>
          </div>

          <div className="my-2 border-b border-gray-300" />

          {/* Order info — two columns, freeing the full width for the reference
              barcode below. No "Invoice No" line: it's the same value as the
              reference number printed under the barcode. */}
          <div className="flex gap-2 text-[7.5px]">
            <div className="flex-1 space-y-0.5">
              <div className="font-bold">Order Date: {o.date}</div>
              <div>Dimensions: {o.dimensions} cm</div>
            </div>
            <div className="flex-1 space-y-0.5">
              <div>Weight: {o.weight}</div>
              {!s.hideGstNumber && <div>GSTIN: {p.gst}</div>}
            </div>
          </div>

          {/* Reference-no barcode — full width, number centred under the bars */}
          {!s.hideCustomerOrderBar && (
            <div className="mt-1.5 flex flex-col items-center [&_svg]:h-[30px] [&_svg]:w-full [&_svg]:max-w-full">
              <Barcode
                value={o.customerOrderBarcode}
                width={2}
                height={30}
                displayValue={false}
                margin={0}
              />
              <div className="mt-0.5 w-full text-center font-mono text-[11px] font-bold tracking-[0.08em]">
                {o.customerOrderBarcode}
              </div>
            </div>
          )}

          {/* Products table */}
          {!s.hideProduct && (
            <>
              <div className="my-2 border-b border-gray-300" />
              <div>
                {/* Table header */}
                <div className="flex rounded-sm bg-slate-100 px-1 py-1 text-[8px] font-bold">
                  <span className="flex-1">ITEM</span>
                  {!s.hideSku && <span className="w-14 text-center">SKU</span>}
                  {!s.hideHsn && <span className="w-10 text-center">HSN</span>}
                  {!s.hideQty && <span className="w-8 text-right">QTY</span>}
                  {!s.hideTotalAmount && <span className="w-12 text-right">TOTAL</span>}
                </div>
                {/* Rows */}
                {products.map((item, i) => (
                  <div key={i} className="flex px-1 text-[8px] py-0.5">
                    <span className="flex-1 truncate">{item.name}</span>
                    {!s.hideSku && (
                      <span className="w-14 text-center text-slate-500">SKU-{item.hsn}</span>
                    )}
                    {!s.hideHsn && <span className="w-10 text-center">{item.hsn}</span>}
                    {!s.hideQty && <span className="w-8 text-right">{item.qty}</span>}
                    {!s.hideTotalAmount && (
                      <span className="w-12 text-right">Rs.{item.total}</span>
                    )}
                  </div>
                ))}
                {/* Order amount row */}
                {!s.hideOrderAmount && (
                  <div className="mt-1 flex border-t border-gray-200 px-1 pt-1 text-[8px] font-bold">
                    <span className="flex-1">ORDER AMOUNT</span>
                    <span className="text-right">
                      Rs.{products.reduce((sum, prod) => sum + prod.total, 0)}
                    </span>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Pickup + Return addresses — two columns */}
          {(!s.hidePickupAddress || !s.hideRtoAddress) && (
            <>
              <div className="my-2 border-b border-gray-300" />
              <div className="flex gap-3 text-[6.5px]">
                {!s.hidePickupAddress && (
                  <div className="flex-1">
                    <div className="text-[7px] font-bold tracking-wide text-slate-500">
                      PICKUP ADDRESS
                    </div>
                    <div className="mt-0.5 space-y-0.5">
                      {!s.hidePickupName && <div>{p.name}</div>}
                      <div>{p.address}</div>
                      <div>
                        {p.city}, {p.state} - {p.pincode}
                      </div>
                      {!s.hidePickupMobile && <div>Ph: {p.phone}</div>}
                    </div>
                  </div>
                )}
                {!s.hideRtoAddress && (
                  <div className="flex-1">
                    <div className="text-[7px] font-bold tracking-wide text-slate-500">
                      RETURN ADDRESS
                    </div>
                    <div className="mt-0.5 space-y-0.5">
                      {!s.hideRtoName && <div>{rto.name}</div>}
                      <div>{rto.address}</div>
                      <div>
                        {rto.city}, {rto.state} - {rto.pincode}
                      </div>
                      {!s.hideRtoMobile && <div>Ph: {rto.phone}</div>}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Footer */}
          <div className="mt-3 border-t border-gray-200 pt-2 text-center text-[6px] text-slate-400">
            This is a computer-generated document and does not require a signature.
          </div>
        </div>
      </div>
    </div>
  );
}
