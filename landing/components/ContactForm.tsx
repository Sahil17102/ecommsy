"use client";
import { useState, type FormEvent } from "react";
import { ArrowUpRight, Send, Check, Loader2 } from "lucide-react";
import { authUrl } from "./SiteChrome";

export default function ContactForm() {
  const [saved, setSaved] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setBusy(true);
    setError("");
    setSaved("");
    try {
      const response = await fetch("/api/enquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
        signal: AbortSignal.timeout(15000),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data.message || "Please try again later.");
      setSaved(data.id);
      form.reset();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Please try again later.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="tool-layout">
      <form className="tool-form" onSubmit={submit}>
        <h2>Let's start a conversation.</h2>
        <p>Tell us a little about your business and what you have in mind.</p>
        <div className="form-grid">
          <label className="field">
            Full name
            <input
              name="name"
              required
              minLength={2}
              maxLength={150}
              autoComplete="name"
            />
          </label>
          <label className="field">
            Email
            <input
              name="email"
              type="email"
              required
              maxLength={254}
              autoComplete="email"
            />
          </label>
        </div>
        <label className="field">
          Company
          <input name="company" maxLength={200} autoComplete="organization" />
        </label>
        <label className="field">
          I'm interested in
          <select name="topic">
            <option>Shipping for my business</option>
            <option>Seller support</option>
            <option>Partnerships</option>
            <option>Careers</option>
          </select>
        </label>
        <label className="field">
          Your message
          <textarea
            name="message"
            required
            minLength={10}
            maxLength={5000}
            rows={5}
          />
        </label>
        <button className="button" disabled={busy}>
          {busy ? <Loader2 size={17} className="spin" /> : <Send size={17} />}{" "}
          {busy ? "Sending..." : "Send enquiry"}
        </button>
        {saved && (
          <p role="status" className="success">
            <Check size={16} />
            Your enquiry has been received. Reference: {saved.slice(0, 8)}
          </p>
        )}
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
      </form>
      <aside className="contact-aside">
        <p className="eyebrow">YOUR NEXT STEP</p>
        <h2>
          A real conversation
          <br />
          starts here.
        </h2>
        <p>
          For order-specific questions, sign in and open a support ticket so
          your shipment details stay connected to your request.
        </p>
        <a className="button" href={authUrl}>
          Open seller support <ArrowUpRight size={17} />
        </a>
        <hr />
        <h3>New to Box & Beyond?</h3>
        <p>
          Create an account to explore shipping options and contact the support
          team.
        </p>
        <a className="text-link" href={authUrl}>
          Create your account <ArrowUpRight size={17} />
        </a>
      </aside>
    </div>
  );
}
