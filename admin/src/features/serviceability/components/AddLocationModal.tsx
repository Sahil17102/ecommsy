import { useState } from "react";
import { Modal, Form, Input, Select, Switch, message, Spin } from "antd";
import { useCreateLocation, usePincodeLookup } from "../queries";
import { TAG_OPTIONS } from "../config";
import { regex } from "@/lib/constants";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function AddLocationModal({ open, onClose }: Props) {
  const [form] = Form.useForm();
  const createLocation = useCreateLocation();
  const pincodeLookup = usePincodeLookup();
  const [lookingUp, setLookingUp] = useState(false);

  function handlePincodeBlur() {
    const pincode = form.getFieldValue("pincode") as string;
    if (!regex.pincode.test(pincode)) return;

    setLookingUp(true);
    pincodeLookup.mutate(pincode, {
      onSuccess: (data) => {
        form.setFieldsValue({ city: data.city, state: data.state });
      },
      onError: () => {
        message.warning("Could not auto-fill city/state for this pincode");
      },
      onSettled: () => setLookingUp(false),
    });
  }

  function handleSubmit() {
    form.validateFields().then((values) => {
      createLocation.mutate(
        {
          pincode: values.pincode,
          city: values.city,
          state: values.state,
          tags: values.tags ?? [],
          isActive: values.isActive ?? true,
        },
        {
          onSuccess: () => {
            message.success("Location added successfully");
            handleClose();
          },
        },
      );
    });
  }

  function handleClose() {
    form.resetFields();
    setLookingUp(false);
    onClose();
  }

  return (
    <Modal
      title="Add Location"
      open={open}
      onCancel={handleClose}
      onOk={handleSubmit}
      confirmLoading={createLocation.isPending}
      okText="Add Location"
      width={480}
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        className="pt-2"
        initialValues={{ isActive: true }}
      >
        <Form.Item
          name="pincode"
          label="Pincode"
          rules={[
            { required: true, message: "Pincode is required" },
            {
              pattern: regex.pincode,
              message: "Pincode must be exactly 6 digits",
            },
          ]}
        >
          <Input
            placeholder="e.g. 110001"
            maxLength={6}
            onBlur={handlePincodeBlur}
            suffix={lookingUp ? <Spin size="small" /> : null}
          />
        </Form.Item>

        <div className="grid grid-cols-2 gap-3">
          <Form.Item
            name="city"
            label="City"
            rules={[{ required: true, message: "City is required" }]}
          >
            <Input
              placeholder={lookingUp ? "Looking up..." : "e.g. New Delhi"}
              disabled={lookingUp}
            />
          </Form.Item>

          <Form.Item
            name="state"
            label="State"
            rules={[{ required: true, message: "State is required" }]}
          >
            <Input
              placeholder={lookingUp ? "Looking up..." : "e.g. Delhi"}
              disabled={lookingUp}
            />
          </Form.Item>
        </div>

        <Form.Item name="tags" label="Tags">
          <Select
            mode="multiple"
            placeholder="Select zone tags"
            options={TAG_OPTIONS}
            allowClear
          />
        </Form.Item>

        <Form.Item
          name="isActive"
          label="Active"
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  );
}
