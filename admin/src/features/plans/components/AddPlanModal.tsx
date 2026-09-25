import { useState, useEffect } from "react";
import { Modal, Input, InputNumber, message } from "antd";
import { useCreatePlan, useUpdatePlan } from "../queries";
import type { Plan } from "../types";

interface Props {
  open: boolean;
  onClose: () => void;
  editingPlan?: Plan | null;
}

interface PlanForm {
  name: string;
  slug: string;
  description: string;
  sortOrder: number;
}

const DEFAULT_FORM: PlanForm = {
  name: "",
  slug: "",
  description: "",
  sortOrder: 0,
};

function toSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function AddPlanModal({ open, onClose, editingPlan }: Props) {
  const [form, setForm] = useState<PlanForm>(DEFAULT_FORM);
  const [slugTouched, setSlugTouched] = useState(false);

  const createPlan = useCreatePlan();
  const updatePlan = useUpdatePlan();

  useEffect(() => {
    if (open && editingPlan) {
      setForm({
        name: editingPlan.name,
        slug: editingPlan.slug,
        description: editingPlan.description,
        sortOrder: editingPlan.sortOrder,
      });
      setSlugTouched(true);
    } else if (open) {
      setForm(DEFAULT_FORM);
      setSlugTouched(false);
    }
  }, [open, editingPlan]);

  function handleNameChange(value: string) {
    setForm((prev) => ({
      ...prev,
      name: value,
      slug: slugTouched ? prev.slug : toSlug(value),
    }));
  }

  function handleSave() {
    if (!form.name.trim()) {
      message.warning("Plan name is required");
      return;
    }
    if (!form.slug.trim()) {
      message.warning("Plan slug is required");
      return;
    }

    if (editingPlan) {
      updatePlan.mutate(
        {
          id: editingPlan.id,
          name: form.name,
          description: form.description,
          sortOrder: form.sortOrder,
        },
        {
          onSuccess: () => {
            message.success("Plan updated");
            handleClose();
          },
        },
      );
    } else {
      createPlan.mutate(
        {
          name: form.name,
          slug: form.slug,
          description: form.description,
          sortOrder: form.sortOrder,
        },
        {
          onSuccess: () => {
            message.success("Plan created");
            handleClose();
          },
        },
      );
    }
  }

  function handleClose() {
    setForm(DEFAULT_FORM);
    setSlugTouched(false);
    onClose();
  }

  const isPending = createPlan.isPending || updatePlan.isPending;

  return (
    <Modal
      title={editingPlan ? "Edit Plan" : "Add Plan"}
      open={open}
      onCancel={handleClose}
      onOk={handleSave}
      confirmLoading={isPending}
      okText={editingPlan ? "Save Changes" : "Create Plan"}
      width={480}
      destroyOnClose
    >
      <div className="space-y-4 pt-2">
        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">
            Name
          </label>
          <Input
            value={form.name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="e.g. Gold"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">
            Slug
          </label>
          <Input
            value={form.slug}
            onChange={(e) => {
              setSlugTouched(true);
              setForm((prev) => ({ ...prev, slug: e.target.value }));
            }}
            placeholder="e.g. gold"
            disabled={!!editingPlan}
          />
          {!editingPlan && (
            <p className="text-xs text-muted mt-1">
              Auto-generated from name. Used as the unique identifier.
            </p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">
            Description
          </label>
          <Input.TextArea
            value={form.description}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, description: e.target.value }))
            }
            placeholder="Optional description"
            rows={2}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-muted mb-1.5">
            Sort Order
          </label>
          <InputNumber
            value={form.sortOrder}
            onChange={(val) =>
              setForm((prev) => ({ ...prev, sortOrder: val ?? 0 }))
            }
            min={0}
            className="w-full"
          />
          <p className="text-xs text-muted mt-1">
            Lower numbers appear first in the list.
          </p>
        </div>
      </div>
    </Modal>
  );
}
