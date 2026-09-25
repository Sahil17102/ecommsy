import { Space, Typography } from "antd";
import { ReactNode } from "react";

const { Title, Text } = Typography;

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-page-header-gap mb-page-header-margin">
      <div>
        <Title level={3} className="!mb-1">
          {title}
        </Title>
        {subtitle && <Text type="secondary">{subtitle}</Text>}
      </div>
      {actions && (
        <Space wrap>
          {actions}
        </Space>
      )}
    </div>
  );
}
