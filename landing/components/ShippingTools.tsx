"use client";
import { useEffect, useState, type FormEvent } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Package,
  MapPin,
  Search,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { authUrl } from "./SiteChrome";
// @ts-ignore Shared pure calculations are also exercised by Node's test runner.
import { calculateWeight, validPincode } from "../lib/shipping.mjs";
type Kind = "track" | "rate" | "weight";
async function request(url: string) {
  const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) {
    if (res.status === 404)
      throw new Error(
        "No shipment found. Check your AWB or order ID and try again.",
      );
    throw new Error(
      "The shipping service is currently unavailable. Please try again later.",
    );
  }
  const type = res.headers.get("content-type");
  if (!type?.includes("application/json"))
    throw new Error(
      "The shipping service is currently unavailable. Please try again later.",
    );
  return res.json();
}
function Field({
  name,
  label,
  placeholder,
  type = "number",
  required = true,
  defaultValue,
  step = "any",
}: {
  name: string;
  label: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
  step?: string;
}) {
  return (
    <label className="field">
      {label}
      <input
        name={name}
        placeholder={placeholder}
        type={type}
        required={required}
        defaultValue={defaultValue}
        {...(type === "number"
          ? { min: 0.01, max: 100000, step }
          : { maxLength: 80 })}
      />
    </label>
  );
}
export default function ShippingTools({ kind }: { kind: Kind }) {
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<any>(null);
  useEffect(() => {
    if (kind === "track")
      setQuery(new URLSearchParams(window.location.search).get("q") || "");
  }, [kind]);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setResult(null);
    const form = new FormData(e.currentTarget);
    setBusy(true);
    try {
      if (kind === "weight") {
        setResult(
          calculateWeight(
            Number(form.get("weight")),
            Number(form.get("length")),
            Number(form.get("width")),
            Number(form.get("height")),
            Number(form.get("divisor")),
          ),
        );
        return;
      }
      if (kind === "track") {
        if (!query.trim())
          throw new Error("Enter your AWB number or order ID.");
        const data = await request(
          `/api/track?q=${encodeURIComponent(query.trim())}`,
        );
        if (!data.found)
          throw new Error(
            data.message || "No shipment found. Check your AWB or order ID.",
          );
        setResult(data);
        return;
      }
      const origin = String(form.get("origin")),
        dest = String(form.get("destination"));
      if (!validPincode(origin) || !validPincode(dest))
        throw new Error("Enter valid six-digit Indian pincodes.");
      const dimensions = ["length", "width", "height"].map((k) =>
        Number(form.get(k)),
      );
      if (dimensions.some(Boolean) && !dimensions.every((n) => n > 0))
        throw new Error(
          "Complete all three dimensions or leave them all blank.",
        );
      const weight = Number(form.get("weight"));
      const billable = Math.max(
        weight,
        dimensions.reduce((a, b) => a * b, 1) / 5000,
      );
      const params = new URLSearchParams({
        o_pin: origin,
        d_pin: dest,
        cgm: String(Math.ceil(billable * 1000)),
        md: String(form.get("mode")),
      });
      const data = await request("/api/rates/delhivery?" + params);
      if (!Number.isFinite(Number(data.total_amount)))
        throw new Error(
          "No rate is available for this route. Please check another route.",
        );
      setResult(data);
    } catch (e) {
      setError(
        e instanceof Error && e.name !== "TimeoutError"
          ? e.message
          : "The request timed out. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="tool-layout">
      <form className="tool-form" onSubmit={submit}>
        <h2>
          {kind === "track"
            ? "Where is your next delivery?"
            : kind === "weight"
              ? "Every dimension counts."
              : "Find a rate for your route."}
        </h2>
        <p>
          {kind === "track"
            ? "Enter the AWB or order ID shared by your seller."
            : kind === "weight"
              ? "Use centimetres for dimensions and kilograms for actual weight."
              : "Get a live prepaid Delhivery quote. Your account rates may differ."}
        </p>
        {kind === "track" ? (
          <label className="field">
            AWB number / Order ID
            <div className="input-icon">
              <Search size={18} />
              <input
                required
                maxLength={80}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter your tracking number"
              />
            </div>
          </label>
        ) : (
          <>
            {kind === "rate" && (
              <div className="form-grid">
                <Field
                  name="origin"
                  label="Pickup pincode"
                  placeholder="110001"
                  type="text"
                />
                <Field
                  name="destination"
                  label="Delivery pincode"
                  placeholder="400001"
                  type="text"
                />
              </div>
            )}
            <Field name="weight" label="Actual weight (kg)" placeholder="0.5" />
            <div className="form-grid three">
              {["length", "width", "height"].map((x) => (
                <Field
                  key={x}
                  name={x}
                  label={`${x[0].toUpperCase() + x.slice(1)} (cm)`}
                  placeholder="20"
                  required={kind === "weight"}
                />
              ))}
            </div>
            {kind === "weight" ? (
              <label className="field">
                Volumetric divisor
                <select name="divisor">
                  <option value="5000">5000 (common domestic standard)</option>
                  <option value="4500">4500</option>
                  <option value="4000">4000</option>
                  <option value="6000">6000</option>
                </select>
              </label>
            ) : (
              <label className="field">
                Shipping mode
                <select name="mode">
                  <option value="S">Surface</option>
                  <option value="E">Express / air</option>
                </select>
              </label>
            )}
          </>
        )}
        <button className="button" disabled={busy}>
          {busy ? (
            <Loader2 className="spin" size={18} />
          ) : kind === "track" ? (
            <Search size={18} />
          ) : (
            <Package size={18} />
          )}{" "}
          {busy
            ? "Checking..."
            : kind === "track"
              ? "Track shipment"
              : kind === "weight"
                ? "Calculate weight"
                : "Get shipping rate"}
          <ArrowRight size={18} />
        </button>
        {error && (
          <div className="form-error" role="alert">
            <AlertCircle size={19} />
            <span>{error}</span>
          </div>
        )}
      </form>
      <aside className="tool-results" aria-live="polite">
        {result ? (
          kind === "weight" ? (
            <>
              <p className="eyebrow">YOUR PACKAGE, MEASURED</p>
              <h3>
                {result.chargeable.toFixed(2)} <small>kg</small>
              </h3>
              <p>Chargeable weight before courier slab rounding</p>
              <dl>
                <div>
                  <dt>Actual weight</dt>
                  <dd>{result.actual.toFixed(2)} kg</dd>
                </div>
                <div>
                  <dt>Volumetric weight</dt>
                  <dd>{result.volumetric.toFixed(2)} kg</dd>
                </div>
              </dl>
              <p>
                The higher weight applies. Confirm your courier's divisor and
                minimum billing slab before booking.
              </p>
              <a href={authUrl} className="text-link">
                Book your shipment <ArrowUpRight size={17} />
              </a>
            </>
          ) : kind === "rate" ? (
            <>
              <p className="eyebrow">LIVE PREPAID QUOTE</p>
              <h3>
                {Number(result.total_amount).toLocaleString("en-IN", {
                  style: "currency",
                  currency: "INR",
                })}
              </h3>
              <dl>
                {[
                  ["Gross amount", result.gross_amount],
                  ["Fuel surcharge", result.charge_FS],
                  ["Tax", result.tax_amount],
                ].map(([n, v]) => (
                  <div key={String(n)}>
                    <dt>{n}</dt>
                    <dd>
                      {Number(v || 0).toLocaleString("en-IN", {
                        style: "currency",
                        currency: "INR",
                      })}
                    </dd>
                  </div>
                ))}
              </dl>
              <p>
                Final charges depend on measured weight and your account's
                contracted rates. Check COD pricing in the seller panel.
              </p>
              <a href={authUrl} className="button">
                See my account rates <ArrowUpRight size={18} />
              </a>
            </>
          ) : (
            <>
              <p className="eyebrow">SHIPMENT UPDATE</p>
              <h3 className="tracking-status">
                {(result.status || "Update available").replaceAll("_", " ")}
              </h3>
              <p>{result.awb || result.orderId}</p>
              <dl>
                {[
                  ["Courier", result.courier],
                  ["Origin", result.origin],
                  ["Destination", result.destination],
                ].map(([n, v]) => (
                  <div key={n}>
                    <dt>{n}</dt>
                    <dd>{v || "Not available"}</dd>
                  </div>
                ))}
              </dl>
              <ol className="timeline">
                {result.events?.map((event: any, i: number) => (
                  <li key={i}>
                    <CheckCircle size={17} />
                    <div>
                      <strong>{event.statusText || event.statusCode}</strong>
                      <p>{event.location}</p>
                      <small>
                        {event.timestamp
                          ? new Date(event.timestamp).toLocaleString("en-IN")
                          : ""}
                      </small>
                    </div>
                  </li>
                ))}
              </ol>
              {!result.events?.length && (
                <p>No scan events have been received yet.</p>
              )}
            </>
          )
        ) : (
          <>
            <div className="result-illustration">
              <Package size={75} strokeWidth={1} />
              <MapPin size={32} />
            </div>
            <p className="eyebrow">
              {kind === "track"
                ? "A LITTLE PEACE OF MIND"
                : "PLAN YOUR NEXT MOVE"}
            </p>
            <h3>
              {kind === "track"
                ? "Every step, in sight."
                : kind === "weight"
                  ? "No more guesswork."
                  : "The right route. The right rate."}
            </h3>
            <p>
              {kind === "track"
                ? "Your shipment status and courier scan history will appear here."
                : kind === "weight"
                  ? "Compare actual and volumetric weight before you book."
                  : "Enter your shipment details to see an available live quote."}
            </p>
          </>
        )}
      </aside>
    </div>
  );
}
