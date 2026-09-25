import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Form,
  Input,
  Select,
  Switch,
  Button,
  Upload,
  message,
  ColorPicker,
  Spin,
} from "antd";
import { Save, ArrowLeft, Image as ImageIcon, Eye } from "lucide-react";
import type { RcFile } from "antd/es/upload/interface";
import { useBlog, useCreateBlog, useUpdateBlog, useUploadBlogCover } from "./queries";
import { BLOG_CATEGORIES, type CreateBlogPayload, type BlogStatus } from "./types";
import RichTextEditor from "./components/RichTextEditor";

const { TextArea } = Input;

interface FormValues {
  title: string;
  slug?: string;
  excerpt: string;
  content: string;
  category: (typeof BLOG_CATEGORIES)[number];
  author: string;
  readTime?: string;
  accentColor?: string;
  status: BlogStatus;
  isFeatured: boolean;
  seoTitle?: string;
  seoDescription?: string;
}

const DEFAULT_VALUES: FormValues = {
  title: "",
  slug: "",
  excerpt: "",
  content: "",
  category: "Shipping Tips",
  author: "",
  readTime: "",
  accentColor: "#6C5CE7",
  status: "draft",
  isFeatured: false,
  seoTitle: "",
  seoDescription: "",
};

export default function BlogEditorPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = !!id;

  const [form] = Form.useForm<FormValues>();
  const [pendingCover, setPendingCover] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const previewBlobRef = useRef<string | null>(null);

  const { data: existing, isLoading } = useBlog(id);
  const createBlog = useCreateBlog();
  const updateBlog = useUpdateBlog();
  const uploadCover = useUploadBlogCover();

  // Hydrate form when editing.
  useEffect(() => {
    if (existing) {
      form.setFieldsValue({
        title: existing.title,
        slug: existing.slug,
        excerpt: existing.excerpt,
        content: existing.content,
        category: existing.category,
        author: existing.author,
        readTime: existing.readTime,
        accentColor: existing.accentColor || "#6C5CE7",
        status: existing.status,
        isFeatured: existing.isFeatured,
        seoTitle: existing.seoTitle,
        seoDescription: existing.seoDescription,
      });
    }
  }, [existing, form]);

  // Revoke any object URLs we created when the component unmounts so we don't
  // leak memory across cover-image previews.
  useEffect(() => {
    return () => {
      if (previewBlobRef.current) URL.revokeObjectURL(previewBlobRef.current);
    };
  }, []);

  const existingCoverUrl = useMemo(() => {
    if (!existing?.coverImageUrl) return null;
    // Server returns /blogs/cover/<slug>.<ext>; admin axios baseURL is /api/admin
    // so we hit the public route directly via /api prefix.
    return `/api${existing.coverImageUrl}`;
  }, [existing?.coverImageUrl]);

  const displayCoverUrl = previewUrl || existingCoverUrl;

  function handleCoverChange(file: RcFile) {
    // Revoke any prior preview URL before creating a new one.
    if (previewBlobRef.current) URL.revokeObjectURL(previewBlobRef.current);
    const url = URL.createObjectURL(file);
    previewBlobRef.current = url;
    setPreviewUrl(url);
    setPendingCover(file);
    return false; // prevent auto-upload, we'll upload after save
  }

  async function handleSave(publishNow?: boolean) {
    // Validate the form first. Antd's validateFields rejects with
    // `{ errorFields: [...] }` (NOT a regular Error) — we surface those as
    // a toast so the user sees something even when the offending field is
    // off-screen on a long form.
    let values: FormValues;
    try {
      values = await form.validateFields();
    } catch (validationErr) {
      const fields = (validationErr as { errorFields?: Array<{ name: (string | number)[]; errors: string[] }> })
        .errorFields;
      if (fields && fields.length > 0) {
        const labels = fields
          .map((f) => f.errors[0] || `${f.name.join(".")}: invalid`)
          .slice(0, 3)
          .join(" • ");
        message.error(`Please fix the form: ${labels}`);
        // Scroll to the first field with an error so the user can see it.
        form.scrollToField(fields[0].name as (string | number)[], { behavior: "smooth", block: "center" });
      } else {
        message.error("Please complete all required fields before saving.");
      }
      return;
    }

    try {
      const payload: CreateBlogPayload = {
        ...values,
        status: publishNow ? "published" : values.status,
      };

      let savedId: string;
      if (isEdit && id) {
        await updateBlog.mutateAsync({ id, ...payload });
        savedId = id;
      } else {
        const created = await createBlog.mutateAsync(payload);
        savedId = created.id;
      }

      // Upload cover after the post exists (we need its id).
      if (pendingCover) {
        await uploadCover.mutateAsync({ id: savedId, file: pendingCover });
        setPendingCover(null);
        if (previewBlobRef.current) {
          URL.revokeObjectURL(previewBlobRef.current);
          previewBlobRef.current = null;
        }
        setPreviewUrl(null);
      }

      message.success(publishNow ? "Blog published" : isEdit ? "Blog updated" : "Draft saved");

      // Redirect logic:
      //   - Publish (any post)         → /blogs (the list, where the user expects to land)
      //   - Save Draft on a NEW post   → /blogs/<id>/edit so the cover/inline-image upload
      //                                  buttons unlock without losing the post id
      //   - Save Draft on existing post → stay put
      if (publishNow) {
        navigate("/blogs");
      } else if (!isEdit) {
        navigate(`/blogs/${savedId}/edit`, { replace: true });
      }
    } catch (err) {
      // Network / server errors — surface a top-level toast instead of failing silently.
      const axiosMsg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      message.error(axiosMsg || (err as Error)?.message || "Something went wrong while saving");
    }
  }

  if (isEdit && isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spin />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-background-elevated border border-border-light rounded-xl px-3 py-3 sm:px-5 sm:py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Button
              icon={<ArrowLeft size={16} />}
              onClick={() => navigate("/blogs")}
              size="small"
            />
            <h1 className="text-base sm:text-lg font-semibold text-foreground truncate">
              {isEdit ? "Edit Blog Post" : "New Blog Post"}
            </h1>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              icon={<Save size={16} />}
              onClick={() => handleSave(false)}
              loading={createBlog.isPending || updateBlog.isPending}
            >
              Save Draft
            </Button>
            <Button
              type="primary"
              icon={<Eye size={16} />}
              onClick={() => handleSave(true)}
              loading={createBlog.isPending || updateBlog.isPending}
            >
              {isEdit && existing?.status === "published" ? "Update & Republish" : "Publish"}
            </Button>
          </div>
        </div>
      </div>

      {/* Editor — responsive 2-column on lg, stacked on mobile */}
      <Form
        form={form}
        layout="vertical"
        initialValues={DEFAULT_VALUES}
        requiredMark="optional"
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* ── Main column ── */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-background-elevated border border-border-light rounded-xl p-3 sm:p-5">
              <Form.Item
                label="Title"
                name="title"
                rules={[{ required: true, message: "Title is required" }]}
              >
                <Input placeholder="10 Strategies to Reduce RTO" size="large" />
              </Form.Item>

              <Form.Item
                label="Slug"
                name="slug"
                tooltip="URL-safe identifier. Auto-generated from title if left empty."
              >
                <Input placeholder="reduce-rto-strategies" />
              </Form.Item>

              <Form.Item
                label="Excerpt"
                name="excerpt"
                rules={[{ required: true, message: "Excerpt is required" }]}
                tooltip="Short summary shown on the listing card and used as og:description"
              >
                <TextArea
                  rows={3}
                  maxLength={500}
                  showCount
                  placeholder="A short summary of what this post is about..."
                />
              </Form.Item>
            </div>

            <div className="bg-background-elevated border border-border-light rounded-xl p-3 sm:p-5">
              <div className="text-xs font-medium text-foreground mb-2">
                Content <span className="text-error">*</span>
              </div>
              <Form.Item
                name="content"
                rules={[
                  {
                    validator: (_, value) => {
                      // TipTap leaves an empty <p></p> when the editor is blank,
                      // so we strip tags and check for actual text.
                      const stripped = (value || "").replace(/<[^>]*>/g, "").trim();
                      return stripped
                        ? Promise.resolve()
                        : Promise.reject(new Error("Content is required"));
                    },
                  },
                ]}
                className="!mb-0"
              >
                <FormRichTextEditor blogId={id} />
              </Form.Item>
            </div>

            <div className="bg-background-elevated border border-border-light rounded-xl p-3 sm:p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3">SEO</h3>
              <Form.Item
                label="SEO Title"
                name="seoTitle"
                tooltip="Defaults to post title if empty"
              >
                <Input maxLength={200} showCount />
              </Form.Item>
              <Form.Item
                label="SEO Description"
                name="seoDescription"
                tooltip="Defaults to excerpt if empty"
                className="!mb-0"
              >
                <TextArea rows={3} maxLength={500} showCount />
              </Form.Item>
            </div>
          </div>

          {/* ── Sidebar column ── */}
          <div className="space-y-4">
            <div className="bg-background-elevated border border-border-light rounded-xl p-3 sm:p-5">
              <h3 className="text-sm font-semibold text-foreground mb-3">Cover Image</h3>
              {displayCoverUrl ? (
                <div className="relative aspect-video rounded-lg overflow-hidden border border-border-light mb-3 bg-background">
                  <img
                    src={displayCoverUrl}
                    alt="Cover preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="aspect-video rounded-lg border border-dashed border-border-light bg-background flex flex-col items-center justify-center text-muted mb-3">
                  <ImageIcon size={32} />
                  <p className="text-xs mt-2">No cover image</p>
                </div>
              )}
              <Upload
                beforeUpload={handleCoverChange}
                showUploadList={false}
                accept="image/png,image/jpeg,image/webp"
                maxCount={1}
              >
                <Button block icon={<ImageIcon size={14} />}>
                  {displayCoverUrl ? "Replace Image" : "Upload Image"}
                </Button>
              </Upload>
              <p className="text-xs text-muted mt-2">
                JPEG, PNG or WebP. Max 5MB. Recommended 1200×630.
              </p>
            </div>

            <div className="bg-background-elevated border border-border-light rounded-xl p-3 sm:p-5">
              <Form.Item
                label="Category"
                name="category"
                rules={[{ required: true }]}
              >
                <Select
                  options={BLOG_CATEGORIES.map((c) => ({ value: c, label: c }))}
                />
              </Form.Item>

              <Form.Item
                label="Author"
                name="author"
                rules={[{ required: true, message: "Author is required" }]}
              >
                <Input placeholder="Arjun Patel" />
              </Form.Item>

              <Form.Item
                label="Read Time"
                name="readTime"
                tooltip="Auto-estimated from content if empty"
              >
                <Input placeholder="5 min read" />
              </Form.Item>

              <Form.Item
                label="Accent Color"
                name="accentColor"
                tooltip="Used as the card background gradient when no cover image is set"
              >
                <ColorPicker
                  format="hex"
                  showText
                  onChange={(_, hex) => form.setFieldValue("accentColor", hex)}
                />
              </Form.Item>
            </div>

            <div className="bg-background-elevated border border-border-light rounded-xl p-3 sm:p-5 space-y-3">
              <Form.Item
                label="Status"
                name="status"
                rules={[{ required: true }]}
                className="!mb-0"
              >
                <Select
                  options={[
                    { value: "draft", label: "Draft" },
                    { value: "published", label: "Published" },
                  ]}
                />
              </Form.Item>

              <Form.Item
                label="Featured"
                name="isFeatured"
                valuePropName="checked"
                tooltip="Featured posts are shown in the hero card on the listing page"
                className="!mb-0"
              >
                <Switch />
              </Form.Item>
            </div>
          </div>
        </div>
      </Form>
    </div>
  );
}

// ── Form adapter for RichTextEditor ─────────────────────────────
// Ant Design's Form.Item clones the immediate child and injects `value` +
// `onChange` props. RichTextEditor's signature requires both, so this small
// adapter bridges the contract — it also lets us pass blogId through without
// Form.Item complaining about an unknown prop.

function FormRichTextEditor({
  value,
  onChange,
  blogId,
}: {
  value?: string;
  onChange?: (html: string) => void;
  blogId?: string;
}) {
  return (
    <RichTextEditor
      value={value ?? ""}
      onChange={(html) => onChange?.(html)}
      blogId={blogId}
    />
  );
}
