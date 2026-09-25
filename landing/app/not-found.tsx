import Link from "next/link";
export default function NotFound() {
  return (
    <section className="page-intro wrap">
      <p className="eyebrow">404 / WRONG TURN</p>
      <h1>Let's get you back on route.</h1>
      <p>This page isn't here. Your next delivery still is.</p>
      <Link className="button" href="/">
        Back to home
      </Link>
    </section>
  );
}
