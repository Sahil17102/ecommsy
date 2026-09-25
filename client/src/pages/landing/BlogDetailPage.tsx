import { useEffect, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, User, Calendar } from "lucide-react";
import DOMPurify from "dompurify";
import { Container } from "@/components/common";
import { scrollFadeUp } from "@/config/animations";
import { useBlog } from "@/queries/useBlogs";
import { resolveCoverUrl } from "@/lib/blogsApi";

function formatDate(iso: string | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-IN", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function BlogDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: post, isLoading, isError } = useBlog(slug);

  // Set the document title + meta description for SEO. Cleans up on unmount.
  useEffect(() => {
    if (!post) return;
    const previousTitle = document.title;
    document.title = post.seoTitle || `${post.title} — Box and Beyond Blog`;

    const metaDesc = document.querySelector('meta[name="description"]');
    const previousDesc = metaDesc?.getAttribute("content") ?? null;
    if (metaDesc) {
      metaDesc.setAttribute("content", post.seoDescription || post.excerpt);
    }

    return () => {
      document.title = previousTitle;
      if (metaDesc && previousDesc !== null) {
        metaDesc.setAttribute("content", previousDesc);
      }
    };
  }, [post]);

  if (isLoading) {
    return (
      <div className="py-20">
        <Container maxWidth="md">
          <div className="space-y-6">
            <div className="h-6 w-32 bg-background border border-border-light rounded animate-pulse" />
            <div className="h-12 w-3/4 bg-background border border-border-light rounded animate-pulse" />
            <div className="h-72 bg-background border border-border-light rounded-2xl animate-pulse" />
            <div className="space-y-3">
              <div className="h-4 bg-background border border-border-light rounded animate-pulse" />
              <div className="h-4 bg-background border border-border-light rounded animate-pulse" />
              <div className="h-4 w-5/6 bg-background border border-border-light rounded animate-pulse" />
            </div>
          </div>
        </Container>
      </div>
    );
  }

  if (isError || !post) {
    return (
      <div className="py-20">
        <Container maxWidth="md">
          <div className="text-center py-16">
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Post not found
            </h1>
            <p className="text-muted mb-6">
              The article you're looking for might have been moved or removed.
            </p>
            <Link
              to="/blogs"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-primary hover:bg-primary-hover rounded-lg transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Blog
            </Link>
          </div>
        </Container>
      </div>
    );
  }

  const coverUrl = resolveCoverUrl(post);
  const accent = post.accentColor || "#96286E";

  return (
    <article className="py-12 sm:py-16 lg:py-20 bg-white">
      <Container maxWidth="md">
        {/* Back link */}
        <motion.div {...scrollFadeUp} className="mb-6 sm:mb-8">
          <Link
            to="/blogs"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Blog
          </Link>
        </motion.div>

        {/* Header */}
        <motion.header {...scrollFadeUp} className="mb-8 sm:mb-10">
          <div className="flex items-center gap-3 mb-4 flex-wrap">
            <span className="px-3 py-1 text-xs font-medium text-primary bg-primary-bg rounded-full">
              {post.category}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-muted">
              <Calendar className="w-3.5 h-3.5" />
              {formatDate(post.publishedAt)}
            </span>
            <span className="flex items-center gap-1.5 text-xs text-muted">
              <Clock className="w-3.5 h-3.5" />
              {post.readTime}
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground leading-tight mb-4">
            {post.title}
          </h1>

          <p className="text-base sm:text-lg text-muted leading-relaxed mb-6">
            {post.excerpt}
          </p>

          <div className="flex items-center gap-2">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold"
              style={{ backgroundColor: `${accent}20`, color: accent }}
            >
              {post.author.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="text-sm font-medium text-foreground">{post.author}</div>
              <div className="text-xs text-muted flex items-center gap-1">
                <User className="w-3 h-3" />
                Author
              </div>
            </div>
          </div>
        </motion.header>

        {/* Cover Image */}
        {coverUrl && (
          <motion.div
            {...scrollFadeUp}
            className="mb-8 sm:mb-12 rounded-2xl overflow-hidden border border-border-light bg-background"
          >
            <img
              src={coverUrl}
              alt={post.title}
              className="w-full aspect-video object-cover"
            />
          </motion.div>
        )}

        {/* Body — server stores HTML from the rich-text editor; we sanitize
            client-side as defense-in-depth even though only admins can author. */}
        <BlogBody html={post.content} />

        {/* Footer CTA */}
        <motion.div
          {...scrollFadeUp}
          className="mt-12 sm:mt-16 pt-8 sm:pt-10 border-t border-border-light text-center"
        >
          <p className="text-sm text-muted mb-4">Enjoyed this article?</p>
          <Link
            to="/blogs"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-foreground border border-border hover:border-primary/30 hover:bg-primary-bg rounded-lg transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Read more posts
          </Link>
        </motion.div>
      </Container>
    </article>
  );
}

// ── Body renderer ──────────────────────────────────────────────
// Extracted so we can useMemo the sanitization. Server stores HTML produced
// by the TipTap rich-text editor in the admin panel; we sanitize on the
// client as defense-in-depth (only admins can author, but better safe).

function BlogBody({ html }: { html: string }) {
  const safeHtml = useMemo(
    () =>
      DOMPurify.sanitize(html, {
        // Preserve target/rel attrs that TipTap puts on links.
        ADD_ATTR: ["target", "rel"],
      }),
    [html],
  );

  return (
    <motion.div
      {...scrollFadeUp}
      className="prose prose-lg max-w-none text-foreground prose-headings:text-foreground prose-headings:font-bold prose-a:text-primary prose-a:no-underline hover:prose-a:underline prose-strong:text-foreground prose-code:text-primary prose-code:bg-primary-bg prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-img:rounded-xl prose-blockquote:border-l-primary prose-blockquote:text-muted"
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  );
}
