import { useState } from "react";
import { motion } from "framer-motion";
import { Clock, ArrowRight, User, Tag, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Container, PageHero } from "@/components/common";
import { scrollFadeUp, staggeredChild } from "@/config/animations";
import { useBlogs } from "@/queries/useBlogs";
import { resolveCoverUrl, type PublicBlog } from "@/lib/blogsApi";

const DEFAULT_ACCENT = "#96286E";

function formatDate(iso: string | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function BlogsPage() {
  const [activeCategory, setActiveCategory] = useState("All");
  const { data, isLoading, isError } = useBlogs(activeCategory);

  const categories = data?.categories ?? [
    "All",
    "Shipping Tips",
    "E-commerce",
    "Industry News",
    "Product Updates",
    "Guides",
  ];

  // The server already returns a featured post separate from the grid.
  // When a category filter is active, fall back to the first card as featured
  // so the hero slot is never empty within a non-empty category.
  const featuredPost: PublicBlog | null =
    activeCategory === "All" ? data?.featured ?? null : data?.posts[0] ?? null;
  const gridPosts = (data?.posts ?? []).filter((p) => p.id !== featuredPost?.id);

  return (
    <>
      {/* ━━━ HERO ━━━ */}
      <PageHero
        badge="Blog"
        title={
          <>
            Shipping{" "}
            <span className="text-gradient-primary">Insights & Resources</span>
          </>
        }
        subtitle="Tips, guides, and industry news to help you ship smarter, reduce costs, and grow your e-commerce business."
      />

      {/* ━━━ CONTENT ━━━ */}
      <section className="py-16 sm:py-24 bg-white">
        <Container maxWidth="xl">
          {/* Category Filters */}
          <motion.div
            {...scrollFadeUp}
            className="flex flex-wrap items-center gap-2 mb-10 sm:mb-12"
          >
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 text-sm font-medium rounded-full border transition-all ${
                  activeCategory === cat
                    ? "bg-primary text-white border-primary shadow-sm"
                    : "bg-background text-foreground/70 border-border-light hover:border-primary/30 hover:text-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </motion.div>

          {/* Loading state — skeleton placeholders matching the final layout */}
          {isLoading && (
            <div className="space-y-10">
              <div className="h-64 sm:h-80 rounded-2xl bg-background border border-border-light animate-pulse" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-72 rounded-xl bg-background border border-border-light animate-pulse"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Error state */}
          {isError && !isLoading && (
            <div className="text-center py-16">
              <p className="text-muted">
                Couldn't load blog posts right now. Please refresh and try again.
              </p>
            </div>
          )}

          {/* Featured Post */}
          {!isLoading && featuredPost && (
            <motion.div {...scrollFadeUp} className="mb-10 sm:mb-12">
              <BlogCard post={featuredPost} variant="featured" />
            </motion.div>
          )}

          {/* Blog Grid */}
          {!isLoading && gridPosts.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {gridPosts.map((post, i) => (
                <motion.div key={post.id} {...staggeredChild(i)}>
                  <BlogCard post={post} variant="grid" />
                </motion.div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!isLoading && !isError && !featuredPost && gridPosts.length === 0 && (
            <div className="text-center py-16">
              <p className="text-muted">
                No posts found in this category yet. Check back soon!
              </p>
            </div>
          )}
        </Container>
      </section>

      {/* ━━━ NEWSLETTER CTA ━━━ */}
      <section className="section-dark relative py-20 sm:py-28">
        <Container maxWidth="md" className="relative z-10">
          <motion.div {...scrollFadeUp} className="text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 leading-tight">
              Stay ahead of the curve
            </h2>
            <p className="text-base text-white/55 max-w-lg mx-auto mb-8 leading-relaxed">
              Get the latest shipping tips, industry news, and product updates
              delivered to your inbox every week.
            </p>

            {/* Email form */}
            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 h-12 px-4 text-sm text-foreground bg-white/95 rounded-lg border-none outline-none placeholder:text-muted"
              />
              <button className="inline-flex items-center justify-center gap-2 px-6 h-12 text-sm font-semibold text-white bg-accent hover:bg-accent-hover rounded-lg transition-all shadow-lg shadow-purple-500/25 shrink-0">
                Subscribe
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-white/30 mt-3">
              No spam, unsubscribe anytime. We respect your inbox.
            </p>
          </motion.div>
        </Container>
      </section>
    </>
  );
}

// ── Card component ─────────────────────────────────────────────
// Single component handles both the featured (hero) card and the grid card
// to keep markup consistent and avoid layout drift between the two.

function BlogCard({ post, variant }: { post: PublicBlog; variant: "featured" | "grid" }) {
  const accent = post.accentColor || DEFAULT_ACCENT;
  const coverUrl = resolveCoverUrl(post);

  if (variant === "featured") {
    return (
      <Link to={`/blogs/${post.slug}`} className="group block no-underline">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10 bg-background border border-border-light rounded-2xl overflow-hidden hover:border-primary/25 hover:shadow-xl hover:shadow-primary/5 transition-all">
          {/* Image */}
          <div
            className="relative h-56 sm:h-64 lg:h-full min-h-[240px] flex items-center justify-center overflow-hidden"
            style={
              coverUrl
                ? undefined
                : { background: `linear-gradient(135deg, ${accent}15 0%, ${accent}08 100%)` }
            }
          >
            {coverUrl ? (
              <img
                src={coverUrl}
                alt={post.title}
                loading="lazy"
                className="w-full h-full object-cover"
              />
            ) : (
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center"
                style={{ backgroundColor: `${accent}20`, color: accent }}
              >
                <Tag className="w-8 h-8" />
              </div>
            )}
            {post.isFeatured && (
              <span className="absolute top-4 left-4 px-3 py-1 text-xs font-semibold text-white bg-accent rounded-full">
                Featured
              </span>
            )}
          </div>

          {/* Content */}
          <div className="p-6 sm:p-8 lg:py-10 flex flex-col justify-center">
            <div className="flex items-center gap-3 mb-3">
              <span className="px-2.5 py-0.5 text-xs font-medium text-primary bg-primary-bg rounded-full">
                {post.category}
              </span>
              <span className="text-xs text-muted">{formatDate(post.publishedAt)}</span>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-3 leading-snug group-hover:text-primary transition-colors">
              {post.title}
            </h2>

            <p className="text-sm text-muted leading-relaxed mb-5 line-clamp-3">
              {post.excerpt}
            </p>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-xs text-muted">
                  <User className="w-3.5 h-3.5" />
                  {post.author}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted">
                  <Clock className="w-3.5 h-3.5" />
                  {post.readTime}
                </div>
              </div>
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary group-hover:gap-2 transition-all">
                Read
                <ChevronRight className="w-4 h-4" />
              </span>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  // Grid variant
  return (
    <Link to={`/blogs/${post.slug}`} className="group block no-underline h-full">
      <article className="bg-background border border-border-light rounded-xl overflow-hidden hover:border-primary/25 hover:shadow-lg hover:shadow-primary/5 transition-all h-full flex flex-col">
        {/* Image */}
        <div
          className="h-40 sm:h-44 flex items-center justify-center overflow-hidden"
          style={
            coverUrl
              ? undefined
              : { background: `linear-gradient(135deg, ${accent}12 0%, ${accent}06 100%)` }
          }
        >
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={post.title}
              loading="lazy"
              className="w-full h-full object-cover"
            />
          ) : (
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${accent}18`, color: accent }}
            >
              <Tag className="w-6 h-6" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 flex flex-col flex-1">
          <div className="flex items-center gap-3 mb-3">
            <span className="px-2.5 py-0.5 text-xs font-medium text-primary bg-primary-bg rounded-full">
              {post.category}
            </span>
            <span className="text-xs text-muted">{formatDate(post.publishedAt)}</span>
          </div>

          <h3 className="text-base font-semibold text-foreground mb-2 leading-snug line-clamp-2 group-hover:text-primary transition-colors">
            {post.title}
          </h3>

          <p className="text-sm text-muted leading-relaxed mb-4 line-clamp-2 flex-1">
            {post.excerpt}
          </p>

          <div className="flex items-center justify-between pt-4 border-t border-border-light mt-auto">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-xs text-muted">
                <User className="w-3 h-3" />
                {post.author}
              </span>
              <span className="flex items-center gap-1.5 text-xs text-muted">
                <Clock className="w-3 h-3" />
                {post.readTime}
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </article>
    </Link>
  );
}
