import { useState } from "react";
import { Switch, Button, Popconfirm, Tag, message } from "antd";
import { Plus, Trash2, Pencil, Crown, Layers } from "lucide-react";
import PageHeader from "@/components/common/PageHeader";
import ResponsiveTable, { type ResponsiveColumnsType } from "@/components/common/ResponsiveTable";
import { PLAN_COLORS } from "@/lib/config";
import { usePlans, useDeletePlan, useTogglePlan } from "./queries";
import type { Plan } from "./types";
import AddPlanModal from "./components/AddPlanModal";

export default function PlansPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);

  const { data, isLoading } = usePlans();
  const deletePlan = useDeletePlan();
  const togglePlan = useTogglePlan();

  const plans = data?.plans ?? [];

  function handleToggle(record: Plan) {
    const action = record.isActive ? "deactivate" : "activate";
    togglePlan.mutate(record.id, {
      onSuccess: () => message.success(`Plan ${action}d`),
    });
  }

  function handleDelete(id: string) {
    deletePlan.mutate(id, {
      onSuccess: () => message.success("Plan deleted"),
    });
  }

  function handleEdit(plan: Plan) {
    setEditingPlan(plan);
    setModalOpen(true);
  }

  function handleCloseModal() {
    setEditingPlan(null);
    setModalOpen(false);
  }

  const columns: ResponsiveColumnsType<Plan> = [
    {
      title: "Name",
      dataIndex: "name",
      key: "name",
      width: 160,
      render: (name: string, record) => (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{name}</span>
          {record.isDefault && (
            <Tag color="blue" className="text-xs">
              Default
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: "Slug",
      dataIndex: "slug",
      key: "slug",
      width: 120,
      render: (slug: string) => (
        <Tag color={PLAN_COLORS[slug] ?? "default"}>{slug}</Tag>
      ),
    },
    {
      title: "Description",
      dataIndex: "description",
      key: "description",
      render: (desc: string) => (
        <span className="text-sm text-muted">{desc || "—"}</span>
      ),
    },
    {
      title: "Sort Order",
      dataIndex: "sortOrder",
      key: "sortOrder",
      width: 100,
      align: "center",
      render: (val: number) => (
        <span className="text-sm text-foreground">{val}</span>
      ),
    },
    {
      title: "Status",
      key: "status",
      width: 100,
      render: (_, record) => (
        <Popconfirm
          title={`${record.isActive ? "Deactivate" : "Activate"} plan?`}
          description={`This will ${record.isActive ? "deactivate" : "activate"} the ${record.name} plan.`}
          onConfirm={() => handleToggle(record)}
          okText={record.isActive ? "Deactivate" : "Activate"}
          okButtonProps={{ danger: record.isActive }}
        >
          <Switch
            checked={record.isActive}
            size="small"
            loading={togglePlan.isPending}
          />
        </Popconfirm>
      ),
    },
    {
      title: "Action",
      key: "actions",
      width: 80,
      align: "right",
      fixed: "right",
      render: (_, record) => (
        <div className="flex items-center justify-end gap-1">
          <button
            className="p-1 rounded hover:bg-background transition-colors text-muted hover:text-foreground"
            onClick={() => handleEdit(record)}
          >
            <Pencil size={15} />
          </button>
          {!record.isDefault && (
            <Popconfirm
              title="Delete plan?"
              description={`Remove the ${record.name} plan?`}
              onConfirm={() => handleDelete(record.id)}
              okText="Delete"
              okButtonProps={{ danger: true }}
            >
              <button className="p-1 rounded hover:bg-background transition-colors text-muted hover:text-red-500">
                <Trash2 size={15} />
              </button>
            </Popconfirm>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        icon={Crown}
        title="Plan Management"
        subtitle="Create and manage pricing plans for users"
        card={false}
        stats={[
          {
            icon: Layers,
            iconColor: "text-indigo-500",
            value: plans.length,
            label: "total plans",
          },
        ]}
        filtersExtra={
          <Button
            type="primary"
            size="middle"
            icon={<Plus size={14} />}
            onClick={() => setModalOpen(true)}
          >
            Add Plan
          </Button>
        }
      />

      <ResponsiveTable
        columns={columns}
        dataSource={plans}
        rowKey="id"
        loading={isLoading}
        size="middle"
        pagination={false}
        locale={{ emptyText: "No plans found" }}
        scroll={{ x: 600 }}
        onRow={(record) => ({
          className: !record.isActive ? "opacity-60" : "",
        })}
      />

      <AddPlanModal
        open={modalOpen}
        onClose={handleCloseModal}
        editingPlan={editingPlan}
      />
    </div>
  );
}
