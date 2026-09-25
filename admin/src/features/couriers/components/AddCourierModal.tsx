import { Modal, Form, Input, Select, message } from "antd";
import { useCreateCourier } from "../queries";
import { useServiceProviders } from "../../service-providers/queries";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function AddCourierModal({ open, onClose }: Props) {
  const [form] = Form.useForm();
  const createCourier = useCreateCourier();
  const { data: spData } = useServiceProviders();
  const providers = spData?.providers ?? [];

  function handleSubmit() {
    form.validateFields().then((values) => {
      createCourier.mutate(
        {
          name: values.name,
          serviceProviderId: values.serviceProviderId,
          courierType: "delivery",
          businessType: [values.businessType],
        },
        {
          onSuccess: () => {
            message.success("Courier added successfully");
            handleClose();
          },
        },
      );
    });
  }

  function handleClose() {
    form.resetFields();
    onClose();
  }

  return (
    <Modal
      title="Add Courier"
      open={open}
      onCancel={handleClose}
      onOk={handleSubmit}
      confirmLoading={createCourier.isPending}
      okText="Add Courier"
      width={480}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        className="pt-2"
        initialValues={{
          businessType: "b2c",
        }}
      >
        <Form.Item
          name="name"
          label="Courier Name"
          rules={[{ required: true, message: "Courier name is required" }]}
        >
          <Input placeholder="e.g. Delhivery Surface" />
        </Form.Item>

        <Form.Item
          name="serviceProviderId"
          label="Service Provider Account"
          rules={[{ required: true, message: "Service provider account is required" }]}
        >
          <Select
            showSearch
            placeholder="Select a provider account"
            filterOption={(input, option) =>
              (option?.label ?? "")
                .toLowerCase()
                .includes(input.toLowerCase())
            }
            options={providers.map((p) => ({
              // Disambiguate accounts that share a brand/slug (e.g. two Delhivery accounts).
              label: `${p.displayName} (${p.serviceProvider})`,
              value: p.id,
            }))}
          />
        </Form.Item>

        <Form.Item
          name="businessType"
          label="Business Type"
          rules={[{ required: true, message: "Business type is required" }]}
        >
          <Select
            placeholder="Select business type"
            options={[
              { label: "B2C", value: "b2c" },
              { label: "B2B", value: "b2b" },
            ]}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
