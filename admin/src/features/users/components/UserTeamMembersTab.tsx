import { useState } from "react";
import {
  Button,
  Modal,
  Form,
  Input,
  Popconfirm,
  Tag,
  message,
  Empty,
} from "antd";
import { UserPlus, Trash2, KeyRound } from "lucide-react";
import {
  useUserTeamMembers,
  useCreateUserTeamMember,
  useDeleteUserTeamMember,
} from "../queries";
import type { TeamMember, CreateTeamMemberPayload } from "../types";
import { TempPasswordModal } from "./TempPasswordModal";
import { usersApi } from "../api";
import ResponsiveTable from "@/components/common/ResponsiveTable";

interface UserTeamMembersTabProps {
  userId: string;
  ownerName: string;
}

export function UserTeamMembersTab({ userId, ownerName }: UserTeamMembersTabProps) {
  const { data, isLoading } = useUserTeamMembers(userId);
  const createMutation = useCreateUserTeamMember(userId);
  const deleteMutation = useDeleteUserTeamMember(userId);

  const [addOpen, setAddOpen] = useState(false);
  const [tempPwd, setTempPwd] = useState<{
    member: TeamMember;
    password: string;
  } | null>(null);
  const [form] = Form.useForm<CreateTeamMemberPayload>();

  const members = data?.members ?? [];

  async function handleCreate(values: CreateTeamMemberPayload) {
    try {
      const result = await createMutation.mutateAsync({
        ...values,
        phone: values.phone || undefined,
      });
      message.success("Team member added");
      // Reveal the password the admin just set so they can share it
      setTempPwd({ member: result.member, password: values.password });
      form.resetFields();
      setAddOpen(false);
    } catch (err) {
      message.error((err as { message?: string })?.message ?? "Failed to add member");
    }
  }

  async function handleResetMember(member: TeamMember) {
    try {
      const result = await usersApi.resetPassword(member.id);
      setTempPwd({ member, password: result.tempPassword });
    } catch (err) {
      message.error((err as { message?: string })?.message ?? "Failed to reset password");
    }
  }

  async function handleDelete(member: TeamMember) {
    try {
      await deleteMutation.mutateAsync(member.id);
      message.success("Team member removed");
    } catch (err) {
      message.error((err as { message?: string })?.message ?? "Failed to remove member");
    }
  }

  return (
    <div className="pt-1 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">Team Members</h3>
          <p className="text-xs text-muted mt-0.5">
            Sub-accounts under <span className="font-medium">{ownerName}</span>. They share the
            same orders, wallet, and settings.
          </p>
        </div>
        <Button
          type="primary"
          icon={<UserPlus size={14} />}
          onClick={() => setAddOpen(true)}
        >
          Add member
        </Button>
      </div>

      <ResponsiveTable<TeamMember>
        rowKey="id"
        loading={isLoading}
        dataSource={members}
        pagination={false}
        size="middle"
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="No team members yet"
            />
          ),
        }}
        columns={[
          {
            title: "Name",
            dataIndex: "name",
            render: (_, m) => (
              <div>
                <div className="font-medium text-foreground">
                  {m.name || `${m.firstName ?? ""} ${m.lastName ?? ""}`.trim() || "—"}
                </div>
                <div className="text-xs text-muted">{m.email ?? "—"}</div>
              </div>
            ),
          },
          {
            title: "Phone",
            dataIndex: "phone",
            render: (v) => v ?? <span className="text-muted">—</span>,
          },
          {
            title: "Role",
            dataIndex: "teamRole",
            render: (v) => <Tag color="blue">{v}</Tag>,
          },
          {
            title: "Last login",
            dataIndex: "lastLogin",
            render: (v) =>
              v ? (
                new Date(v).toLocaleString()
              ) : (
                <span className="text-muted">Never</span>
              ),
          },
          {
            title: "Actions",
            key: "actions",
            align: "right",
            render: (_, m) => (
              <div className="flex items-center justify-end gap-1">
                <Button
                  size="small"
                  icon={<KeyRound size={12} />}
                  onClick={() => handleResetMember(m)}
                >
                  Reset password
                </Button>
                <Popconfirm
                  title="Remove this team member?"
                  okText="Remove"
                  okButtonProps={{ danger: true }}
                  onConfirm={() => handleDelete(m)}
                >
                  <Button
                    size="small"
                    danger
                    icon={<Trash2 size={12} />}
                  />
                </Popconfirm>
              </div>
            ),
          },
        ]}
      />

      <Modal
        title="Add team member"
        open={addOpen}
        onCancel={() => {
          setAddOpen(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        okText="Add member"
        confirmLoading={createMutation.isPending}
        destroyOnClose
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreate}
          requiredMark={false}
          className="pt-2"
        >
          <div className="grid grid-cols-2 gap-x-3">
            <Form.Item
              label="First name"
              name="firstName"
              rules={[{ required: true, message: "Required" }]}
            >
              <Input placeholder="Anita" />
            </Form.Item>
            <Form.Item
              label="Last name"
              name="lastName"
              rules={[{ required: true, message: "Required" }]}
            >
              <Input placeholder="Sharma" />
            </Form.Item>
          </div>
          <Form.Item
            label="Email"
            name="email"
            rules={[
              { required: true, message: "Required" },
              { type: "email", message: "Valid email required" },
            ]}
          >
            <Input placeholder="anita@example.com" />
          </Form.Item>
          <Form.Item
            label="Phone (optional)"
            name="phone"
            rules={[
              {
                pattern: /^\d{10}$/,
                message: "Enter a valid 10-digit phone",
              },
            ]}
          >
            <Input placeholder="9876543210" />
          </Form.Item>
          <Form.Item
            label="Initial password"
            name="password"
            rules={[
              { required: true, message: "Required" },
              { min: 8, message: "Min 8 characters" },
            ]}
            extra="Share this with the team member. They can change it later from Settings → Change Password."
          >
            <Input placeholder="Min 8 characters" />
          </Form.Item>
        </Form>
      </Modal>

      {tempPwd && (
        <TempPasswordModal
          open
          onClose={() => setTempPwd(null)}
          targetName={tempPwd.member.name ?? tempPwd.member.email ?? "team member"}
          password={tempPwd.password}
        />
      )}
    </div>
  );
}
