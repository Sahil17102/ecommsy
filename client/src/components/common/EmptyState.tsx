import { Empty, Space, Typography } from "antd";
import { ReactNode } from "react";

const { Text } = Typography;

interface EmptyStateProps {
  description?: string;
  image?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  description = "No data yet",
  image,
  action,
  className = "",
}: EmptyStateProps) {
  return (
    <div className={`py-empty-state flex flex-col items-center justify-center ${className}`}>
      {image ?? <Empty description={false} />}
      <Text type="secondary" className="mb-4 block text-center">
        {description}
      </Text>
      {action && <Space>{action}</Space>}
    </div>
  );
}
