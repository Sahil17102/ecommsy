import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Input, Tag, Popconfirm, message, Select } from "antd";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import ResponsiveTable, { type ResponsiveColumnsType } from "@/components/common/ResponsiveTable";
import { useBlogs, useDeleteBlog } from "./queries";
import type { Blog, BlogStatus } from "./types";

export default function BlogsListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<BlogStatus | undefined>(undefined);

  const { data, isLoading } = useBlogs({ search: search || undefined, status });
  const deleteBlog = useDeleteBlog();

  const blogs = data?.blogs ?? [];

  async function handleDelete(id: string) {
    await deleteBlog.mutateAsync(id);
    message.success("Blog deleted");
  }

  const columns: ResponsiveColumnsType<Blog> = [
    {
      title: "Title",
      dataIndex: "title",
      key: "title",
      render: (_, record) => (
        <div className="min-w-0">
          <div className="font-medium text-foreground truncate">{record.title}</div>
          <div className="text-xs text-muted truncate">/{record.slug}</div>
        </div>
      ),
    },
    {
      title: "Category",
      dataIndex: "category",
      key: "category",
      width: 140,
      render: (val) => <Tag>{val}</Tag>,
    },
    {
      title: "Author",
      dataIndex: "author",
      key: "author",
      width: 140,
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 110,
      render: (val: BlogStatus, record) => (
        <div className="flex items-center gap-1.5">
          <Tag color={val === "published" ? "green" : "default"}>{val}</Tag>
          {record.isFeatured && <Tag color="gold">Featured</Tag>}
        </div>
      ),
    },
    {
      title: "Updated",
      dataIndex: "updatedAt",
      key: "updatedAt",
      width: 120,
      render: (val: string) => new Date(val).toLocaleDateString("en-IN"),
    },
    {
      title: "",
      key: "actions",
      width: 110,
      render: (_, record) => (
        <div className="flex gap-2">
          <Button
            size="small"
            icon={<Pencil size={14} />}
            onClick={() => navigate(`/blogs/${record.id}/edit`)}
          />
          <Popconfirm title="Delete this blog post?" onConfirm={() => handleDelete(record.id)}>
            <Button size="small" danger icon={<Trash2 size={14} />} />
          </Popconfirm>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="bg-background-elevated border border-border-light rounded-xl px-3 py-3 sm:px-5 sm:py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h1 className="text-base sm:text-lg font-semibold text-foreground">Blog Posts</h1>
          <Button
            type="primary"
            icon={<Plus size={16} />}
            onClick={() => navigate("/create-blog")}
          >
            New Post
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <Input
            placeholder="Search by title, slug or author"
            prefix={<Search size={14} className="text-muted" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            allowClear
            className="sm:max-w-sm"
          />
          <Select
            placeholder="All statuses"
            value={status}
            onChange={(val) => setStatus(val)}
            allowClear
            options={[
              { value: "draft", label: "Draft" },
              { value: "published", label: "Published" },
            ]}
            className="sm:w-40"
          />
        </div>

        <ResponsiveTable
          columns={columns}
          dataSource={blogs}
          rowKey="id"
          loading={isLoading}
          pagination={false}
          locale={{ emptyText: "No blog posts yet. Click 'New Post' to create one." }}
        />
      </div>
    </div>
  );
}
